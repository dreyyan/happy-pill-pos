// [IMPORT] Setup
import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';
import bcrypt from 'bcrypt';

// [IMPORT] Helpers
import { successResponse, errorResponse } from '../../utils/response';
import { error, info } from '../../utils/logger';
import { hashPassword, generateToken } from '../../utils/auth';

// [IMPORT] Types
import { TokenPayload } from '../../types';

const router = Router();

// * [POST] Sign Up Cashier
// ? /api/auth/cashier/sign-up
router.post('/sign-up', async (req: Request, res: Response, next: NextFunction) => {
    const { email, password, firstName, lastName } = req.body;
    try {
        // [1] Hash password
        const hashedPassword = await hashPassword(password, 10);

        // [2] Create 'Cashier' user
        const newUser = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                firstName,
                lastName,
                role: 'CASHIER',
                cashier: {
                    create: {}
                },
            },
            include: { cashier: true }
        });

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password: _, ...cashierWithoutPassword } = newUser;
        res.json(successResponse("Cashier account created", cashierWithoutPassword));

        // * [SUCCESS] Return new 'Cashier' user
        info(`Cashier created successfully with email: ${email}`);
        res.json(successResponse("Cashier account created", newUser));
    } catch (err: unknown) {
        let errorMessage = "An unexpected error occurred";

        // ! [ERROR] Return error response
        if (err instanceof Error) {
            errorMessage = err.message;
            error(`Error creating cashier for email ${email}: ${errorMessage}`);
        } else {
            error(`Error creating cashier for email ${email}: ${JSON.stringify(err)}`);
        }
        res.json(errorResponse(errorMessage));

        // ! [ERROR] Forward to global error handler
        next(err);
    }
});

// * [POST] Login Cashier
// ? /api/auth/cashier/login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
    const { email, password, rememberMe } = req.body;

    // [1] Perform input validation
    // ! [ERROR] Missing required fields: email, password
    if (!email || !password)
        return res.status(400).json(await errorResponse("Email and password are required"));

    try {
        // [2] Search if cashier exists
        const cashier = await prisma.cashier.findFirst({
            where: { user: { email } },
            include: { user: true }
        });

        // ! [ERROR] Cashier does not exist
        if (!cashier)
            return res.status(404).json(await errorResponse("Cashier not found in the database"));

        // [3] Check if password matches
        const passwordMatches = await bcrypt.compare(password, cashier.user.password);

        // ! [ERROR] Incorrect password
        if (!passwordMatches)
            return res.status(401).json(await errorResponse("Invalid password"));

        // [4] Create payload
        const payload: TokenPayload = {
            userId: cashier.user.id,
            role: 'CASHIER'
        };
        
        // [5] Sign token
        const expiresIn = rememberMe ? '7d' : '1h';
        const token = generateToken(payload, expiresIn);

        // [6] Create data without password
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password: _, ...cashierWithoutPassword } = cashier.user;
        return res.status(200).json(successResponse("Cashier logged in successfully", {
            cashier: cashierWithoutPassword,
            token
        }));
    } catch (err: unknown) {
        let errorMessage = "An unexpected error occurred";

        // ! [ERROR] Return error response
        if (err instanceof Error) {
            errorMessage = err.message;
            error(`Error logging cashier with email ${email}: ${errorMessage}`);
        } else {
            error(`Error logging in cashier with email ${email}: ${JSON.stringify(err)}`);
        }
        res.json(errorResponse(errorMessage));

        // ! [ERROR] Forward to global error handler
        next(err);
    }
});

export default router;