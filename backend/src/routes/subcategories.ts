// [IMPORT] Setup
import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

// [IMPORT] Helpers
import { successResponse, errorResponse } from '../utils/response';
import { error, info } from '../utils/logger';

// [IMPORT] Middleware
import { verifyRole } from '../middleware/authMiddleware';

const router = Router();

// * [GET] Get All Subcategories
// ? /api/subcategories/
router.get('/', verifyRole(['ADMIN', 'CASHIER']), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const subcategories = await prisma.subcategory.findMany({
            orderBy: { name: 'asc' },
            include: { category: true } // include parent category
        });

        // * [SUCCESS] Return all subcategories
        info(`Fetched ${subcategories.length} subcategories`);
        res.json(successResponse("Subcategories fetched successfully", subcategories));
    } catch (err: unknown) {
        let errorMessage = "An unexpected error occurred while fetching subcategories";
        if (err instanceof Error) errorMessage = err.message;
        error(`Error fetching subcategories: ${errorMessage}`);
        res.status(500).json(errorResponse(errorMessage));
        next(err);
    }
});

// * [POST] Create Subcategory
// ? /api/subcategories/
router.post('/', verifyRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
    const { name, categoryId, isActive } = req.body;

    try {
        const newSubcategory = await prisma.subcategory.create({
            data: { name, categoryId, isActive }
        });

        // * [SUCCESS] Subcategory created
        info(`Created subcategory: ${name}`);
        res.status(201).json(successResponse("Subcategory created successfully", newSubcategory));
    } catch (err: unknown) {
        let errorMessage = "An unexpected error occurred while creating subcategory";
        if (err instanceof Error) errorMessage = err.message;
        error(`Error creating subcategory ${name}: ${errorMessage}`);
        res.status(500).json(errorResponse(errorMessage));
        next(err);
    }
});

// * [POST] Auto-create Subcategories
// ? /api/subcategories/auto-create-all
router.post('/auto-create-all', verifyRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
    try {
        // [1] Define all subcategories
        const subcategories = [
            { name: 'Desserts', categoryName: 'Food' },
            { name: 'Appetizers', categoryName: 'Food' },
            { name: 'Hot Coffee', categoryName: 'Drinks' },
            { name: 'Cold Coffee', categoryName: 'Drinks' },
            { name: 'Frappe', categoryName: 'Drinks' },
            { name: 'Cooler', categoryName: 'Drinks' },
            { name: 'Shakes', categoryName: 'Drinks' },
            { name: 'Milk', categoryName: 'Drinks' },
            { name: 'Soft Drinks', categoryName: 'Drinks' },
            { name: 'Others', categoryName: 'Drinks' }
        ];

        // [2] Loop and create subcategories
        const createdSubcategories = [];
        for (const sub of subcategories) {
            // [2a] Find parent category
            const parentCategory = await prisma.category.findUnique({
                where: { name: sub.categoryName }
            });

            if (!parentCategory) {
                error(`Parent category not found: ${sub.categoryName}`);
                continue;
            }

            // [2b] Create subcategory if not exists
            const subcategory = await prisma.subcategory.upsert({
                where: {
                    name_categoryId: { // composite unique (name + categoryId)
                        name: sub.name,
                        categoryId: parentCategory.id
                    }
                },
                update: {},
                create: {
                    name: sub.name,
                    categoryId: parentCategory.id,
                    isActive: true
                }
            });

            createdSubcategories.push(subcategory);
        }

        // * [SUCCESS] Subcategories seeded
        info(`Seeded ${createdSubcategories.length} subcategories`);
        res.status(201).json(successResponse("Subcategories seeded successfully", createdSubcategories));
    } catch (err: unknown) {
        let msg = "Error seeding subcategories";
        if (err instanceof Error) msg = err.message;
        error(`Seed subcategories error: ${msg}`);
        res.status(500).json(errorResponse(msg));
        next(err);
    }
});

