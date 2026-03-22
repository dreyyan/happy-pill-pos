// [IMPORT] Setup
import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

// [IMPORT] Helpers
import { successResponse, errorResponse } from '../utils/response';
import { error, info } from '../utils/logger';

const router = Router();

// * [GET] Get All Items
// ? /api/items/
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { search, category, isActive } = req.query;

        // [1] Build filters
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const filters: any = {};
        if (search) {
            filters.OR = [
                { name: { contains: String(search), mode: 'insensitive' } },
                { sku: { contains: String(search), mode: 'insensitive' } },
                { barcode: { contains: String(search), mode: 'insensitive' } }
            ];
        }
        if (category) filters.category = String(category);
        if (isActive !== undefined) filters.isActive = isActive === 'true';

        // [2] Fetch items
        const items = await prisma.item.findMany({
            where: filters,
            include: {
                createdBy: true,
                updatedBy: true,
            },
            orderBy: { name: 'asc' }
        });

        // * [SUCCESS] Return items
        info(`Fetched ${items.length} items`);
        res.json(successResponse("Items fetched successfully", items));
    } catch (err: unknown) {
        // ! [ERROR] Return error response
        let errorMessage = "An unexpected error occurred while fetching items";
        if (err instanceof Error) {
            errorMessage = err.message;
            error(`Error fetching items: ${errorMessage}`);
        } else {
            error(`Error fetching items: ${JSON.stringify(err)}`);
        }
        res.status(500).json(errorResponse(errorMessage));

        // ! [ERROR] Forward to global error handler
        next(err);
    }
});

// * [GET] Get Single Item
// ? /api/items/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    try {
        const item = await prisma.item.findUnique({
            where: { id: Number(id) },
            include: { createdBy: true, updatedBy: true, inventoryLogs: true }
        });

        if (!item) {
            return res.status(404).json(errorResponse("Item not found"));
        }

        info(`Fetched item with id ${id}`);
        res.json(successResponse("Item fetched successfully", item));
    } catch (err: unknown) {
        // ! [ERROR] Return error response
        let errorMessage = "An unexpected error occurred while fetching item";
        if (err instanceof Error) {
            errorMessage = err.message;
            error(`Error fetching item with id ${id}: ${errorMessage}`);
        } else {
            error(`Error fetching item with id ${id}: ${JSON.stringify(err)}`);
        }
        res.status(500).json(errorResponse(errorMessage));

        // ! [ERROR] Forward to global error handler
        next(err);
    }
});

// * [POST] Create Item
// ? /api/items/
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    const { name, description, sku, barcode, price, cost, quantity, category, unit, reorderLevel, isActive, createdById } = req.body;
    try {
        const newItem = await prisma.item.create({
            data: {
                name,
                description,
                sku,
                barcode,
                price,
                cost,
                quantity,
                category,
                unit,
                reorderLevel,
                isActive,
                createdById,
            }
        });

        info(`Created new item: ${name}`);
        res.status(201).json(successResponse("Item created successfully", newItem));
    } catch (err: unknown) {
        // ! [ERROR] Return error response
        let errorMessage = "An unexpected error occurred while creating item";
        if (err instanceof Error) {
            errorMessage = err.message;
            error(`Error creating item ${name}: ${errorMessage}`);
        } else {
            error(`Error creating item ${name}: ${JSON.stringify(err)}`);
        }
        res.status(500).json(errorResponse(errorMessage));

        // ! [ERROR] Forward to global error handler
        next(err);
    }
});

// * [PUT] Update Item
// ? /api/items/:id
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const updateData = req.body;
    try {
        const updatedItem = await prisma.item.update({
            where: { id: Number(id) },
            data: updateData
        });

        info(`Updated item with id ${id}`);
        res.json(successResponse("Item updated successfully", updatedItem));
    } catch (err: unknown) {
        let errorMessage = "An unexpected error occurred while updating item";
        if (err instanceof Error) {
            errorMessage = err.message;
            error(`Error updating item with id ${id}: ${errorMessage}`);
        } else {
            error(`Error updating item with id ${id}: ${JSON.stringify(err)}`);
        }
        res.status(500).json(errorResponse(errorMessage));
        next(err);
    }
});

// * [DELETE] Delete Item (soft delete using isActive)
// ? /api/items/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    try {
        const deletedItem = await prisma.item.update({
            where: { id: Number(id) },
            data: { isActive: false }
        });

        info(`Soft-deleted item with id ${id}`);
        res.json(successResponse("Item deleted successfully", deletedItem));
    } catch (err: unknown) {
        // ! [ERROR] Return error response
        let errorMessage = "An unexpected error occurred while deleting item";
        if (err instanceof Error) {
            errorMessage = err.message;
            error(`Error deleting item with id ${id}: ${errorMessage}`);
        } else {
            error(`Error deleting item with id ${id}: ${JSON.stringify(err)}`);
        }
        res.status(500).json(errorResponse(errorMessage));

        // ! [ERROR] Forward to global error handler
        next(err);
    }
});

export const itemRoutes = router;