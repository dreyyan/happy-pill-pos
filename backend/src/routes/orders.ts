// [IMPORT] Setup
import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

// [IMPORT] Helpers
import { successResponse, errorResponse } from '../utils/response';
import { error, info } from '../utils/logger';

// [IMPORT] Middleware
import { verifyRole } from '../middleware/authMiddleware';

const router = Router();

// * [GET] Get All Orders
// ? /api/orders/
router.get('/', verifyRole(['ADMIN', 'CASHIER']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, customerId } = req.query;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filters: any = { isActive: true };

    // [1] Apply optional filters
    if (status) filters.status = String(status).toUpperCase();
    if (customerId) filters.customerId = Number(customerId);

    // [2] Fetch all orders
    const orders = await prisma.order.findMany({
      where: filters,
      include: {
        customer: {
          select: {
            id: true,
            tableNumber: true,
            firstName: true,
            pax: true,
          }
        },
        orderItems: {
          include: {
            item: {
              select: {
                id: true,
                name: true,
                sku: true,
                price: true,
              }
            }
          }
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // * [SUCCESS] Orders fetched
    info(`Fetched ${orders.length} orders`);
    res.json(successResponse("Orders fetched successfully", orders));
  } catch (err: unknown) {
    let errorMessage = "An unexpected error occurred while fetching orders";
    if (err instanceof Error) errorMessage = err.message;
    error(`Error fetching orders: ${errorMessage}`);
    res.status(500).json(errorResponse(errorMessage));
    next(err);
  }
});

// * [GET] Get Single Order
// ? /api/orders/:id
router.get('/:id', verifyRole(['ADMIN', 'CASHIER']), async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  try {
    // [1] Fetch order with specific 'id'
    const order = await prisma.order.findUnique({
      where: { id: Number(id) },
      include: {
        customer: {
          select: {
            id: true,
            tableNumber: true,
            firstName: true,
            pax: true,
          }
        },
        orderItems: {
          include: {
            item: {
              select: {
                id: true,
                name: true,
                sku: true,
                price: true,
              }
            }
          }
        },
      },
    });

    // ! [ERROR] Non-existing order
    if (!order) {
      return res.status(404).json(errorResponse("Order not found"));
    }

    // * [SUCCESS] Order fetched
    info(`Fetched order with id ${id}`);
    res.json(successResponse("Order fetched successfully", order));
  } catch (err: unknown) {
    let errorMessage = "An unexpected error occurred while fetching order";
    if (err instanceof Error) errorMessage = err.message;
    error(`Error fetching order with id ${id}: ${errorMessage}`);
    res.status(500).json(errorResponse(errorMessage));
    next(err);
  }
});

// * [POST] Create Order - Supports tableNumber + firstName + pax
// ? /api/orders/
router.post('/', verifyRole(['ADMIN', 'CASHIER']), async (req: Request, res: Response, next: NextFunction) => {
  const { tableNumber, firstName, pax, status = "PENDING", orderItems } = req.body;

  // ! [ERROR] Missing required fields: table number, first name
  if (!tableNumber || !firstName) {
    return res.status(400).json(errorResponse("tableNumber and firstName are required"));
  }

  // ! [ERROR] No item orders
  if (!Array.isArray(orderItems) || orderItems.length === 0) {
    return res.status(400).json(errorResponse("At least one order item is required"));
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // [1] Fetch customer if existing
      let customer = await tx.customer.findUnique({
        where: { tableNumber: Number(tableNumber) },
      });

      // [2] Create customer if not-existing
      if (!customer || !customer.isActive) {
        customer = await tx.customer.create({
          data: {
            tableNumber: Number(tableNumber),
            firstName: firstName.trim(),
            pax: pax ? Number(pax) : null,
            isActive: true,
          },
        });
      }

      // [3] Calculate total and prepare order items
      let totalAmount = 0;
      const processedOrderItems = [];

      // [4] Find order items
      for (const oi of orderItems) {
        const item = await tx.item.findUnique({
          where: { id: oi.itemId },
          select: { id: true, name: true, price: true, cost: true },
        });

        // ! [ERROR] Non-existing item
        if (!item) throw new Error(`Item with id ${oi.itemId} not found`);

        // Compute dynamic totals
        const subtotal = item.price * oi.quantity;
        totalAmount += subtotal;

        // * [SUCCESS] Add order items
        processedOrderItems.push({
          itemId: oi.itemId,
          quantity: oi.quantity,
          priceAtOrder: item.price,
          costAtOrder: item.cost || 0,
          itemName: item.name,
          subtotal,
        });
      }

      // [5] Create new order
      const newOrder = await tx.order.create({
        data: {
          customerId: customer.id,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          status: status.toUpperCase() as any,
          totalAmount,
          orderItems: {
            create: processedOrderItems,
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          createdById: (req as any).user?.userId || (req as any).user?.id,
        },
        include: {
          customer: true,
          orderItems: {
            include: { item: true },
          },
        },
      });

      return newOrder;
    });

    // * [SUCCESS] Order created
    info(`Created new order #${result.id} for table ${tableNumber}`);
    res.status(201).json(successResponse("Order created successfully", result));
  } catch (err: unknown) {
    let errorMessage = "Failed to create order";
    if (err instanceof Error) errorMessage = err.message;
    error(`Error creating order: ${errorMessage}`);
    res.status(500).json(errorResponse(errorMessage));
    next(err);
  }
});

