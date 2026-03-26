// [IMPORT] Setup
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

// [IMPORT] Helpers
import { errorResponse } from '../utils/response';
import { error, info } from '../utils/logger';

// ? [TYPES]
type Role = 'ADMIN' | 'CASHIER';

// ? [INTERFACE]
interface JwtPayload {
  userId?: number;
  role?: Role;
}

export const verifyRole = (allowedRoles: Role[]) =>
async (req: Request, res: Response, next: NextFunction) => {
    try {
        // [1] Get token
        const authHeader = req.headers.authorization;

        // ! [ERROR] Missing token
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json(errorResponse("Unauthorized: token missing"));
        }

        const token = authHeader.split(' ')[1];

        // [2] Verify JWT
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET!
        ) as JwtPayload;

        // ! [ERROR] Invalid payload
        if (!decoded?.userId || !decoded.role) {
            return res.status(403).json(errorResponse("Invalid token payload"));
        }

        // ? Check if role allowed
        if (!allowedRoles.includes(decoded.role)) {
            return res.status(403).json(errorResponse("Access denied"));
        }

        // [3] Fetch user from DB
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            include: { admin: true, cashier: true }
        });

        // ! [ERROR] Inactive / non-existing user
        if (!user || !user.isActive) {
            return res.status(403).json(errorResponse("User not found or inactive"));
        }

        // Validate role record exists
        if (
            (decoded.role === 'ADMIN' && !user.admin) ||
            (decoded.role === 'CASHIER' && !user.cashier)
        ) {
            // ! [ERROR] Missing role record
            return res.status(403).json(errorResponse("Role record missing"));
        }

        // * [SUCCESS] Attach safe user object
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (req as any).user = {
            userId: user.id,
            role: decoded.role,
            email: user.email
        };

        info(`User verified: ${user.email} (${decoded.role})`);

        next();

    } catch (err) {
        error(`verifyRole error: ${err instanceof Error ? err.message : err}`);
        return res.status(401).json(errorResponse("Invalid or expired token"));
    }
};