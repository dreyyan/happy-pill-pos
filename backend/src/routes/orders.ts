// [IMPORT] Setup
import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

// [IMPORT] Helpers
import { successResponse, errorResponse } from '../utils/response';
import { error, info } from '../utils/logger';

// [IMPORT] Middleware
import { verifyAdmin, verifyAdminOrCashier } from '../middleware/authMiddleware';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// * [GET] Get All Orders
// ? /api/orders/
router.get('/', verifyAdminOrCashier, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, customerId } = req.query;

    const filters: any = { isActive: true };

    if (status) filters.status = String(status).toUpperCase();
    if (customerId) filters.customerId = Number(customerId);

    const orders = await prisma.order.findMany({
      where: filters,
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
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
router.get('/:id', verifyAdminOrCashier, async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  try {
    const order = await prisma.order.findUnique({
      where: { id: Number(id) },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
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

    if (!order) {
      return res.status(404).json(errorResponse("Order not found"));
    }

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

// * [POST] Create Order
// ? /api/orders/
router.post('/', verifyAdmin, async (req: Request, res: Response, next: NextFunction) => {
  const { customerId, status = "PENDING", orderItems } = req.body;

  if (!customerId || !Array.isArray(orderItems) || orderItems.length === 0) {
    return res.status(400).json(errorResponse("customerId and at least one order item are required"));
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      const processedOrderItems = [];

      for (const oi of orderItems) {
        const item = await tx.item.findUnique({
          where: { id: oi.itemId },
          select: { id: true, name: true, price: true }
        });

        if (!item) throw new Error(`Item with id ${oi.itemId} not found`);

        const subtotal = item.price * oi.quantity;
        totalAmount += subtotal;

        processedOrderItems.push({
          itemId: oi.itemId,
          quantity: oi.quantity,
          priceAtOrder: item.price,
          itemName: item.name,
          subtotal,
        });
      }

      const newOrder = await tx.order.create({
        data: {
          customerId: Number(customerId),
          status: status.toUpperCase() as any,
          totalAmount,
          orderItems: {
            create: processedOrderItems,
          },
          createdById: (req as any).user?.userId || (req as any).user?.id,
        },
        include: {
          customer: true,
          orderItems: {
            include: { item: true }
          }
        }
      });

      return newOrder;
    });

    info(`Created new order #${result.id}`);
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
router.put('/:id', verifyAdmin, async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json(errorResponse("status is required"));
  }

  try {
    const updatedOrder = await prisma.order.update({
      where: { id: Number(id) },
      data: { status: status.toUpperCase() as any },
      include: {
        customer: true,
        orderItems: {
          include: { item: true }
        }
      }
    });

    info(`Updated order ${id} status to ${status}`);
    res.json(successResponse("Order updated successfully", updatedOrder));
  } catch (err: unknown) {
    let errorMessage = "An unexpected error occurred while updating order";
    if (err instanceof Error) errorMessage = err.message;
    error(`Error updating order ${id}: ${errorMessage}`);
    res.status(500).json(errorResponse(errorMessage));
    next(err);
  }
});

// * [DELETE] Soft Delete Order
// ? /api/orders/:id
router.delete('/:id', verifyAdmin, async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  if (!id || isNaN(Number(id))) {
    return res.status(400).json(errorResponse("Invalid order id"));
  }

  try {
    const deletedOrder = await prisma.order.update({
      where: { id: Number(id) },
      data: { isActive: false },
      include: {
        customer: true,
        orderItems: true
      }
    });

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