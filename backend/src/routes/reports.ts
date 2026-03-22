// [IMPORT] Setup
import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

// [IMPORT] Helpers
import { successResponse, errorResponse } from '../utils/response';
import { info, error } from '../utils/logger';

const router = Router();

// * [GET] Sales Report
// ? /api/reports/sales?start=2026-03-01&end=2026-03-23
router.get('/sales', async (req: Request, res: Response, next: NextFunction) => {
    const { start, end } = req.query;

    try {
        // ! [ERROR] Dates required
        if (!start || !end) {
            return res.status(400).json(errorResponse("Start and end dates are required"));
        }

        const startDate = new Date(start as string);
        const endDate = new Date(end as string);

        // [1] Fetch transactions within date range (only COMPLETED)
        const transactions = await prisma.transaction.findMany({
            where: {
                createdAt: { gte: startDate, lte: endDate },
                status: 'COMPLETED',
                isActive: true
            },
            include: { items: true }
        });

        // [2] Compute totals
        let totalSales = 0;
        let totalProfit = 0;
        transactions.forEach(t => {
            totalSales += t.totalAmount;
            t.items.forEach(item => {
                totalProfit += (item.priceAtSale - (item.costAtSale || 0)) * item.quantity;
            });
        });

        const report = {
            startDate,
            endDate,
            totalSales,
            totalProfit,
            totalTransactions: transactions.length
        };

        info(`Fetched sales report from ${start} to ${end}`);
        res.json(successResponse("Sales report fetched successfully", report));

    } catch (err: unknown) {
        let errorMessage = "An unexpected error occurred while fetching sales report";
        if (err instanceof Error) errorMessage = err.message;
        error(`Error fetching sales report: ${errorMessage}`);
        res.status(500).json(errorResponse(errorMessage));
        next(err);
    }
});

// * [GET] Inventory Report
// ? /api/reports/inventory
router.get('/inventory', async (req: Request, res: Response, next: NextFunction) => {
    try {
        // [1] Fetch all items
        const items = await prisma.item.findMany({
            include: { inventoryLogs: true }
        });

        // [2] Compute stock in/out for each item
        const report = items.map(item => {
            const stockIn = item.inventoryLogs
                .filter(log => log.type === 'STOCK_IN' && log.isActive)
                .reduce((acc, log) => acc + log.quantity, 0);

            const stockOut = item.inventoryLogs
                .filter(log => log.type === 'STOCK_OUT' && log.isActive)
                .reduce((acc, log) => acc + log.quantity, 0);

            return {
                itemId: item.id,
                itemName: item.name,
                currentStock: item.quantity,
                stockIn,
                stockOut
            };
        });

        info(`Fetched inventory report for ${items.length} items`);
        res.json(successResponse("Inventory report fetched successfully", report));

    } catch (err: unknown) {
        let errorMessage = "An unexpected error occurred while fetching inventory report";
        if (err instanceof Error) errorMessage = err.message;
        error(`Error fetching inventory report: ${errorMessage}`);
        res.status(500).json(errorResponse(errorMessage));
        next(err);
    }
});

export const reportsRoutes = router;