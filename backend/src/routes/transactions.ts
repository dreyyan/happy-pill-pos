// [IMPORT] Setup
import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

// [IMPORT] Helpers
import { successResponse, errorResponse } from '../utils/response';
import { error, info } from '../utils/logger';

// [IMPORT] Middleware
import { verifyAdminOrCashier } from '../middleware/authMiddleware';

const router = Router();

// * [GET] Get All Transactions
// ? /api/transactions/
router.get('/', verifyAdminOrCashier, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const transactions = await prisma.transaction.findMany({
            where: { isActive: true },
            include: {
                cashier: { include: { user: true } },
                items: true
            },
            orderBy: { createdAt: 'desc' }
        });

        // [2] Remove password from each cashier user
        const transactionsWithoutPassword = transactions.map(t => {
            if (t.cashier?.user) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { password: _, ...userWithoutPassword } = t.cashier.user;
                return { ...t, cashier: { ...t.cashier, user: userWithoutPassword } };
            }
            return t;
        });

        info(`Fetched ${transactions.length} transactions`);
        res.json(successResponse("Transactions fetched successfully", transactionsWithoutPassword));
    } catch (err: unknown) {
        let errorMessage = "An unexpected error occurred while fetching transactions";
        if (err instanceof Error) {
            errorMessage = err.message;
            error(`Error fetching transactions: ${errorMessage}`);
        } else {
            error(`Error fetching transactions: ${JSON.stringify(err)}`);
        }
        res.status(500).json(errorResponse(errorMessage));
        next(err);
    }
});

// * [GET] Get Single Transaction
// ? /api/transactions/:id
router.get('/:id', verifyAdminOrCashier, async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    try {
        const transaction = await prisma.transaction.findUnique({
            where: { id: Number(id) },
            include: {
                cashier: { include: { user: true } },
                items: true
            }
        });

        // ! [ERROR] Transaction not found
        if (!transaction || !transaction.isActive) {
            return res.status(404).json(errorResponse("Transaction not found"));
        }

        // [2] Remove password from cashier user
        if (transaction.cashier?.user) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { password: _, ...userWithoutPassword } = transaction.cashier.user;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            transaction.cashier = { ...transaction.cashier, user: userWithoutPassword as any };
        }

        info(`Fetched transaction with id ${id}`);
        res.json(successResponse("Transaction fetched successfully", transaction));
    } catch (err: unknown) {
        let errorMessage = "An unexpected error occurred while fetching transaction";
        if (err instanceof Error) {
            errorMessage = err.message;
            error(`Error fetching transaction ${id}: ${errorMessage}`);
        } else {
            error(`Error fetching transaction ${id}: ${JSON.stringify(err)}`);
        }
        res.status(500).json(errorResponse(errorMessage));
        next(err);
    }
});

