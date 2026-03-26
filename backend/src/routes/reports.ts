// [IMPORT] Setup
import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

// [IMPORT] Helpers
import { successResponse, errorResponse } from '../utils/response';
import { info, error } from '../utils/logger';

// [IMPORT] Middleware
import { verifyRole } from '../middleware/authMiddleware';

const router = Router();

// * [GET] Get Daily Sales
// ? /api/reports/sales/daily
router.get('/sales/daily', verifyRole(['ADMIN', 'CASHIER']), async (req: Request, res: Response, next: NextFunction) => {
  const { from, to } = req.query;

  try {
    // ! [ERROR] Missing 'from' and 'to' dates
    if (!from || !to) {
      return res.status(400).json(errorResponse("from and to dates are required"));
    }

    const startDate = new Date(from as string);
    const endDate = new Date(to as string);
    endDate.setHours(23, 59, 59, 999); // include full end day

    // [1] Daily sales and transaction count
    const salesReports = await prisma.$queryRaw<
      { date: string; totalSales: number; totalTransactions: number }[]
    >`
      SELECT
        DATE("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila') AS date,
        SUM("totalAmount") AS "totalSales",
        COUNT(*) AS "totalTransactions"
      FROM "Transaction"
      WHERE "createdAt" BETWEEN ${startDate} AND ${endDate}
        AND status = 'COMPLETED'
        AND "isActive" = true
      GROUP BY date
      ORDER BY date ASC
    `;

    // [2] Daily profit
    const profitReports = await prisma.$queryRaw<
      { date: string; totalProfit: number }[]
    >`
      SELECT
        DATE(t."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila') AS date,
        SUM((ti."priceAtSale" - COALESCE(ti."costAtSale", 0)) * ti.quantity) AS "totalProfit"
      FROM "TransactionItem" ti
      JOIN "Transaction" t ON ti."transactionId" = t.id
      WHERE t."createdAt" BETWEEN ${startDate} AND ${endDate}
        AND t.status = 'COMPLETED'
        AND t."isActive" = true
      GROUP BY date
      ORDER BY date ASC
    `;

    // [3] Merge results
    const profitMap = new Map(
      profitReports.map(p => [p.date, Number(p.totalProfit) || 0])
    );

    const result = salesReports.map(r => ({
      id: new Date(r.date).getTime(),
      date: r.date,
      totalSales: Number(r.totalSales) || 0,
      totalProfit: profitMap.get(r.date) || 0,
      totalTransactions: Number(r.totalTransactions) || 0,
      createdAt: r.date,
      updatedAt: r.date,
    }));

    // * [SUCCESS] Daily sales reports fetched
    info(`Fetched daily sales reports from ${from} to ${to}`);
    res.json(successResponse("Daily sales reports fetched", result));

  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to fetch daily sales reports";

    error(`Error fetching daily sales: ${errorMessage}`);
    res.status(500).json(errorResponse(errorMessage));
    next(err);
  }
});

export const reportsRoutes = router;