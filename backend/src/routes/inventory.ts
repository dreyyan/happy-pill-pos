// [IMPORT] Setup
import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

// [IMPORT] Helpers
import { successResponse, errorResponse } from '../utils/response';
import { error, info } from '../utils/logger';

// [IMPORT] Middleware
import { verifyAdmin, verifyAdminOrCashier } from '../middleware/authMiddleware';

const router = Router();

// * [GET] Get All Inventory Logs
// ? /api/inventory/
router.get('/', verifyAdminOrCashier, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { itemId, type, createdById } = req.query;

        // [1] Build filters
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const filters: any = {};
        if (itemId) filters.itemId = Number(itemId);
        if (type) filters.type = String(type).toUpperCase();
        if (createdById) filters.createdById = Number(createdById);

        // [2] Fetch inventory logs
        const logs = await prisma.inventoryLog.findMany({
            where: filters,
            include: {
                item: true,
                createdBy: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        role: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // * [SUCCESS] Return inventory logs
        info(`Fetched ${logs.length} inventory logs`);
        res.json(successResponse("Inventory logs fetched successfully", logs));
    } catch (err: unknown) {
        let errorMessage = "An unexpected error occurred while fetching inventory logs";
        if (err instanceof Error) {
            errorMessage = err.message;
            error(`Error fetching inventory logs: ${errorMessage}`);
        } else {
            error(`Error fetching inventory logs: ${JSON.stringify(err)}`);
        }
        res.status(500).json(errorResponse(errorMessage));
        next(err);
    }
});

// * [GET] Get Single Inventory Log
// ? /api/inventory/:id
router.get('/:id', verifyAdminOrCashier, async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    try {
        const log = await prisma.inventoryLog.findUnique({
            where: { id: Number(id) },
            include: {
                item: true,
                createdBy: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        role: true
                    }
                }
            }
        });

        if (!log) {
            return res.status(404).json(errorResponse("Inventory log not found"));
        }

        // * [SUCCESS] Return log
        info(`Fetched inventory log with id ${id}`);
        res.json(successResponse("Inventory log fetched successfully", log));
    } catch (err: unknown) {
        let errorMessage = "An unexpected error occurred while fetching inventory log";
        if (err instanceof Error) {
            errorMessage = err.message;
            error(`Error fetching inventory log with id ${id}: ${errorMessage}`);
        } else {
            error(`Error fetching inventory log with id ${id}: ${JSON.stringify(err)}`);
        }
        res.status(500).json(errorResponse(errorMessage));
        next(err);
    }
});

// * [POST] Create Inventory Log + Update Item Quantity
// ? /api/inventory/
router.post('/', verifyAdmin, async (req: Request, res: Response, next: NextFunction) => {
  const { itemId, type, quantity, createdById } = req.body;

  if (!itemId || !type || !quantity || quantity <= 0) {
    return res.status(400).json(errorResponse("itemId, type, and quantity (>0) are required"));
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the log
      const newLog = await tx.inventoryLog.create({
        data: {
          itemId: Number(itemId),
          type: type.toUpperCase() as "STOCK_IN" | "STOCK_OUT",
          quantity: Number(quantity),
          createdById: createdById ? Number(createdById) : undefined,
        },
        include: { item: true }
      });

      // 2. Update item quantity
      const updateData = type.toUpperCase() === "STOCK_IN"
        ? { quantity: { increment: Number(quantity) } }
        : { quantity: { decrement: Number(quantity) } };

      const updatedItem = await tx.item.update({
        where: { id: Number(itemId) },
        data: updateData,
      });

      return { log: newLog, item: updatedItem };
    });

    info(`Inventory log created + item ${result.item.name} quantity updated (${type})`);

    res.status(201).json(successResponse("Inventory log created and stock updated", result.log));
  } catch (err: unknown) {
    let errorMessage = "Failed to create inventory log";
    if (err instanceof Error) errorMessage = err.message;

    // Common error: insufficient stock for STOCK_OUT
    if (errorMessage.includes("insufficient") || errorMessage.includes("negative")) {
      return res.status(400).json(errorResponse("Not enough stock for STOCK_OUT"));
    }

    error(`Error creating inventory log: ${errorMessage}`);
    res.status(500).json(errorResponse(errorMessage));
    next(err);
  }
});

