// [IMPORT] Libraries
import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import type { StringValue } from 'ms';

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

export { hashPassword, generateToken };