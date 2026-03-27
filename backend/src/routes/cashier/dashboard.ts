// [IMPORT] Setup
import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';

// [IMPORT] Helpers
import { successResponse, errorResponse } from '../../utils/response';
import { error, info } from '../../utils/logger';

// [IMPORT] Middleware
import { verifyRole } from '../../middleware/authMiddleware';

const router = Router();

// * [GET] Get Cashier Dashboard Summary
// ? /api/cashier/dashboard/summary
router.get('/summary', verifyRole(['CASHIER']), async (req: Request, res: Response, next: NextFunction) => {
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
      include: { cashier: true }
    });

    // ! [ERROR] Cashier profile not found
    if (!cashierUser || cashierUser.role !== 'CASHIER') {
      return res.status(404).json(errorResponse("Cashier profile not found"));
    }

    // [3] Aggregate cashier-specific dashboard metrics
    const totalMyTransactions = await prisma.transaction.count({
      where: { cashierId: cashierUser.cashier?.id }
    });

    const totalSalesAmount = await prisma.transaction.aggregate({
      where: { cashierId: cashierUser.cashier?.id },
      _sum: { totalAmount: true }
    });

    // [3.1] Define today's date range
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // [3.2] Aggregate today's orders (all orders created today, any status)
    const totalOrdersToday = await prisma.order.count({
      where: {
        createdAt: { gte: todayStart, lte: todayEnd },
        isActive: true,
      }
    });

    // [3.3] Aggregate today's completed transactions
    const salesTodayAggregate = await prisma.transaction.aggregate({
      where: {
        cashierId: cashierUser.cashier?.id,
        createdAt: { gte: todayStart, lte: todayEnd },
        status: "COMPLETED"
      },
      _sum: { totalAmount: true }
    });
    const salesToday = salesTodayAggregate._sum.totalAmount || 0;

    // [3.4] Aggregate today's items sold (from transactions)
    const itemsSoldTodayResult = await prisma.transactionItem.aggregate({
      where: {
        transaction: {
          cashierId: cashierUser.cashier?.id,
          createdAt: { gte: todayStart, lte: todayEnd },
          status: "COMPLETED"
        }
      },
      _sum: { quantity: true }
    });
    const itemsSoldToday = itemsSoldTodayResult._sum.quantity || 0;

    // [4] Prepare response
    const dashboardSummary = {
      cashierProfile: {
        name: `${cashierUser.firstName} ${cashierUser.lastName}`,
        email: cashierUser.email,
      },
      totalTransactions: totalMyTransactions,
      totalSales: totalSalesAmount._sum.totalAmount || 0,
      totalOrdersToday,  // ← based on orders table (any status)
      salesToday,        // ← based on completed transactions
      itemsSoldToday     // ← based on completed transactions
    };

    // * [SUCCESS] Dashboard summary fetched
    info(`Cashier dashboard summary fetched for user id ${currentUserId}`);
    res.json(successResponse("Dashboard summary fetched successfully", dashboardSummary));

  } catch (err: unknown) {
    let errorMessage = "An unexpected error occurred while fetching cashier dashboard summary";
    if (err instanceof Error) errorMessage = err.message;
    error(`Error fetching cashier dashboard summary: ${errorMessage}`);
    res.status(500).json(errorResponse(errorMessage));
    next(err);
  }
});

export const dashboardRoutes = router;