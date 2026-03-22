// [IMPORT] Setup
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

// [IMPORT] Helpers
import { errorResponse } from '../utils/response';
import { error, info } from '../utils/logger';

// * [MIDDLEWARE] Verify admin
const verifyAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.body.userId || req.headers['x-user-id'];
        if (!userId) {
            return res.status(401).json(errorResponse("User ID missing in request"));
        }

        const user = await prisma.user.findUnique({
            where: { id: Number(userId) },
            include: { admin: true }
        });

        // ! [ERROR] User not found or inactive
        if (!user || !user.isActive) {
            return res.status(403).json(errorResponse("User not found or inactive"));
        }

        // ! [ERROR] User is not an admin
        if (user.role !== 'ADMIN' || !user.admin) {
            return res.status(403).json(errorResponse("Unauthorized: Admins only"));
        }

        // [SUCCESS] Attach user to request and continue
        info(`Admin verified: ${user.email}`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (req as any).user = user;
        next();
    } catch (err: unknown) {
        let errorMessage = "Error verifying admin";
        if (err instanceof Error) {
            errorMessage = err.message;
            error(`verifyAdmin error: ${errorMessage}`);
        } else {
            error(`verifyAdmin unknown error: ${JSON.stringify(err)}`);
        }
        res.status(500).json(errorResponse(errorMessage));
        next(err);
    }
};

// * [MIDDLEWARE] Verify Cashier
const verifyCashier = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.body.userId || req.headers['x-user-id'];
        if (!userId) {
            return res.status(401).json(errorResponse("User ID missing in request"));
        }

        const user = await prisma.user.findUnique({
            where: { id: Number(userId) },
            include: { cashier: true }
        });

        // ! [ERROR] User not found or inactive
        if (!user || !user.isActive) {
            return res.status(403).json(errorResponse("User not found or inactive"));
        }

        // ! [ERROR] User is not a cashier
        if (user.role !== 'CASHIER' || !user.cashier) {
            return res.status(403).json(errorResponse("Unauthorized: Cashiers only"));
        }

        // [SUCCESS] Attach user to request and continue
        info(`Cashier verified: ${user.email}`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (req as any).user = user;
        next();
    } catch (err: unknown) {
        let errorMessage = "Error verifying cashier";
        if (err instanceof Error) {
            errorMessage = err.message;
            error(`verifyCashier error: ${errorMessage}`);
        } else {
            error(`verifyCashier unknown error: ${JSON.stringify(err)}`);
        }
        res.status(500).json(errorResponse(errorMessage));
        next(err);
    }
};

export { verifyAdmin, verifyCashier };