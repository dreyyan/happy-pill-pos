// [IMPORT] Libraries
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// [IMPORT] Types
import { TokenPayload } from '../types';

// * CONSTANT
const JWT_SECRET = process.env.JWT_SECRET || '123';

// ? [HELPER] Hash password
const hashPassword = async (password: string, saltRounds: number) => {
    return await bcrypt.hash(password, saltRounds);
}

// ? [HELPER] Generate JWT
const generateToken = (payload: TokenPayload, expiresIn: string = '1h'): string => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn })
}

export { hashPassword, generateToken };