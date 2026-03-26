// [IMPORT] Setup
import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';

// [IMPORT] Helpers
import { successResponse, errorResponse } from '../../utils/response';
import { error, info } from '../../utils/logger';
import { hashPassword } from '../../utils/auth';

// [IMPORT] Middleware
import { verifyRole } from '../../middleware/authMiddleware';

const router = Router();

// * [GET] Get All Users (Name + Role)
// ? /api/admin/users
router.get('/', verifyRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
    try {
        // [1] Fetch all Admins
        const admins = await prisma.admin.findMany({
            include: { user: true }
        });

        // [2] Format admin information
        const adminsMapped = admins.map(a => ({
            name: `${a.user.firstName} ${a.user.lastName}`,
            role: a.user.role,
            email: a.user.email
        }));

        // [3] Fetch all Cashiers
        const cashiers = await prisma.cashier.findMany({
            include: { user: true }
        });

        // [4] Format cashier information
        const cashiersMapped = cashiers.map(c => ({
            name: `${c.user.firstName} ${c.user.lastName}`,
            role: c.user.role,
            email: c.user.email
        }));

        // [5] Combine both results
        const allUsers = [...adminsMapped, ...cashiersMapped];

        // * [SUCCESS] Return all users
        info(`Fetched ${admins.length} admins and ${cashiers.length} cashiers (name + role)`);
        res.json(successResponse("All users fetched successfully", allUsers));

    } catch (err: unknown) {
        let errorMessage = "An unexpected error occurred while fetching users";
        if (err instanceof Error) errorMessage = err.message;
        error(`Error fetching all users: ${errorMessage}`);
        res.status(500).json(errorResponse(errorMessage));
        next(err);
    }
});

// * [GET] Get All Admins
// ? /api/admin/users/admins
router.get('/admins', verifyRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
    try {
        // [1] Find all admins
        const admins = await prisma.admin.findMany({
            include: { user: true }
        });

        // [2] Remove password from each admin user
        const adminsWithoutPassword = admins.map(a => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { password: _, ...userWithoutPassword } = a.user;
            return { ...a, user: userWithoutPassword };
        });

        // * [SUCCESS] Return all admins
        info(`Fetched ${admins.length} admins`);
        res.json(successResponse("Admins fetched successfully", adminsWithoutPassword));
    } catch (err: unknown) {
        let errorMessage = "An unexpected error occurred while fetching admins";
        if (err instanceof Error) {
            errorMessage = err.message;
            error(`Error fetching admins: ${errorMessage}`);
        } else {
            error(`Error fetching admins: ${JSON.stringify(err)}`);
        }
        res.status(500).json(errorResponse(errorMessage));
        next(err);
    }
});

// * [POST] Create Admin
// ? /api/admin/users
router.post('/', verifyRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
    const { email, password, firstName, lastName } = req.body;
    try {
        // [1] Hash password
        const hashedPassword = await hashPassword(password, 10);

        // [2] Create User + Admin relation
        const newAdmin = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                firstName,
                lastName,
                role: 'ADMIN',
                admin: { create: {} }
            },
            include: { admin: true }
        });

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password: _, ...adminWithoutPassword } = newAdmin;
        
        // * [SUCCESS] Create new 'Admin' user
        info(`Admin created successfully with email: ${email}`);
        res.status(201).json(successResponse("Admin created successfully", adminWithoutPassword));
    } catch (err: unknown) {
        let errorMessage = "An unexpected error occurred while creating admin";
        if (err instanceof Error) {
            errorMessage = err.message;
            error(`Error creating admin with email ${email}: ${errorMessage}`);
        } else {
            error(`Error creating admin with email ${email}: ${JSON.stringify(err)}`);
        }
        res.status(500).json(errorResponse(errorMessage));
        next(err);
    }
});

