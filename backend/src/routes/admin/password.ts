// [IMPORT] Setup
import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';
import bcrypt from 'bcrypt';

// [IMPORT] Helpers
import { successResponse, errorResponse } from '../../utils/response';
import { error, info } from '../../utils/logger';
import { hashPassword } from '../../utils/auth';

// [IMPORT] Middleware
import { verifyAdmin } from '../../middleware/authMiddleware';

const router = Router();

// * [PUT] Change Current Admin Password
// ? /api/admin/change-password
router.put('/', verifyAdmin, async (req: Request, res: Response, next: NextFunction) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    try {
        // [1] Fetch current user from middleware
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const currentUserId = (req as any).user?.userId;

        // ! [ERROR] Token/user missing
        if (!currentUserId) {
            return res.status(401).json(errorResponse("Unauthorized: No valid token provided"));
        }

        // ! [ERROR] Missing required fields
        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json(errorResponse("All password fields are required"));
        }

        // ! [ERROR] Password mismatch
        if (newPassword !== confirmPassword) {
            return res.status(400).json(errorResponse("New password and confirmation do not match"));
        }

        // [2] Fetch existing user
        const existingUser = await prisma.user.findUnique({
            where: { id: Number(currentUserId) }
        });

        // ! [ERROR] Admin not found
        if (!existingUser || existingUser.role !== 'ADMIN') {
            return res.status(404).json(errorResponse("Admin profile not found"));
        }

        // [3] Verify current password
        const isMatch = await bcrypt.compare(currentPassword, existingUser.password);

        // ! [ERROR] Incorrect current password
        if (!isMatch) {
            return res.status(400).json(errorResponse("Current password is incorrect"));
        }

        // ! [ERROR] Prevent same password reuse
        const samePassword = await bcrypt.compare(newPassword, existingUser.password);
        if (samePassword) {
            return res.status(400).json(errorResponse("New password must be different from current password"));
        }

        // [4] Hash new password
        const hashedPassword = await hashPassword(newPassword, 10);

        // [5] Update password
        await prisma.user.update({
            where: { id: Number(currentUserId) },
            data: { password: hashedPassword }
        });

        // * [SUCCESS] Password updated
        info(`Admin password changed successfully for user id ${currentUserId}`);
        res.json(successResponse("Password updated successfully", null));

    } catch (err: unknown) {
        let errorMessage = "An unexpected error occurred while changing password";
        if (err instanceof Error) errorMessage = err.message;

        error(`Error changing admin password: ${errorMessage}`);
        res.status(500).json(errorResponse(errorMessage));
        next(err);
    }
});

export const passwordRoutes = router;