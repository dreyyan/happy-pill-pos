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

// * [POST] Sign Up Admin
// ? /api/auth/admin/sign-up
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    const { email, password, firstName, lastName } = req.body;
    try {
        // [1] Hash password
        const hashedPassword = await hashPassword(password, 10);

        // [2] Create 'Admin' user
        const newUser = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                firstName,
                lastName,
                role: 'ADMIN',
                admin: {
                    create: {}
                },
            }, include: { admin: true }
        });

        // * [SUCCESS] Return new 'Admin' user
        info(`Admin created successfully with email: ${email}`);
        res.json(successResponse("Admin account created", newUser));
    } catch (err: unknown) {
        let errorMessage = "An unexpected error occured";

        // ! [ERROR] Return error response
        if (err instanceof Error) {
            errorMessage = err.message;
            error(`Error creating admin for email ${email}: ${errorMessage}`);
        } else {
            error(`Error creating admin for email ${email}: ${JSON.stringify(err)}`);
        }
        res.json(errorResponse(errorMessage));

        // ! [ERROR] Forward to global error handler
        next(err);
    }
});

// * [POST] Login Admin
// ? /api/auth/admin/login
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    const { email, password, rememberMe } = req.body;

    // [1] Perform input validation
    // ! [ERROR] Missing required fields: email, password
    if (!email || !password)
        return res.status(400).json(await errorResponse("Email and password are required"));

    try {
        // [2] Search if admin exists
        const admin = await prisma.admin.findFirst({
            where: { user: { email } },
            include: { user: true }
        });

        // ! [ERROR] Admin does not exist
        if (!admin)
            return res.status(404).json(await errorResponse("Admin not found in the database"));

        // [3] Check if password exists
        const passwordMatches = bcrypt.compare(password, admin.user.password);

        // ! [ERROR] Incorrect password
        if (!passwordMatches)
            return res.status(401).json(await errorResponse("Invalid password"));

        // [4] Create payload
        const payload: TokenPayload = {
            userId: admin.user.id,
            role: 'ADMIN'
        };
        
        // [5] Sign token
        const expiresIn = rememberMe ? '7d' : '1h';
        const token = generateToken(payload, expiresIn);

        // [6] Create data without password
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password: _, ...adminWithoutPassword } = admin.user;
        return res.status(200).json(successResponse("Admin logged in successfully", {
            admin: adminWithoutPassword, token
        }));
    } catch (err: unknown) {
        let errorMessage = "An unexpected error occured";

        // ! [ERROR] Return error response
        if (err instanceof Error) {
            errorMessage = err.message;
            error(`Error logging admin with email ${email}: ${errorMessage}`);
        } else {
            error(`Error logging in admin with email ${email}: ${JSON.stringify(err)}`);
        }
        res.json(errorResponse(errorMessage));

        // ! [ERROR] Forward to global error handler
        next(err);
    }
});