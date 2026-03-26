// [IMPORT] Setup
import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

// [IMPORT] Helpers
import { successResponse, errorResponse } from '../utils/response';
import { error, info } from '../utils/logger';

// [IMPORT] Middleware
import { verifyRole } from '../middleware/authMiddleware';

const router = Router();

// * [GET] Get All Categories
// ? /api/categories/
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        // [1] Fetch all categories
        const categories = await prisma.category.findMany({
            orderBy: { name: 'asc' },
            include: { subcategories: true }
        });

        // * [SUCCESS] Return all categories
        info(`Fetched ${categories.length} categories`);
        res.json(successResponse("Categories fetched successfully", categories));
    } catch (err: unknown) {
        let errorMessage = "An unexpected error occurred while fetching categories";
        if (err instanceof Error) errorMessage = err.message;
        error(`Error fetching categories: ${errorMessage}`);
        res.status(500).json(errorResponse(errorMessage));
        next(err);
    }
});

// * [POST] Create Category
// ? /api/categories/
router.post('/', verifyRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
    const { name, description, isActive } = req.body;

    try {
        // [1] Check if category already exists
        const existingCategory = await prisma.category.findUnique({
            where: { name },
        });

        // ! [ERROR] Existing category
        if (existingCategory) {
            return res.status(400).json(errorResponse("Category with this name already exists"));
        }

        // [2] Create new category
        const newCategory = await prisma.category.create({
            data: { name, description, isActive }
        });

        // * [SUCCESS] Category created
        info(`Created category: ${name}`);
        res.status(201).json(successResponse("Category created successfully", newCategory));
    } catch (err: unknown) {
        let errorMessage = "An unexpected error occurred while creating category";
        if (err instanceof Error) errorMessage = err.message;
        error(`Error creating category ${name}: ${errorMessage}`);
        res.status(500).json(errorResponse(errorMessage));
        next(err);
    }
});

// * [PUT] Update Category
// ? /api/categories/:id
router.put('/:id', verifyRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { name, description, isActive } = req.body;

    try {
        // [1] Fetch current category to ensure it exists
        const existingCategory = await prisma.category.findUnique({
            where: { id: Number(id) }
        });

        // ! [ERROR] Category not found
        if (!existingCategory) {
            return res.status(404).json(errorResponse("Category not found"));
        }

        // [2] Update category
        const updatedCategory = await prisma.category.update({
            where: { id: Number(id) },
            data: { name, description, isActive }
        });

        // * [SUCCESS] Category updated
        info(`Updated category: ${name}`);
        res.json(successResponse("Category updated successfully", updatedCategory));
    } catch (err: unknown) {
        let errorMessage = "An unexpected error occurred while updating category";
        if (err instanceof Error) errorMessage = err.message;
        error(`Error updating category with id ${id}: ${errorMessage}`);
        res.status(500).json(errorResponse(errorMessage));
        next(err);
    }
});

// * [PATCH] Reactivate Category
// ? /api/categories/:id/reactivate
router.patch('/:id/reactivate', verifyRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    try {
        // [1] Fetch category
        const existingCategory = await prisma.category.findUnique({
            where: { id: Number(id) }
        });

        // ! [ERROR] Category not found
        if (!existingCategory) {
            return res.status(404).json(errorResponse("Category not found"));
        }

        // [2] Reactivate category
        const reactivatedCategory = await prisma.category.update({
            where: { id: Number(id) },
            data: { isActive: true }
        });

        // * [SUCCESS] Category reactivated
        info(`Category with id ${id} reactivated successfully`);
        res.json(successResponse("Category reactivated successfully", reactivatedCategory));
    } catch (err: unknown) {
        let errorMessage = "An unexpected error occurred while reactivating category";
        if (err instanceof Error) errorMessage = err.message;
        error(`Error reactivating category with id ${id}: ${errorMessage}`);
        res.status(500).json(errorResponse(errorMessage));
        next(err);
    }
});

// * [DELETE] Soft Delete Category
// ? /api/categories/:id
router.delete('/:id', verifyRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    try {
        // [1] Fetch category
        const existingCategory = await prisma.category.findUnique({
            where: { id: Number(id) }
        });

        // ! [ERROR] Category not found
        if (!existingCategory) {
            return res.status(404).json(errorResponse("Category not found"));
        }

        // [2] Soft delete by setting isActive to false
        const softDeletedCategory = await prisma.category.update({
            where: { id: Number(id) },
            data: { isActive: false }
        });

        // * [SUCCESS] Category soft deleted
        info(`Category with id ${id} soft-deleted successfully`);
        res.json(successResponse("Category deleted successfully (soft delete)", softDeletedCategory));
    } catch (err: unknown) {
        let errorMessage = "An unexpected error occurred while deleting category";
        if (err instanceof Error) errorMessage = err.message;
        error(`Error deleting category with id ${id}: ${errorMessage}`);
        res.status(500).json(errorResponse(errorMessage));
        next(err);
    }
});

// * [DELETE] Hard Delete Category
// ? /api/categories/:id/hard
router.delete('/:id/hard', verifyRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const categoryId = Number(id);

    try {
        // [1] Fetch category to ensure it exists
        const existingCategory = await prisma.category.findUnique({
            where: { id: Number(id) }
        });

        // ! [ERROR] Category not found
        if (!existingCategory) {
            return res.status(404).json(errorResponse("Category not found"));
        }

        await prisma.subcategory.deleteMany({
        where: { categoryId: categoryId },
        });

        // Delete category
        await prisma.category.delete({
        where: { id: categoryId },
        });

        // * [SUCCESS] Category hard deleted
        info(`Category with id ${id} permanently deleted`);
        res.json(successResponse("Category permanently deleted", { id: Number(id) }));
    } catch (err: unknown) {
        let errorMessage = "An unexpected error occurred while hard deleting category";
        if (err instanceof Error) errorMessage = err.message;
        error(`Hard delete category with id ${id} error: ${errorMessage}`);
        res.status(500).json(errorResponse(errorMessage));
        next(err);
    }
});

export const categoryRoutes = router;