// * [PUT] Update Subcategory
// ? /api/subcategories/:id
router.put('/:id', verifyRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { name, categoryId, isActive } = req.body;

    try {
        // [1] Fetch current subcategory to ensure it exists
        const existingSubcategory = await prisma.subcategory.findUnique({
            where: { id: Number(id) }
        });

        // ! [ERROR] Subcategory not found
        if (!existingSubcategory) {
            return res.status(404).json(errorResponse("Subcategory not found"));
        }

        // [2] Update subcategory
        const updatedSubcategory = await prisma.subcategory.update({
            where: { id: Number(id) },
            data: { name, categoryId, isActive }
        });

        // * [SUCCESS] Subcategory updated
        info(`Updated subcategory: ${name}`);
        res.json(successResponse("Subcategory updated successfully", updatedSubcategory));
    } catch (err: unknown) {
        let errorMessage = "An unexpected error occurred while updating subcategory";
        if (err instanceof Error) errorMessage = err.message;
        error(`Error updating subcategory with id ${id}: ${errorMessage}`);
        res.status(500).json(errorResponse(errorMessage));
        next(err);
    }
});

// * [PATCH] Reactivate Subcategory
// ? /api/subcategories/:id/reactivate
router.patch('/:id/reactivate', verifyRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    try {
        // [1] Fetch subcategory
        const existingSubcategory = await prisma.subcategory.findUnique({
            where: { id: Number(id) }
        });

        // ! [ERROR] Subcategory not found
        if (!existingSubcategory) {
            return res.status(404).json(errorResponse("Subcategory not found"));
        }

        // [2] Reactivate subcategory
        const reactivatedSubcategory = await prisma.subcategory.update({
            where: { id: Number(id) },
            data: { isActive: true }
        });

        // * [SUCCESS] Subcategory reactivated
        info(`Subcategory with id ${id} reactivated successfully`);
        res.json(successResponse("Subcategory reactivated successfully", reactivatedSubcategory));
    } catch (err: unknown) {
        let errorMessage = "An unexpected error occurred while reactivating subcategory";
        if (err instanceof Error) errorMessage = err.message;
        error(`Error reactivating subcategory with id ${id}: ${errorMessage}`);
        res.status(500).json(errorResponse(errorMessage));
        next(err);
    }
});

// * [DELETE] Soft Delete Subcategory
// ? /api/subcategories/:id
router.delete('/:id', verifyRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    try {
        // [1] Fetch subcategory
        const existingSubcategory = await prisma.subcategory.findUnique({
            where: { id: Number(id) }
        });

        // ! [ERROR] Subcategory not found
        if (!existingSubcategory) {
            return res.status(404).json(errorResponse("Subcategory not found"));
        }

        // [2] Soft delete by setting isActive to false
        const softDeletedSubcategory = await prisma.subcategory.update({
            where: { id: Number(id) },
            data: { isActive: false }
        });

        // * [SUCCESS] Subcategory soft deleted
        info(`Subcategory with id ${id} soft-deleted successfully`);
        res.json(successResponse("Subcategory deleted successfully (soft delete)", softDeletedSubcategory));
    } catch (err: unknown) {
        let errorMessage = "An unexpected error occurred while deleting subcategory";
        if (err instanceof Error) errorMessage = err.message;
        error(`Error deleting subcategory with id ${id}: ${errorMessage}`);
        res.status(500).json(errorResponse(errorMessage));
        next(err);
    }
});

// * [DELETE] Hard Delete Subcategory
// ? /api/subcategories/:id/hard
router.delete('/:id/hard', verifyRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    try {
        // [1] Fetch subcategory to ensure it exists
        const existingSubcategory = await prisma.subcategory.findUnique({
            where: { id: Number(id) }
        });

        // ! [ERROR] Subcategory not found
        if (!existingSubcategory) {
            return res.status(404).json(errorResponse("Subcategory not found"));
        }

        // [2] Hard delete the subcategory
        await prisma.subcategory.delete({
            where: { id: Number(id) }
        });

        // * [SUCCESS] Subcategory hard deleted
        info(`Subcategory with id ${id} permanently deleted`);
        res.json(successResponse("Subcategory permanently deleted", { id: Number(id) }));
    } catch (err: unknown) {
        let errorMessage = "An unexpected error occurred while hard deleting subcategory";
        if (err instanceof Error) errorMessage = err.message;
        error(`Hard delete subcategory with id ${id} error: ${errorMessage}`);
        res.status(500).json(errorResponse(errorMessage));
        next(err);
    }
});

export const subcategoryRoutes = router;