// [IMPORT] Setup
import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';

// [IMPORT] Helpers
import { successResponse, errorResponse } from '../../utils/response';
import { error, info } from '../../utils/logger';

// [IMPORT] Middleware
import { verifyRole } from '../../middleware/authMiddleware';

const router = Router();

// * [GET] Get Current Cashier Profile
// ? /api/cashier/profile
router.get('/', verifyRole(['CASHIER']), async (req: Request, res: Response, next: NextFunction) => {
    try {
        // [1] Fetch current user from middleware
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const currentUserId = (req as any).user?.userId;

        // ! [ERROR] Token/user missing
        if (!currentUserId) {
            return res.status(401).json(errorResponse("Unauthorized: No valid token provided"));
        }

        // [2] Fetch cashier profile safely
        const cashierUser = await prisma.user.findUnique({
            where: { id: Number(currentUserId) },
            include: { cashier: true } // include cashier-specific relation if exists
        });

        // ! [ERROR] Cashier profile not found
        if (!cashierUser || cashierUser.role !== 'CASHIER') {
            return res.status(404).json(errorResponse("Cashier profile not found"));
        }

        // [3] Remove password before sending response
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password: _, ...userWithoutPassword } = cashierUser;

        // [4] Prepare profile response
        const cashierProfile = {
            id: userWithoutPassword.id,
            email: userWithoutPassword.email,
            firstName: userWithoutPassword.firstName,
            lastName: userWithoutPassword.lastName,
            name: `${userWithoutPassword.firstName} ${userWithoutPassword.lastName}`,
            role: userWithoutPassword.role,
            isActive: userWithoutPassword.isActive,
            cashier: userWithoutPassword.cashier
        };

        // * [SUCCESS] Cashier profile fetched
        info(`Cashier profile fetched for user id ${currentUserId}`);
        res.json(successResponse("Cashier profile fetched successfully", cashierProfile));

    } catch (err: unknown) {
        let errorMessage = "An unexpected error occurred while fetching cashier profile";
        if (err instanceof Error) errorMessage = err.message;

        error(`Error fetching cashier profile: ${errorMessage}`);
        res.status(500).json(errorResponse(errorMessage));
        next(err);
    }
});

// * [PUT] Update Current Cashier Profile
// ? /api/cashier/profile
router.put('/', verifyRole(['CASHIER']), async (req: Request, res: Response, next: NextFunction) => {
    const { email, firstName, lastName } = req.body;

    try {
        // [1] Fetch current user from middleware
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const currentUserId = (req as any).user?.userId;

        // ! [ERROR] Token/user missing
        if (!currentUserId) {
            return res.status(401).json(errorResponse("Unauthorized: No valid token provided"));
        }

        // [2] Fetch existing cashier user
        const existingUser = await prisma.user.findUnique({
            where: { id: Number(currentUserId) },
            include: { cashier: true }
        });

        // ! [ERROR] Cashier profile not found
        if (!existingUser || existingUser.role !== 'CASHIER') {
            return res.status(404).json(errorResponse("Cashier profile not found"));
        }

        // [3] Prepare update data only if values changed
        const updateData: Partial<{ email: string; firstName: string; lastName: string }> = {};
        if (email && email !== existingUser.email) updateData.email = email;
        if (firstName && firstName !== existingUser.firstName) updateData.firstName = firstName;
        if (lastName && lastName !== existingUser.lastName) updateData.lastName = lastName;

        // [4] Update cashier user
        const updatedUser = await prisma.user.update({
            where: { id: Number(currentUserId) },
            data: updateData,
            include: { cashier: true }
        });

        // [5] Remove password before sending response
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password: _, ...userWithoutPassword } = updatedUser;

        // [6] Prepare profile response
        const updatedProfile = {
            id: userWithoutPassword.id,
            email: userWithoutPassword.email,
            firstName: userWithoutPassword.firstName,
            lastName: userWithoutPassword.lastName,
            name: `${userWithoutPassword.firstName} ${userWithoutPassword.lastName}`,
            role: userWithoutPassword.role,
            isActive: userWithoutPassword.isActive,
            cashier: userWithoutPassword.cashier
        };

        // * [SUCCESS] Cashier profile updated
        info(`Cashier profile updated successfully for user id ${currentUserId}`);
        res.json(successResponse("Cashier profile updated successfully", updatedProfile));

    } catch (err: unknown) {
        let errorMessage = "An unexpected error occurred while updating cashier profile";
        if (err instanceof Error) errorMessage = err.message;

        error(`Error updating cashier profile: ${errorMessage}`);
        res.status(500).json(errorResponse(errorMessage));
        next(err);
    }
});

export const profileRoutes = router;