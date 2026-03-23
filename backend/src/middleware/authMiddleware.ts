// [IMPORT] Setup
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

// [IMPORT] Helpers
import { errorResponse } from '../utils/response';
import { error, info } from '../utils/logger';

// [INTERFACE] JWT Payload
interface JwtPayload {
    userId?: number;
    role?: 'ADMIN' | 'CASHIER';
}

// * [MIDDLEWARE] Verify Admin
const verifyAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // [1] Read token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json(errorResponse("Unauthorized: token missing"));
        }
        const token = authHeader.split(' ')[1];

        // [2] Decode JWT
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

        // ! [ERROR] Token invalid or missing admin info
        if (!decoded?.userId || decoded.role !== 'ADMIN') {
            return res.status(403).json(errorResponse("Unauthorized: Admins only"));
        }

        // [3] Fetch user from DB
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            include: { admin: true }
        });

        // ! [ERROR] User not found or inactive
        if (!user || !user.isActive || !user.admin) {
            return res.status(403).json(errorResponse("User not found or inactive"));
        }

        // [SUCCESS] Attach user to request and continue
        info(`Admin verified: ${user.email}`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (req as any).user = {
            userId: user.id,
            role: 'ADMIN',
            email: user.email
        };
        next();
    } catch (err: unknown) {
        let errorMessage = "Error verifying admin";
        if (err instanceof Error) {
            errorMessage = err.message;
            error(`verifyAdmin error: ${errorMessage}`);
        } else {
            error(`verifyAdmin unknown error: ${JSON.stringify(err)}`);
        }
        res.status(401).json(errorResponse(errorMessage));
        next(err);
    }
};

// * [MIDDLEWARE] Verify Cashier
const verifyCashier = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json(errorResponse("Unauthorized: token missing"));
        }
        const token = authHeader.split(' ')[1];

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

        if (!decoded?.userId || decoded.role !== 'CASHIER') {
            return res.status(403).json(errorResponse("Unauthorized: Cashiers only"));
        }

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            include: { cashier: true }
        });

        if (!user || !user.isActive || !user.cashier) {
            return res.status(403).json(errorResponse("User not found or inactive"));
        }

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
        res.status(401).json(errorResponse(errorMessage));
        next(err);
    }
};

// * [MIDDLEWARE] Verify Admin or Cashier
const verifyAdminOrCashier = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json(errorResponse("Unauthorized: token missing"));
        }
        const token = authHeader.split(' ')[1];

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

        if (!decoded?.userId || !decoded.role) {
            return res.status(403).json(errorResponse("Unauthorized: Admin or Cashier only"));
        }

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            include: { admin: true, cashier: true }
        });

        if (!user || !user.isActive) {
            return res.status(403).json(errorResponse("User not found or inactive"));
        }

        if ((decoded.role === 'ADMIN' && user.admin) || (decoded.role === 'CASHIER' && user.cashier)) {
            info(`User verified: ${user.email} (${decoded.role})`);
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
        res.status(401).json(errorResponse(errorMessage));
        next(err);
    }
};

export { verifyAdmin, verifyCashier, verifyAdminOrCashier };