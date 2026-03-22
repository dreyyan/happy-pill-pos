// [IMPORT] Setup
import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

// [IMPORT] Helpers
import { successResponse, errorResponse } from '../utils/response';
import { error, info } from '../utils/logger';

// [IMPORT] Middleware
import { verifyAdmin } from '../middleware/authMiddleware';

const router = Router();

// * [GET] Get All Subcategories
// ? /api/subcategories/
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
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
router.post('/', verifyAdmin, async (req: Request, res: Response, next: NextFunction) => {
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

// * [PUT] Update Subcategory
// ? /api/subcategories/:id
router.put('/:id', verifyAdmin, async (req: Request, res: Response, next: NextFunction) => {
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
router.patch('/:id/reactivate', verifyAdmin, async (req: Request, res: Response, next: NextFunction) => {
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
router.delete('/:id', verifyAdmin, async (req: Request, res: Response, next: NextFunction) => {
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

export const subcategoryRoutes = router;