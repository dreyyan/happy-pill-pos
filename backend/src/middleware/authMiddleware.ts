// [IMPORT] Setup
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

// [IMPORT] Helpers
import { errorResponse } from '../utils/response';
import { error, info } from '../utils/logger';
import { getUserIdFromRequest } from '../utils/auth';

// * [MIDDLEWARE] Verify Admin
const verifyAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = getUserIdFromRequest(req);
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
        const userId = getUserIdFromRequest(req);
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

// * [MIDDLEWARE] Verify Admin or Cashier
const verifyAdminOrCashier = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = getUserIdFromRequest(req);
        if (!userId) {
            return res.status(401).json(errorResponse("User ID missing in request"));
        }

        const user = await prisma.user.findUnique({
            where: { id: Number(userId) },
            include: { admin: true, cashier: true }
        });

        // ! [ERROR] User not found or inactive
        if (!user || !user.isActive) {
            return res.status(403).json(errorResponse("User not found or inactive"));
        }

        // ! [ERROR] User is neither admin nor cashier
        if ((user.role === 'ADMIN' && user.admin) || (user.role === 'CASHIER' && user.cashier)) {
            info(`User verified: ${user.email} (${user.role})`);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (req as any).user = user;
            next();
        } else {
            return res.status(403).json(errorResponse("Unauthorized: Admin or Cashier only"));
        }
    } catch (err: unknown) {
        let errorMessage = "Error verifying user";
        if (err instanceof Error) {
            errorMessage = err.message;
            error(`verifyAdminOrCashier error: ${errorMessage}`);
        } else {
            error(`verifyAdminOrCashier unknown error: ${JSON.stringify(err)}`);
        }
        res.status(500).json(errorResponse(errorMessage));
        next(err);
    }
};

export { verifyAdmin, verifyCashier, verifyAdminOrCashier };