// * [PUT] Update Inventory Log + Adjust Item Quantity (Delta) - Prevents Negative Stock
// ? /api/inventory/:id
router.put('/:id', verifyAdmin, async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { type, quantity } = req.body;

  if (!type || quantity == null || Number(quantity) <= 0) {
    return res.status(400).json(errorResponse("type and quantity (> 0) are required"));
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const logId = Number(id);
      const newType = type.toUpperCase() as "STOCK_IN" | "STOCK_OUT";
      const newQty = Number(quantity);

      // 1. Get the old log
      const oldLog = await tx.inventoryLog.findUnique({
        where: { id: logId },
        select: { type: true, quantity: true, itemId: true }
      });

      if (!oldLog) {
        throw new Error("Inventory log not found");
      }

      const oldType = oldLog.type;
      const oldQty = oldLog.quantity;
      const itemId = oldLog.itemId;

      // 2. Get current item quantity BEFORE any changes
      const currentItem = await tx.item.findUnique({
        where: { id: itemId },
        select: { quantity: true, name: true }
      });

      if (!currentItem) {
        throw new Error("Item not found");
      }

      // 3. Reverse the OLD effect to simulate "undo"
      let simulatedQuantity = currentItem.quantity;

      if (oldType === "STOCK_IN") {
        simulatedQuantity -= oldQty;   // remove previous stock in
      } else {
        simulatedQuantity += oldQty;   // remove previous stock out
      }

      // 4. Apply the NEW effect and check for negative stock
      if (newType === "STOCK_IN") {
        simulatedQuantity += newQty;
      } else {
        simulatedQuantity -= newQty;
      }

      if (simulatedQuantity < 0) {
        throw new Error(`Cannot perform STOCK_OUT of ${newQty}. Current stock after change would be negative.`);
      }

      // 5. Now safely reverse the old effect in DB
      if (oldType === "STOCK_IN") {
        await tx.item.update({
          where: { id: itemId },
          data: { quantity: { decrement: oldQty } }
        });
      } else {
        await tx.item.update({
          where: { id: itemId },
          data: { quantity: { increment: oldQty } }
        });
      }

      // 6. Apply the new effect
      if (newType === "STOCK_IN") {
        await tx.item.update({
          where: { id: itemId },
          data: { quantity: { increment: newQty } }
        });
      } else {
        await tx.item.update({
          where: { id: itemId },
          data: { quantity: { decrement: newQty } }
        });
      }

      // 7. Update the log
      const updatedLog = await tx.inventoryLog.update({
        where: { id: logId },
        data: { type: newType, quantity: newQty },
        include: { item: true }
      });

      return updatedLog;
    });

    info(`Inventory log ${id} updated and stock adjusted successfully`);
    res.json(successResponse("Inventory log updated and stock adjusted successfully", result));
  } catch (err: unknown) {
    let errorMessage = "Failed to update inventory log";
    if (err instanceof Error) errorMessage = err.message;

    // Catch negative stock attempts
    if (errorMessage.includes("negative") || errorMessage.includes("Not enough stock")) {
      return res.status(400).json(errorResponse(errorMessage));
    }

    error(`Error updating inventory log ${id}: ${errorMessage}`);
    res.status(500).json(errorResponse(errorMessage));
    next(err);
  }
});

// * [PATCH] Restore Inventory Log + Re-apply Stock Effect
// ? /api/inventory/:id/restore
router.patch('/:id/restore', verifyAdmin, async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const logId = Number(id);

      const existingLog = await tx.inventoryLog.findUnique({
        where: { id: logId },
        select: { type: true, quantity: true, itemId: true, isActive: true }
      });

      if (!existingLog) {
        throw new Error(`Inventory log with id ${id} not found`);
      }

      if (existingLog.isActive) {
        throw new Error("Log is already active");
      }

      const { type, quantity, itemId } = existingLog;
      const qty = Number(quantity);

      // Re-apply the effect
      if (type === "STOCK_IN") {
        await tx.item.update({
          where: { id: itemId },
          data: { quantity: { increment: qty } }
        });
      } else {
        await tx.item.update({
          where: { id: itemId },
          data: { quantity: { decrement: qty } }
        });
      }

      // Restore the log
      const restoredLog = await tx.inventoryLog.update({
        where: { id: logId },
        data: { isActive: true },
        include: { item: true }
      });

      return restoredLog;
    });

    info(`Restored inventory log ${id} and re-applied stock effect`);
    res.json(successResponse("Inventory log restored and stock updated successfully", result));
  } catch (err: unknown) {
    let errorMessage = "Failed to restore inventory log";
    if (err instanceof Error) errorMessage = err.message;

    error(`Error restoring inventory log ${id}: ${errorMessage}`);
    res.status(400).json(errorResponse(errorMessage));
    next(err);
  }
});

// * [DELETE] Soft Delete Inventory Log + Revert Item Quantity
// ? /api/inventory/:id
router.delete('/:id', verifyAdmin, async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const logId = Number(id);

      // 1. Get the existing log
      const existingLog = await tx.inventoryLog.findUnique({
        where: { id: logId },
        select: { type: true, quantity: true, itemId: true, isActive: true }
      });

      if (!existingLog) {
        throw new Error(`Inventory log with id ${id} not found`);
      }

      if (!existingLog.isActive) {
        throw new Error("Log is already inactive");
      }

      const { type, quantity, itemId } = existingLog;
      const qty = Number(quantity);

      // 2. Revert the stock effect
      if (type === "STOCK_IN") {
        // Undo Stock In → decrement quantity
        await tx.item.update({
          where: { id: itemId },
          data: { quantity: { decrement: qty } }
        });
      } else {
        // Undo Stock Out → increment quantity
        await tx.item.update({
          where: { id: itemId },
          data: { quantity: { increment: qty } }
        });
      }

      // 3. Soft delete the log (set isActive = false)
      const deletedLog = await tx.inventoryLog.update({
        where: { id: logId },
        data: { isActive: false },
        include: { item: true }
      });

      return deletedLog;
    });

    info(`Soft deleted inventory log ${id} and reverted stock`);
    res.json(successResponse("Inventory log soft deleted and stock reverted successfully", result));
  } catch (err: unknown) {
    let errorMessage = "Failed to soft delete inventory log";
    if (err instanceof Error) errorMessage = err.message;

    error(`Error soft deleting inventory log ${id}: ${errorMessage}`);
    res.status(400).json(errorResponse(errorMessage));   // 400 for business errors
    next(err);
  }
});

export const inventoryRoutes = router;