// [IMPORT] Setup
import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';

// [IMPORT] Helpers
import { successResponse, errorResponse } from '../../utils/response';
import { error, info } from '../../utils/logger';

// [IMPORT] Middleware
import { verifyRole } from '../../middleware/authMiddleware';

const router = Router();

// * [GET] Get Admin Dashboard Summary
// ? /api/admin/dashboard/summary
router.get('/summary', verifyRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
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
            where: { id: Number(currentUserId) }, // ensure number
            include: { admin: true }
        });

        // ! [ERROR] Admin profile not found
        if (!adminUser || adminUser.role !== 'ADMIN') {
            return res.status(404).json(errorResponse("Admin profile not found"));
        }

        // [3] Aggregate dashboard metrics
        const totalAdmins = await prisma.user.count({ where: { role: 'ADMIN', isActive: true } });
        const totalCashiers = await prisma.user.count({ where: { role: 'CASHIER', isActive: true } });
        const totalItems = await prisma.item.count({ where: { isActive: true } });
        const totalTransactions = await prisma.transaction.count({});
        const totalInventory = await prisma.inventoryLog.count({});

        // [4] Prepare response
        const dashboardSummary = {
            adminProfile: {
                name: `${adminUser.firstName} ${adminUser.lastName}`,
                email: adminUser.email,
            },
            totalAdmins,
            totalCashiers,
            totalItems,
            totalTransactions,
            totalInventory
        };

        // * [SUCCESS] Dashboard summary fetched
        info(`Admin dashboard summary fetched for user id ${currentUserId}`);
        res.json(successResponse("Dashboard summary fetched successfully", dashboardSummary));
    } catch (err: unknown) {
        let errorMessage = "An unexpected error occurred while fetching dashboard summary";
        if (err instanceof Error) errorMessage = err.message;
        error(`Error fetching admin dashboard summary: ${errorMessage}`);
        res.status(500).json(errorResponse(errorMessage));
        next(err);
    }
});

export const dashboardRoutes = router;