// * [GET] Get Single Admin
// ? /api/admin/users/:id
router.get('/:id', verifyRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    try {
        // [1] Fetch admin with specific 'id'
        const admin = await prisma.admin.findUnique({
            where: { id: Number(id) },
            include: { user: true }
        });

        // ! [ERROR] Admin does not exist
        if (!admin) {
            return res.status(404).json(errorResponse("Admin not found"));
        }

        // [2] Remove password from user
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password: _, ...userWithoutPassword } = admin.user;
        const adminWithoutPassword = { ...admin, user: userWithoutPassword };

        // * [SUCCESS] Return admin
        info(`Fetched admin with id ${id}`);
        res.json(successResponse("Admin fetched successfully", adminWithoutPassword));
    } catch (err: unknown) {
        let errorMessage = "An unexpected error occurred while fetching admin";
        if (err instanceof Error) {
            errorMessage = err.message;
            error(`Error fetching admin with id ${id}: ${errorMessage}`);
        } else {
            error(`Error fetching admin with id ${id}: ${JSON.stringify(err)}`);
        }
        res.status(500).json(errorResponse(errorMessage));
        next(err);
    }
});

// * [PUT] Update Admin
// ? /api/admin/users/:id
router.put('/:id', verifyRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { email, firstName, lastName } = req.body;

    try {
        // [1] Fetch current admin user
        const existingUser = await prisma.user.findUnique({
            where: { id: Number(id) }
        });

        // ! [ERROR] Admin not found
        if (!existingUser) {
            return res.status(404).json(errorResponse("Admin not found"));
        }

        // [2] Prepare data to update only if different from existing values
        const updateData: Partial<{ email: string; firstName: string; lastName: string }> = {};
        if (email && email !== existingUser.email) updateData.email = email;
        if (firstName && firstName !== existingUser.firstName) updateData.firstName = firstName;
        if (lastName && lastName !== existingUser.lastName) updateData.lastName = lastName;

        // ! [ERROR] No actual changes detected
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json(errorResponse("No changes detected to update"));
        }

        // [3] Update user
        const updatedAdmin = await prisma.user.update({
            where: { id: Number(id) },
            data: updateData,
            include: { admin: true }
        });

        // [4] Remove password before sending response
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password: _, ...adminWithoutPassword } = updatedAdmin;

        // * [SUCCESS] Return updated admin
        info(`Admin with id ${id} updated successfully`);
        res.json(successResponse("Admin updated successfully", adminWithoutPassword));
    } catch (err: unknown) {
        let errorMessage = "An unexpected error occurred while updating admin";
        if (err instanceof Error) {
            errorMessage = err.message;
            error(`Error updating admin with id ${id}: ${errorMessage}`);
        } else {
            error(`Error updating admin with id ${id}: ${JSON.stringify(err)}`);
        }
        res.status(500).json(errorResponse(errorMessage));
        next(err);
    }
});

// * [PATCH] Reactivate Admin
// ? /api/admin/users/:id/reactivate
router.patch('/:id/reactivate', verifyRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    try {
        // [1] Fetch the user to ensure they exist
        const existingUser = await prisma.user.findUnique({
            where: { id: Number(id) },
            include: { admin: true }
        });

        // ! [ERROR] Admin not found
        if (!existingUser || existingUser.role !== 'ADMIN') {
            return res.status(404).json(errorResponse("Admin not found"));
        }

        // [2] Reactivate admin by setting isActive to true
        const reactivatedUser = await prisma.user.update({
            where: { id: Number(id) },
            data: { isActive: true },
            include: { admin: true }
        });

        // * [SUCCESS] Admin reactivated successfully
        info(`Admin with id ${id} reactivated successfully`);
        res.json(successResponse("Admin reactivated successfully", reactivatedUser));
    } catch (err: unknown) {
        let errorMessage = "An unexpected error occurred while reactivating admin";
        if (err instanceof Error) {
            errorMessage = err.message;
            error(`Error reactivating admin with id ${id}: ${errorMessage}`);
        } else {
            error(`Error reactivating admin with id ${id}: ${JSON.stringify(err)}`);
        }
        res.status(500).json(errorResponse(errorMessage));

        // ! [ERROR] Forward to global error handler
        next(err);
    }
});

