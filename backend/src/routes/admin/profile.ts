// [IMPORT] Setup
import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';

// [IMPORT] Helpers
import { successResponse, errorResponse } from '../../utils/response';
import { error, info } from '../../utils/logger';

// [IMPORT] Middleware
import { verifyRole } from '../../middleware/authMiddleware';

const router = Router();

// * [GET] Get Current Admin Profile
// ? /api/admin/profile
router.get('/', verifyRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
    try {
        // [1] Fetch current user from middleware
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const currentUserId = (req as any).user?.userId;

        // ! [ERROR] Token/user missing
        if (!currentUserId) {
            return res.status(401).json(errorResponse("Unauthorized: No valid token provided"));
        }

        // [2] Fetch admin profile safely
        const adminUser = await prisma.user.findUnique({
            where: { id: Number(currentUserId) },
            include: { admin: true }
        });

        // ! [ERROR] Admin profile not found
        if (!adminUser || adminUser.role !== 'ADMIN') {
            return res.status(404).json(errorResponse("Admin profile not found"));
        }

        // [3] Remove password before sending response
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password: _, ...userWithoutPassword } = adminUser;

        // [4] Prepare profile response
        const adminProfile = {
            id: userWithoutPassword.id,
            email: userWithoutPassword.email,
            firstName: userWithoutPassword.firstName,
            lastName: userWithoutPassword.lastName,
            name: `${userWithoutPassword.firstName} ${userWithoutPassword.lastName}`,
            role: userWithoutPassword.role,
            isActive: userWithoutPassword.isActive,
            admin: userWithoutPassword.admin
        };

        // * [SUCCESS] Admin profile fetched
        info(`Admin profile fetched for user id ${currentUserId}`);
        res.json(successResponse("Admin profile fetched successfully", adminProfile));

    } catch (err: unknown) {
        let errorMessage = "An unexpected error occurred while fetching admin profile";
        if (err instanceof Error) errorMessage = err.message;

        error(`Error fetching admin profile: ${errorMessage}`);
        res.status(500).json(errorResponse(errorMessage));
        next(err);
    }
});

// * [PUT] Update Current Admin Profile
// ? /api/admin/profile
router.put('/', verifyRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
    const { email, firstName, lastName } = req.body;

    try {
        // [1] Fetch current user from middleware
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const currentUserId = (req as any).user?.userId;

        // ! [ERROR] Token/user missing
        if (!currentUserId) {
            return res.status(401).json(errorResponse("Unauthorized: No valid token provided"));
        }

        // [2] Fetch existing admin user
        const existingUser = await prisma.user.findUnique({
            where: { id: Number(currentUserId) },
            include: { admin: true }
        });

        // ! [ERROR] Admin profile not found
        if (!existingUser || existingUser.role !== 'ADMIN') {
            return res.status(404).json(errorResponse("Admin profile not found"));
        }

        // [3] Prepare update data only if values changed
        const updateData: Partial<{ email: string; firstName: string; lastName: string }> = {};

        if (email && email !== existingUser.email) updateData.email = email;
        if (firstName && firstName !== existingUser.firstName) updateData.firstName = firstName;
        if (lastName && lastName !== existingUser.lastName) updateData.lastName = lastName;

        // [4] Update admin user
        const updatedUser = await prisma.user.update({
            where: { id: Number(currentUserId) },
            data: updateData,
            include: { admin: true }
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
            admin: userWithoutPassword.admin
        };

        // * [SUCCESS] Admin profile updated
        info(`Admin profile updated successfully for user id ${currentUserId}`);
        res.json(successResponse("Admin profile updated successfully", updatedProfile));

    } catch (err: unknown) {
        let errorMessage = "An unexpected error occurred while updating admin profile";
        if (err instanceof Error) errorMessage = err.message;

        error(`Error updating admin profile: ${errorMessage}`);
        res.status(500).json(errorResponse(errorMessage));
        next(err);
    }
});

export const profileRoutes = router;