// [IMPORT] Setup
import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

// [IMPORT] Helpers
import { successResponse, errorResponse } from '../utils/response';
import { error, info } from '../utils/logger';

const router = Router();

// * [GET] Get All Inventory Logs
// ? /api/inventory/
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
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
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
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

// * [POST] Create Inventory Log
// ? /api/inventory/
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    const { itemId, type, quantity, createdById } = req.body;

    try {
        const newLog = await prisma.inventoryLog.create({
            data: {
                itemId,
                type,
                quantity,
                createdById
            },
            include: { item: true }
        });

        info(`Created inventory log for item ${itemId} (${type}, ${quantity})`);
        res.status(201).json(successResponse("Inventory log created successfully", newLog));
    } catch (err: unknown) {
        let errorMessage = "An unexpected error occurred while creating inventory log";
        if (err instanceof Error) {
            errorMessage = err.message;
            error(`Error creating inventory log for item ${itemId}: ${errorMessage}`);
        } else {
            error(`Error creating inventory log for item ${itemId}: ${JSON.stringify(err)}`);
        }
        res.status(500).json(errorResponse(errorMessage));
        next(err);
    }
});

// * [PUT] Update Inventory Log
// ? /api/inventory/:id
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const updateData = req.body;

    try {
        const updatedLog = await prisma.inventoryLog.update({
            where: { id: Number(id) },
            data: updateData,
            include: { item: true }
        });

        info(`Updated inventory log with id ${id}`);
        res.json(successResponse("Inventory log updated successfully", updatedLog));
    } catch (err: unknown) {
        let errorMessage = "An unexpected error occurred while updating inventory log";
        if (err instanceof Error) {
            errorMessage = err.message;
            error(`Error updating inventory log with id ${id}: ${errorMessage}`);
        } else {
            error(`Error updating inventory log with id ${id}: ${JSON.stringify(err)}`);
        }
        res.status(500).json(errorResponse(errorMessage));
        next(err);
    }
});

// * [PATCH] Restore Inventory Log (Undo Soft Delete)
// ? /api/inventory/:id/restore
router.patch('/:id/restore', async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    try {
        // [1] Check if log exists
        const existingLog = await prisma.inventoryLog.findUnique({
            where: { id: Number(id) },
        });

        if (!existingLog) {
            return res.status(404).json(errorResponse(`Inventory log with id ${id} not found`));
        }

        // [2] Restore (set isActive = true)
        const restoredLog = await prisma.inventoryLog.update({
            where: { id: Number(id) },
            data: { isActive: true },
        });

        info(`Restored inventory log with id ${id}`);
        res.json(successResponse("Inventory log restored successfully", restoredLog));
    } catch (err: unknown) {
        let errorMessage = "An unexpected error occurred while restoring inventory log";
        if (err instanceof Error) {
            errorMessage = err.message;
            error(`Error restoring inventory log with id ${id}: ${errorMessage}`);
        } else {
            error(`Error restoring inventory log with id ${id}: ${JSON.stringify(err)}`);
        }
        res.status(500).json(errorResponse(errorMessage));
        next(err);
    }
});

// * [DELETE] Delete Inventory Log (Soft Delete)
// ? /api/inventory/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    try {
        // Ensure the log exists first
        const existingLog = await prisma.inventoryLog.findUnique({
            where: { id: Number(id) },
        });

        if (!existingLog) {
            return res.status(404).json(errorResponse(`Inventory log with id ${id} not found`));
        }

        // [1] Soft delete by setting isActive = false
        const deletedLog = await prisma.inventoryLog.update({
            where: { id: Number(id) },
            data: { isActive: false },
        });

        info(`Soft deleted inventory log with id ${id}`);
        res.json(successResponse("Inventory log soft deleted successfully", deletedLog));
    } catch (err: unknown) {
        let errorMessage = "An unexpected error occurred while deleting inventory log";
        if (err instanceof Error) {
            errorMessage = err.message;
            error(`Error deleting inventory log with id ${id}: ${errorMessage}`);
        } else {
            error(`Error deleting inventory log with id ${id}: ${JSON.stringify(err)}`);
        }
        res.status(500).json(errorResponse(errorMessage));
        next(err);
    }
});

export const inventoryRoutes = router;