// * [PUT] Update Order Status
// ? /api/orders/:id
// * [PUT] Update Order Status → When COMPLETED, create Transaction + update SalesReport
router.put('/:id', verifyRole(['ADMIN', 'CASHIER']), async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { status, paymentMethod } = req.body;

  // ! [ERROR] Missing status
  if (!status) {
    return res.status(400).json(errorResponse("status is required"));
  }

  const newStatus = status.toUpperCase();

  // [VALIDATE] Payment method when completing an order
  const VALID_PAYMENT_METHODS = ["CASH", "GCASH"];
  const resolvedPaymentMethod = paymentMethod
    ? String(paymentMethod).toUpperCase()
    : "CASH";

  if (newStatus === "COMPLETED" && !VALID_PAYMENT_METHODS.includes(resolvedPaymentMethod)) {
    return res.status(400).json(errorResponse(`Invalid payment method. Must be one of: ${VALID_PAYMENT_METHODS.join(", ")}`));
  }

  try {
    // [1] Update order status
    const result = await prisma.$transaction(async (tx) => {
      // [2] Fetch order with items
      const order = await tx.order.findUnique({
        where: { id: Number(id) },
        include: {
          orderItems: {
            include: { item: true }
          }
        }
      });

      // ! [ERROR] Non-existing order
      if (!order) throw new Error("Order not found");

      // ! [ERROR] Inactive order
      if (!order.isActive) throw new Error("Order is already deleted");

      // [3] Update order status
      const updatedOrder = await tx.order.update({
        where: { id: Number(id) },
        data: { status: newStatus },
        include: {
          customer: true,
          orderItems: { include: { item: true } }
        }
      });

      // [4] If order is marked 'COMPLETED', create transaction computation, reduce inventory, and create sales report
      if (newStatus === "COMPLETED" && order.status !== "COMPLETED") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userId = (req as any).user?.userId || (req as any).user?.id;

        // [4.1] Get or create cashier record
        let cashier = await tx.cashier.findUnique({ where: { userId } });
        if (!cashier) {
          cashier = await tx.cashier.create({ data: { userId } });
        }

        const totalAmount = order.totalAmount;

        // [4.2] Create Transaction — use the cashier-selected payment method
        const transaction = await tx.transaction.create({
          data: {
            receiptNumber: `ORD-${order.id}-${Date.now()}`,
            cashierId: cashier.id,
            totalAmount,
            cashReceived: totalAmount,
            changeGiven: 0,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            paymentMethod: resolvedPaymentMethod as any,
            status: "COMPLETED",
          }
        });

        // [4.3] Create Transaction Items + reduce stock
        for (const oi of order.orderItems) {
          await tx.transactionItem.create({
            data: {
              transactionId: transaction.id,
              itemId: oi.itemId,
              itemName: oi.itemName,
              priceAtSale: oi.priceAtOrder,
              costAtSale: oi.costAtOrder ?? oi.item.cost ?? 0,
              quantity: oi.quantity,
              subtotal: oi.subtotal,
            }
          });

          // [4.4] Reduce inventory
          await tx.item.update({
            where: { id: oi.itemId },
            data: { quantity: { decrement: oi.quantity } }
          });
        }

        // [4.5] Get today's date in UTC midnight for consistent SalesReport keying
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        // [4.5] Compute profit
        const profit = order.orderItems.reduce((sum, oi) => {
          return sum + (oi.priceAtOrder - (oi.costAtOrder ?? oi.item.cost ?? 0)) * oi.quantity;
        }, 0);

        // [4.6] Create sales report
        await tx.salesReport.upsert({
          where: { date: today },
          update: {
            totalSales: { increment: totalAmount },
            totalProfit: { increment: profit },
            totalTransactions: { increment: 1 }
          },
          create: {
            date: today,
            totalSales: totalAmount,
            totalProfit: profit,
            totalTransactions: 1
          }
        });
      }

      return updatedOrder;
    });

    // * [SUCCESS] Order updated
    info(`Updated order ${id} to ${newStatus}`);
    res.json(successResponse("Order updated successfully", result));

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to update order";
    error(`Error updating order ${id}: ${errorMessage}`);
    res.status(500).json(errorResponse(errorMessage));
    next(err);
  }
});

// * [DELETE] Soft Delete Order
// ? /api/orders/:id
router.delete('/:id', verifyRole(['ADMIN', 'CASHIER']), async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  // ! [ERROR] Invalid order id
  if (!id || isNaN(Number(id))) {
    return res.status(400).json(errorResponse("Invalid order id"));
  }

  try {
    // Soft-delete order
    const deletedOrder = await prisma.order.update({
      where: { id: Number(id) },
      data: { isActive: false },
      include: {
        customer: true,
        orderItems: true
      }
    });

    // * [SUCCESS] Order soft-deleted
    info(`Soft-deleted order with id ${id}`);
    res.json(successResponse("Order soft deleted successfully", deletedOrder));
  } catch (err: unknown) {
    let errorMessage = "An unexpected error occurred while deleting order";
    if (err instanceof Error) errorMessage = err.message;
    error(`Error deleting order with id ${id}: ${errorMessage}`);
    res.status(500).json(errorResponse(errorMessage));
    next(err);
  }
});

export const orderRoutes = router;