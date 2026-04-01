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

// ? [HELPER] Generate JWT
const verifyToken = (token: string): TokenPayload => {
    try {
        const decoded = jwt.verify(token, JWT_SECRET as jwt.Secret) as TokenPayload;
        return decoded;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
        throw new Error('Invalid or expired token');
    }
}


export { hashPassword, generateToken, verifyToken };