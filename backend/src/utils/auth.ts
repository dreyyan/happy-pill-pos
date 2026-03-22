// [IMPORT] Libraries
import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import type { StringValue } from 'ms';
import type { Request } from 'express';

// [IMPORT] Types
import { TokenPayload } from '../types';

// * CONSTANT
const JWT_SECRET = process.env.JWT_SECRET || '123';

// ? [HELPER] Hash password
const hashPassword = async (password: string, saltRounds: number) => {
    return await bcrypt.hash(password, saltRounds);
}

// ? [HELPER] Generate JWT
const generateToken = (payload: TokenPayload, expiresIn: StringValue | number = '1h'): string => {
    const options: SignOptions = { expiresIn };
    return jwt.sign(payload, JWT_SECRET as jwt.Secret, options);
}

// ? [HELPER] Safely get userId from request
const getUserIdFromRequest = (req: Request): string | undefined => {
    // [1] Check body.userId (cast to any because body is untyped)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bodyUserId = (req.body as any)?.userId;

    // [2] Check headers: use req.header() to get string type safely
    const headerUserId = req.header('x-user-id');

    // [3] Check query parameters
    const queryUserId = req.query?.userId as string | undefined;

    // Return the first one found
    return bodyUserId || headerUserId || queryUserId;
};

export { hashPassword, generateToken, getUserIdFromRequest };