// * [PATCH] Delete all admins (Soft | Except self)
// ? /api/admin/users/delete-all
router.patch('/delete-all', verifyRole(['ADMIN']), async (req, res, next) => {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const currentUserId = (req as any).user?.userId;

        // [1] Soft delete all admins
        const result = await prisma.user.updateMany({
            where: {
                role: 'ADMIN',
                id: { not: currentUserId }
            },
            data: { isActive: false }
        });

        // * [SUCCESS] All admins soft deleted 
        info(`Soft-deleted ${result.count} admins`);
        res.json(successResponse(`${result.count} admins soft-deleted`, result));
    } catch (err: unknown) {
        let errorMessage = "An unexpected error occurred while deleting admins";
        if (err instanceof Error) errorMessage = err.message;
        error(`Error deleting admins: ${errorMessage}`);
        res.status(500).json(errorResponse(errorMessage));
        next(err);
    }
});

// * [DELETE] Delete Admin (Soft)
// ? /api/admin/users/:id
router.delete('/:id', verifyRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    try {
        // [1] Fetch the user to ensure they exist
        const existingUser = await prisma.user.findUnique({
            where: { id: Number(id) },
            include: { admin: true }
        });

        // ! [ERROR] Admin not found
        if (!existingUser || existingUser.role !== 'ADMIN') {
            return res.status(404).json(errorResponse("Admin not found"));
        }

        // [2] Soft delete by setting isActive to false
        const softDeletedUser = await prisma.user.update({
            where: { id: Number(id) },
            data: { isActive: false },
            include: { admin: true }
        });

        // * [SUCCESS] Admin soft-deleted
        info(`Admin with id ${id} soft-deleted successfully`);
        res.json(successResponse("Admin deleted successfully (soft delete)", softDeletedUser));
    } catch (err: unknown) {
        let errorMessage = "An unexpected error occurred while deleting admin";
        if (err instanceof Error) {
            errorMessage = err.message;
            error(`Error deleting admin with id ${id}: ${errorMessage}`);
        } else {
            error(`Error deleting admin with id ${id}: ${JSON.stringify(err)}`);
        }
        res.status(500).json(errorResponse(errorMessage));
        next(err);
    }
});

// * [DELETE] Delete Admin (Hard)
// ? /api/admin/users/:id/hard
router.delete('/:id/hard', verifyRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    try {
        // [1] Fetch the user to ensure they exist
        const existingUser = await prisma.user.findUnique({
            where: { id: Number(id) },
            include: { admin: true } // admin may be null
        });

        // ! [ERROR] Admin not found
        if (!existingUser || existingUser.role !== 'ADMIN') {
            return res.status(404).json(errorResponse("Admin not found"));
        }

        // ! [ERROR] Admin relation missing
        if (!existingUser.admin) {
            return res.status(500).json(errorResponse("Admin relation is missing"));
        }

        // [2] Hard delete admin and user
        await prisma.admin.delete({
            where: { id: existingUser.admin.id }
        });
        await prisma.user.delete({
            where: { id: Number(id) }
        });

        // * [SUCCESS] Admin hard deleted
        info(`Admin with id ${id} hard-deleted successfully`);
        res.json(successResponse("Admin hard-deleted successfully", { id }));
    } catch (err: unknown) {
        let errorMessage = "An unexpected error occurred while hard-deleting admin";
        if (err instanceof Error) errorMessage = err.message;
        error(`Error hard-deleting admin with id ${id}: ${errorMessage}`);
        res.status(500).json(errorResponse(errorMessage));
        next(err);
    }
});

export const userRoutes = router;