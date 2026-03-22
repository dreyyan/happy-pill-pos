// [IMPORT] Setup
import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

// [IMPORT] Helpers
import { successResponse, errorResponse } from '../utils/response';
import { error, info } from '../utils/logger';
import { hashPassword } from '../utils/auth';

const router = Router();

// * [GET] Get All Cashiers
// ? /api/cashiers/
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const cashiers = await prisma.cashier.findMany({
            include: { user: true }
        });

        // [2] Remove password from each cashier user
        const cashiersWithoutPassword = cashiers.map(c => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { password: _, ...userWithoutPassword } = c.user;
            return { ...c, user: userWithoutPassword };
        });

        // * [SUCCESS] Return all cashiers
        info(`Fetched ${cashiers.length} cashiers`);
        res.json(successResponse("Cashiers fetched successfully", cashiersWithoutPassword));
    } catch (err: unknown) {
        let errorMessage = "An unexpected error occurred while fetching cashiers";
        if (err instanceof Error) {
            errorMessage = err.message;
            error(`Error fetching cashiers: ${errorMessage}`);
        } else {
            error(`Error fetching cashiers: ${JSON.stringify(err)}`);
        }
        res.status(500).json(errorResponse(errorMessage));
        next(err);
    }
});

// * [GET] Get Single Cashier
// ? /api/cashiers/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    try {
        const cashier = await prisma.cashier.findUnique({
            where: { id: Number(id) },
            include: { user: true }
        });

        // ! [ERROR] Cashier does not exist
        if (!cashier) {
            return res.status(404).json(errorResponse("Cashier not found"));
        }

        // [2] Remove password from user
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password: _, ...userWithoutPassword } = cashier.user;
        const cashierWithoutPassword = { ...cashier, user: userWithoutPassword };

        // * [SUCCESS] Return cashier
        info(`Fetched cashier with id ${id}`);
        res.json(successResponse("Cashier fetched successfully", cashierWithoutPassword));
    } catch (err: unknown) {
        let errorMessage = "An unexpected error occurred while fetching cashier";
        if (err instanceof Error) {
            errorMessage = err.message;
            error(`Error fetching cashier with id ${id}: ${errorMessage}`);
        } else {
            error(`Error fetching cashier with id ${id}: ${JSON.stringify(err)}`);
        }
        res.status(500).json(errorResponse(errorMessage));
        next(err);
    }
});

// * [POST] Create Cashier
// ? /api/cashiers/
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    const { email, password, firstName, lastName } = req.body;
    try {
        // [1] Hash password
        const hashedPassword = await hashPassword(password, 10);

        // [2] Create User + Cashier relation
        const newCashier = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                firstName,
                lastName,
                role: 'CASHIER',
                cashier: { create: {} }
            },
            include: { cashier: true }
        });

        // [3] Remove password before sending response
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password: _, ...cashierWithoutPassword } = newCashier;

        // * [SUCCESS] Create new 'Cashier' user
        info(`Cashier created successfully with email: ${email}`);
        res.status(201).json(successResponse("Cashier created successfully", cashierWithoutPassword));
    } catch (err: unknown) {
        let errorMessage = "An unexpected error occurred while creating cashier";
        if (err instanceof Error) {
            errorMessage = err.message;
            error(`Error creating cashier with email ${email}: ${errorMessage}`);
        } else {
            error(`Error creating cashier with email ${email}: ${JSON.stringify(err)}`);
        }
        res.status(500).json(errorResponse(errorMessage));
        next(err);
    }
});

// * [PUT] Update Cashier
// ? /api/cashiers/:id
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { email, firstName, lastName } = req.body;

    try {
        // [1] Fetch the Cashier first
        const cashier = await prisma.cashier.findUnique({
            where: { id: Number(id) },
            include: { user: true } // optional, can be used to compare existing values
        });

        // ! [ERROR] Cashier not found
        if (!cashier) {
            return res.status(404).json(errorResponse("Cashier not found"));
        }

        // [2] Fetch the associated User
        const existingUser = await prisma.user.findUnique({
            where: { id: cashier.userId }
        });

        if (!existingUser || existingUser.role !== 'CASHIER') {
            return res.status(404).json(errorResponse("Cashier user not found"));
        }

        // [3] Prepare data to update only if different from existing values
        const updateData: Partial<{ email: string; firstName: string; lastName: string }> = {};
        if (email && email !== existingUser.email) updateData.email = email;
        if (firstName && firstName !== existingUser.firstName) updateData.firstName = firstName;
        if (lastName && lastName !== existingUser.lastName) updateData.lastName = lastName;

        // ! [ERROR] No actual changes detected
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json(errorResponse("No changes detected to update"));
        }

        // [4] Update the User
        const updatedCashier = await prisma.user.update({
            where: { id: existingUser.id },
            data: updateData,
            include: { cashier: true }
        });

        // [5] Remove password before sending response
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password: _, ...cashierWithoutPassword } = updatedCashier;

        // * [SUCCESS] Return updated cashier
        info(`Cashier with id ${id} updated successfully`);
        res.json(successResponse("Cashier updated successfully", cashierWithoutPassword));
    } catch (err: unknown) {
        let errorMessage = "An unexpected error occurred while updating cashier";
        if (err instanceof Error) {
            errorMessage = err.message;
            error(`Error updating cashier with id ${id}: ${errorMessage}`);
        } else {
            error(`Error updating cashier with id ${id}: ${JSON.stringify(err)}`);
        }
        res.status(500).json(errorResponse(errorMessage));
        next(err);
    }
});

// * [DELETE] Delete Cashier (Soft Delete)
// ? /api/cashiers/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    try {
        // [1] Fetch the user to ensure they exist
        const existingUser = await prisma.user.findUnique({
            where: { id: Number(id) },
            include: { cashier: true }
        });

        // ! [ERROR] Cashier not found
        if (!existingUser || existingUser.role !== 'CASHIER') {
            return res.status(404).json(errorResponse("Cashier not found"));
        }

        // [2] Soft delete by setting isActive to false
        const softDeletedUser = await prisma.user.update({
            where: { id: Number(id) },
            data: { isActive: false },
            include: { cashier: true }
        });

        // * [SUCCESS] Cashier soft-deleted successfully
        info(`Cashier with id ${id} soft-deleted successfully`);
        res.json(successResponse("Cashier deleted successfully (soft delete)", softDeletedUser));
    } catch (err: unknown) {
        let errorMessage = "An unexpected error occurred while deleting cashier";
        if (err instanceof Error) {
            errorMessage = err.message;
            error(`Error deleting cashier with id ${id}: ${errorMessage}`);
        } else {
            error(`Error deleting cashier with id ${id}: ${JSON.stringify(err)}`);
        }
        res.status(500).json(errorResponse(errorMessage));
        next(err);
    }
});

export const cashiersRoutes = router;