// * [POST] Create Transaction (POS Checkout)
// ? /api/transactions/
router.post('/', verifyAdminOrCashier, async (req: Request, res: Response, next: NextFunction) => {
    const {
        cashierId,
        items,
        paymentMethod,
        cashReceived,
        discount = 0
    } = req.body;

    try {
        // ! [ERROR] No items provided
        if (!items || items.length === 0) {
            return res.status(400).json(errorResponse("Transaction must contain at least one item"));
        }

        // [1] Fetch cashier
        const cashier = await prisma.cashier.findUnique({
            where: { id: Number(cashierId) }
        });

        if (!cashier) {
            return res.status(404).json(errorResponse("Cashier not found"));
        }

        // [2] Fetch items from DB
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const itemIds = items.map((i: any) => i.itemId);

        const dbItems = await prisma.item.findMany({
            where: { id: { in: itemIds }, isActive: true }
        });

        // ! [ERROR] Some items not found
        if (dbItems.length !== itemIds.length) {
            return res.status(404).json(errorResponse("One or more items not found"));
        }

        // [3] Validate stock + compute totals
        let totalAmount = 0;

        for (const cartItem of items) {
            const dbItem = dbItems.find(i => i.id === cartItem.itemId);

            if (!dbItem) continue;

            // ! [ERROR] Insufficient stock
            if (dbItem.quantity < cartItem.quantity) {
                return res.status(400).json(
                    errorResponse(`Insufficient stock for item: ${dbItem.name}`)
                );
            }

            totalAmount += dbItem.price * cartItem.quantity;
        }

        // [4] Apply discount
        totalAmount -= discount;

        // ! [ERROR] Insufficient payment
        if (cashReceived < totalAmount) {
            return res.status(400).json(errorResponse("Insufficient payment"));
        }

        const changeGiven = cashReceived - totalAmount;

        // [5] Generate receipt number
        const receiptNumber = `R-${Date.now()}`;

        // [6] Atomic DB Transaction
        const result = await prisma.$transaction(async (tx) => {

            // [6.1] Create Transaction
            const transaction = await tx.transaction.create({
                data: {
                    receiptNumber,
                    cashierId,
                    totalAmount,
                    discount,
                    cashReceived,
                    changeGiven,
                    paymentMethod,
                    status: 'COMPLETED'
                }
            });

            // [6.2] Process each item
            for (const cartItem of items) {
                const dbItem = dbItems.find(i => i.id === cartItem.itemId);
                if (!dbItem) continue;

                const subtotal = dbItem.price * cartItem.quantity;

                // Create TransactionItem
                await tx.transactionItem.create({
                    data: {
                        transactionId: transaction.id,
                        itemId: dbItem.id,
                        itemName: dbItem.name,
                        priceAtSale: dbItem.price,
                        costAtSale: dbItem.cost,
                        quantity: cartItem.quantity,
                        subtotal
                    }
                });

                // Deduct stock
                await tx.item.update({
                    where: { id: dbItem.id },
                    data: {
                        quantity: dbItem.quantity - cartItem.quantity
                    }
                });

                // Log STOCK_OUT
                await tx.inventoryLog.create({
                    data: {
                        itemId: dbItem.id,
                        type: 'STOCK_OUT',
                        quantity: cartItem.quantity
                    }
                });
            }

            return transaction;
        });

        info(`Transaction created successfully with receipt ${receiptNumber}`);
        res.status(201).json(successResponse("Transaction completed successfully", result));

    } catch (err: unknown) {
        let errorMessage = "An unexpected error occurred while creating transaction";
        if (err instanceof Error) {
            errorMessage = err.message;
            error(`Error creating transaction: ${errorMessage}`);
        } else {
            error(`Error creating transaction: ${JSON.stringify(err)}`);
        }
        res.status(500).json(errorResponse(errorMessage));
        next(err);
    }
});

// * [PUT] Void Transaction
// ? /api/transactions/:id/void
router.put('/:id/void', verifyAdminOrCashier, async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    try {
        // [1] Fetch transaction with items
        const transaction = await prisma.transaction.findUnique({
            where: { id: Number(id) },
            include: { items: true }
        });

        // ! [ERROR] Transaction not found
        if (!transaction) {
            return res.status(404).json(errorResponse("Transaction not found"));
        }

        // ! [ERROR] Already voided
        if (transaction.status === 'VOIDED') {
            return res.status(400).json(errorResponse("Transaction is already voided"));
        }

        // [2] Restore stock for each item
        await prisma.$transaction(
            transaction.items.map(item =>
                prisma.item.update({
                    where: { id: item.itemId },
                    data: { quantity: { increment: item.quantity } }
                })
            )
        );

        // [3] Update transaction status
        const updatedTransaction = await prisma.transaction.update({
            where: { id: Number(id) },
            data: { status: 'VOIDED' },
            include: { items: true, cashier: { include: { user: true } } }
        });

        // [4] Remove password from cashier user
        if (updatedTransaction.cashier?.user) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { password: _, ...userWithoutPassword } = updatedTransaction.cashier.user;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            updatedTransaction.cashier = { ...updatedTransaction.cashier, user: userWithoutPassword as any };
        }

        info(`Transaction ${id} voided and stock restored`);
        res.json(successResponse("Transaction voided successfully and stock restored", updatedTransaction));

    } catch (err: unknown) {
        let errorMessage = "Error voiding transaction";
        if (err instanceof Error) errorMessage = err.message;
        error(`Error voiding transaction ${id}: ${errorMessage}`);
        res.status(500).json(errorResponse(errorMessage));
        next(err);
    }
});

// * [DELETE] Delete Transaction (Soft Delete)
// ? /api/transactions/:id
router.delete('/:id', verifyAdminOrCashier, async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    try {
        const existing = await prisma.transaction.findUnique({
            where: { id: Number(id) }
        });

        if (!existing) {
            return res.status(404).json(errorResponse("Transaction not found"));
        }

        const deleted = await prisma.transaction.update({
            where: { id: Number(id) },
            data: { isActive: false }
        });

        info(`Transaction ${id} soft deleted`);
        res.json(successResponse("Transaction deleted successfully", deleted));

    } catch (err: unknown) {
        let errorMessage = "Error deleting transaction";
        if (err instanceof Error) errorMessage = err.message;
        res.status(500).json(errorResponse(errorMessage));
        next(err);
    }
});

export const transactionRoutes = router;