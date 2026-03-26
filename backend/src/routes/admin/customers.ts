// [IMPORT] 
import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';

// [IMPORT] Helpers
import { successResponse, errorResponse } from '../../utils/response';
import { info, error } from '../../utils/logger';

// [IMPORT] Middleware
import { verifyRole } from '../../middleware/authMiddleware';

const router = Router();

// * [GET] Get All Active Tables (Customers)
// ? /api/customers/
router.get('/', verifyRole(['ADMIN', 'CASHIER']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search } = req.query;

    // [1] Search for active tables (customers)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { isActive: true };

    // [2] Apply optional search filter
    if (search) {
      const searchTerm = String(search);
      where.OR = [
        { tableNumber: { equals: Number(searchTerm) || undefined } },
        { firstName: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    // [3] Fetch customers with 'ACTIVE' orders only
    const customers = await prisma.customer.findMany({
      where,
      include: {
        orders: {
          where: { isActive: true },
          select: {
            id: true,
            status: true,
            totalAmount: true,
          },
        },
      },
      orderBy: { tableNumber: 'asc' },
    });

    // [4] Compute dynamic totals per table
    const customersWithTotal = customers.map((c) => {
      const total = c.orders.reduce((sum, o) => sum + o.totalAmount, 0);
      return {
        ...c,
        totalAmount: total,
        orderCount: c.orders.length,
      };
    });

    // * [SUCCESS] Get active tables
    info(`Fetched ${customers.length} active tables`);
    res.json(successResponse("Tables fetched successfully", customersWithTotal));
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to fetch tables";
    error(`Error fetching tables: ${errorMessage}`);
    res.status(500).json(errorResponse(errorMessage));
    next(err);
  }
});

// * [GET] Get Single Table (Customer)
// ? /api/customers/:id
router.get('/:id', verifyRole(['ADMIN', 'CASHIER']), async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  try {
    // [1] Fetch customer with specific 'id'
    const customer = await prisma.customer.findUnique({
      where: { id: Number(id) },
      include: {
        orders: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          include: {
            orderItems: {
              include: { item: true }
            }
          }
        },
      },
    });

    // ! [ERROR] Customer not found
    if (!customer) {
      return res.status(404).json(errorResponse("Table not found"));
    }

    // [2] Compute for total order amount
    const totalAmount = customer.orders.reduce((sum, o) => sum + o.totalAmount, 0);

    // * [SUCCESS] Get specific table
    info(`Fetched table ${customer.tableNumber}`);
    res.json(successResponse("Table fetched successfully", {
      ...customer,
      totalAmount,
      orderCount: customer.orders.length,
    }));
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to fetch table";
    error(`Error fetching table ${id}: ${errorMessage}`);
    res.status(500).json(errorResponse(errorMessage));
    next(err);
  }
});

// * [POST] Create New Table
// ? /api/customers/
router.post('/', verifyRole(['ADMIN', 'CASHIER']), async (req: Request, res: Response, next: NextFunction) => {
  const { tableNumber, firstName, pax } = req.body;

  // ! [ERROR] Missing required fields
  if (!tableNumber || !firstName) {
    return res.status(400).json(errorResponse("tableNumber and firstName are required"));
  }

  try {
    // [1] Check if table number already exists and is active
    const existing = await prisma.customer.findUnique({
      where: { tableNumber: Number(tableNumber) },
    });

    // ! [ERROR] Table with same table number already exists
    if (existing && existing.isActive) {
      return res.status(409).json(errorResponse(`Table ${tableNumber} is already occupied`));
    }

    // [2] Create new customer w/ complete information
    const newCustomer = await prisma.customer.create({
      data: {
        tableNumber: Number(tableNumber),
        firstName: firstName.trim(),
        pax: pax ? Number(pax) : null,
        isActive: true,
      },
    });

    // * [SUCCESS] Create new table
    info(`Created new table #${newCustomer.tableNumber} - ${newCustomer.firstName}`);
    res.status(201).json(successResponse("Table created successfully", newCustomer));
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to create table";
    error(`Error creating table: ${errorMessage}`);
    res.status(500).json(errorResponse(errorMessage));
    next(err);
  }
});

// * [PUT] Update Table Info
// ? /api/customers/:id
router.put('/:id', verifyRole, async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { firstName, pax } = req.body;

  try {
    const updatedCustomer = await prisma.customer.update({
      where: { id: Number(id) },
      data: {
        firstName: firstName?.trim(),
        pax: pax ? Number(pax) : null,
      },
    });

    info(`Updated table ${updatedCustomer.tableNumber}`);
    res.json(successResponse("Table updated successfully", updatedCustomer));
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to update table";
    error(`Error updating table ${id}: ${errorMessage}`);
    res.status(500).json(errorResponse(errorMessage));
    next(err);
  }
});

// * [DELETE] Soft Delete / Close Table
// ? /api/customers/:id
router.delete('/:id', verifyRole(['ADMIN', 'CASHIER']), async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  try {
    // [1] Validate ID
    const customerId = Number(id);

    // ! [ERROR] Invalid table ID value
    if (!id || isNaN(customerId) || customerId <= 0) {
      return res.status(400).json(errorResponse("Invalid table ID"));
    }
    // [2] Check if table exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        orders: {
          where: { isActive: true },
          select: { id: true, status: true },
        },
      },
    });

    // ! [ERROR] Non-existing table
    if (!customer) {
      return res.status(404).json(errorResponse("Table not found"));
    }

    // ! [ERROR] Table already closed
    if (!customer.isActive) {
      return res.status(400).json(errorResponse("Table already closed"));
    }

    // ! [ERROR] Closing a table w/ active orderse
    if (customer.orders.length > 0) {
      return res.status(409).json(
        errorResponse("Cannot close table with active orders")
      );
    }

    // Soft delete table
    const deleted = await prisma.customer.update({
      where: { id: customerId },
      data: { isActive: false },
    });


    // * [SUCCESS] Table soft deleted
    info(`Closed table ${deleted.tableNumber}`);
    res.json(successResponse("Table closed successfully", deleted));
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to close table";
    error(`Error closing table ${id}: ${errorMessage}`);
    res.status(500).json(errorResponse(errorMessage));
    next(err);
  }
});

export const customerRoutes = router;