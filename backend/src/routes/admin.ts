// [IMPORT] Setup
import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';

// [IMPORT] Helpers
import { successResponse, errorResponse } from '../utils/response';
import { error, info } from '../utils/logger';
import { hashPassword } from '../utils/auth';

// [IMPORT] Middleware
import { verifyAdmin } from '../middleware/authMiddleware';

// [IMPORT] CSV Parser
import multer from 'multer';
import { parse } from "csv-parse/sync";
import fs from 'fs';

const upload = multer({ dest: 'uploads/' });

const router = Router();


// * [POST] Import Users via CSV
// ? /api/admin/import-users
router.post(
  '/import-users',
  verifyAdmin,
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        console.error("[CSV IMPORT] No file uploaded");
        return res.status(400).json(errorResponse("CSV file is required"));
      }

      // [1] Read file content
      const fileContent = fs.readFileSync(req.file.path, 'utf-8');
      console.log("[CSV IMPORT] File read successfully:\n", fileContent);

      // [2] Parse CSV synchronously with comma delimiter
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        delimiter: ',', // <-- comma-separated CSV
      });
      console.log(`[CSV IMPORT] Parsed ${records.length} records`);

      let createdCount = 0;

      // [3] Process each record sequentially
      for (const [index, row] of records.entries()) {
        console.log(`[CSV IMPORT] Processing row ${index + 1}:`, row);

        const name = row['Name']?.trim() || row['name']?.trim();
        const email = row['Email']?.trim() || row['email']?.trim();
        const roleRaw = row['Role']?.trim() || row['role']?.trim();

        if (!name || !roleRaw || !email) {
          console.warn(`[CSV IMPORT] Skipping row ${index + 1}: missing required fields`);
          continue;
        }

        const role = roleRaw.toUpperCase();
        if (role !== "ADMIN" && role !== "CASHIER") {
          console.warn(`[CSV IMPORT] Skipping row ${index + 1}: invalid role "${roleRaw}"`);
          continue;
        }

        const [firstName, ...lastParts] = name.split(" ");
        const lastName = lastParts.join(" ") || "";

        // Skip if email already exists
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
          console.warn(`[CSV IMPORT] Skipping row ${index + 1}: email "${email}" already exists`);
          continue;
        }

        // [4] Use default password "password123"
        const defaultPassword = "password123";
        const hashedPassword = await hashPassword(defaultPassword, 10);

        // [5] Create user
        try {
          await prisma.user.create({
            data: {
              email,
              password: hashedPassword,
              firstName,
              lastName,
              role,
              isActive: true,
              admin: role === "ADMIN" ? { create: {} } : undefined,
              cashier: role === "CASHIER" ? { create: {} } : undefined,
            },
          });
          console.log(`[CSV IMPORT] Created user: ${email} (${role})`);
          createdCount++;
        } catch (createErr) {
          console.error(`[CSV IMPORT] Failed to create user "${email}":`, createErr);
        }
      }

      // [6] Delete uploaded file
      fs.unlinkSync(req.file.path);
      console.log("[CSV IMPORT] Deleted uploaded file");

      info(`Imported ${createdCount} users from CSV`);
      res.json(successResponse(`Successfully imported ${createdCount} users`, { createdCount }));

    } catch (err: unknown) {
      let errorMessage = "Error importing users";
      if (err instanceof Error) errorMessage = err.message;

      console.error(`[CSV IMPORT] CSV import error: ${errorMessage}`);
      res.status(500).json(errorResponse(errorMessage));
      next(err);
    }
  }
);

// * [GET] Get Admin Dashboard Summary
// ? /api/admin/dashboard/summary
router.get('/dashboard/summary', verifyAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
        // [1] Fetch current user from middleware
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const currentUserId = (req as any).user?.userId;

        // ! [ERROR] Token/user missing
        if (!currentUserId) {
            return res.status(401).json(errorResponse("Unauthorized: No valid token provided"));
        }

        // [2] Fetch admin profile safely
        const adminUser = await prisma.user.findUnique({
            where: { id: Number(currentUserId) }, // ensure number
            include: { admin: true }
        });

        // ! [ERROR] Admin profile not found
        if (!adminUser || adminUser.role !== 'ADMIN') {
            return res.status(404).json(errorResponse("Admin profile not found"));
        }

        // [3] Aggregate dashboard metrics
        const totalAdmins = await prisma.user.count({ where: { role: 'ADMIN', isActive: true } });
        const totalCashiers = await prisma.user.count({ where: { role: 'CASHIER', isActive: true } });
        const totalItems = await prisma.item.count({ where: { isActive: true } });
        const totalTransactions = await prisma.transaction.count({});
        const totalInventory = await prisma.inventoryLog.count({});

        // [4] Prepare response
        const dashboardSummary = {
            adminProfile: {
                name: `${adminUser.firstName} ${adminUser.lastName}`,
                email: adminUser.email,
            },
            totalAdmins,
            totalCashiers,
            totalItems,
            totalTransactions,
            totalInventory
        };

        // * [SUCCESS] Dashboard summary fetched
        info(`Admin dashboard summary fetched for user id ${currentUserId}`);
        res.json(successResponse("Dashboard summary fetched successfully", dashboardSummary));
    } catch (err: unknown) {
        let errorMessage = "An unexpected error occurred while fetching dashboard summary";
        if (err instanceof Error) errorMessage = err.message;
        error(`Error fetching admin dashboard summary: ${errorMessage}`);
        res.status(500).json(errorResponse(errorMessage));
        next(err);
    }
});

// * [GET] Get All Users (Name + Role)
// ? /api/admin/users
router.get('/users', verifyAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
        // [1] Fetch all Admins
        const admins = await prisma.admin.findMany({
            include: { user: true }
        });

        const adminsMapped = admins.map(a => ({
            name: `${a.user.firstName} ${a.user.lastName}`,
            role: a.user.role,
            email: a.user.email
        }));

        // [2] Fetch all Cashiers
        const cashiers = await prisma.cashier.findMany({
            include: { user: true }
        });

        const cashiersMapped = cashiers.map(c => ({
            name: `${c.user.firstName} ${c.user.lastName}`,
            role: c.user.role,
            email: c.user.email
        }));

        // [3] Combine both results
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

// * [GET] Get Current Admin Profile
// ? /api/admin/profile
router.get('/profile', verifyAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
        // [1] Fetch current user from middleware
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const currentUserId = (req as any).user?.userId;

        // ! [ERROR] Token/user missing
        if (!currentUserId) {
            return res.status(401).json(errorResponse("Unauthorized: No valid token provided"));
        }

        // [2] Fetch admin profile safely
        const adminUser = await prisma.user.findUnique({
            where: { id: Number(currentUserId) },
            include: { admin: true }
        });

        // ! [ERROR] Admin profile not found
        if (!adminUser || adminUser.role !== 'ADMIN') {
            return res.status(404).json(errorResponse("Admin profile not found"));
        }

        // [3] Remove password before sending response
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password: _, ...userWithoutPassword } = adminUser;

        // [4] Prepare profile response
        const adminProfile = {
            id: userWithoutPassword.id,
            email: userWithoutPassword.email,
            firstName: userWithoutPassword.firstName,
            lastName: userWithoutPassword.lastName,
            name: `${userWithoutPassword.firstName} ${userWithoutPassword.lastName}`,
            role: userWithoutPassword.role,
            isActive: userWithoutPassword.isActive,
            admin: userWithoutPassword.admin
        };

        // * [SUCCESS] Admin profile fetched
        info(`Admin profile fetched for user id ${currentUserId}`);
        res.json(successResponse("Admin profile fetched successfully", adminProfile));

    } catch (err: unknown) {
        let errorMessage = "An unexpected error occurred while fetching admin profile";
        if (err instanceof Error) errorMessage = err.message;

        error(`Error fetching admin profile: ${errorMessage}`);
        res.status(500).json(errorResponse(errorMessage));
        next(err);
    }
});

// * [PUT] Change Current Admin Password
// ? /api/admin/change-password
router.put('/change-password', verifyAdmin, async (req: Request, res: Response, next: NextFunction) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    try {
        // [1] Fetch current user from middleware
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const currentUserId = (req as any).user?.userId;

        // ! [ERROR] Token/user missing
        if (!currentUserId) {
            return res.status(401).json(errorResponse("Unauthorized: No valid token provided"));
        }

        // ! [ERROR] Missing required fields
        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json(errorResponse("All password fields are required"));
        }

        // ! [ERROR] Password mismatch
        if (newPassword !== confirmPassword) {
            return res.status(400).json(errorResponse("New password and confirmation do not match"));
        }

        // [2] Fetch existing user
        const existingUser = await prisma.user.findUnique({
            where: { id: Number(currentUserId) }
        });

        // ! [ERROR] Admin not found
        if (!existingUser || existingUser.role !== 'ADMIN') {
            return res.status(404).json(errorResponse("Admin profile not found"));
        }

        // [3] Verify current password
        const isMatch = await bcrypt.compare(currentPassword, existingUser.password);

        // ! [ERROR] Incorrect current password
        if (!isMatch) {
            return res.status(400).json(errorResponse("Current password is incorrect"));
        }

        // ! [ERROR] Prevent same password reuse
        const samePassword = await bcrypt.compare(newPassword, existingUser.password);
        if (samePassword) {
            return res.status(400).json(errorResponse("New password must be different from current password"));
        }

        // [4] Hash new password
        const hashedPassword = await hashPassword(newPassword, 10);

        // [5] Update password
        await prisma.user.update({
            where: { id: Number(currentUserId) },
            data: { password: hashedPassword }
        });

        // * [SUCCESS] Password updated
        info(`Admin password changed successfully for user id ${currentUserId}`);
        res.json(successResponse("Password updated successfully", null));

    } catch (err: unknown) {
        let errorMessage = "An unexpected error occurred while changing password";
        if (err instanceof Error) errorMessage = err.message;

        error(`Error changing admin password: ${errorMessage}`);
        res.status(500).json(errorResponse(errorMessage));
        next(err);
    }
});

// * [PUT] Update Current Admin Profile
// ? /api/admin/profile
router.put('/profile', verifyAdmin, async (req: Request, res: Response, next: NextFunction) => {
    const { email, firstName, lastName } = req.body;

    try {
        // [1] Fetch current user from middleware
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const currentUserId = (req as any).user?.userId;

        // ! [ERROR] Token/user missing
        if (!currentUserId) {
            return res.status(401).json(errorResponse("Unauthorized: No valid token provided"));
        }

        // [2] Fetch existing admin user
        const existingUser = await prisma.user.findUnique({
            where: { id: Number(currentUserId) },
            include: { admin: true }
        });

        // ! [ERROR] Admin profile not found
        if (!existingUser || existingUser.role !== 'ADMIN') {
            return res.status(404).json(errorResponse("Admin profile not found"));
        }

        // [3] Prepare update data only if values changed
        const updateData: Partial<{ email: string; firstName: string; lastName: string }> = {};

        if (email && email !== existingUser.email) updateData.email = email;
        if (firstName && firstName !== existingUser.firstName) updateData.firstName = firstName;
        if (lastName && lastName !== existingUser.lastName) updateData.lastName = lastName;

        // [4] Update admin user
        const updatedUser = await prisma.user.update({
            where: { id: Number(currentUserId) },
            data: updateData,
            include: { admin: true }
        });

        // [5] Remove password before sending response
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password: _, ...userWithoutPassword } = updatedUser;

        // [6] Prepare profile response
        const updatedProfile = {
            id: userWithoutPassword.id,
            email: userWithoutPassword.email,
            firstName: userWithoutPassword.firstName,
            lastName: userWithoutPassword.lastName,
            name: `${userWithoutPassword.firstName} ${userWithoutPassword.lastName}`,
            role: userWithoutPassword.role,
            isActive: userWithoutPassword.isActive,
            admin: userWithoutPassword.admin
        };

        // * [SUCCESS] Admin profile updated
        info(`Admin profile updated successfully for user id ${currentUserId}`);
        res.json(successResponse("Admin profile updated successfully", updatedProfile));

    } catch (err: unknown) {
        let errorMessage = "An unexpected error occurred while updating admin profile";
        if (err instanceof Error) errorMessage = err.message;

        error(`Error updating admin profile: ${errorMessage}`);
        res.status(500).json(errorResponse(errorMessage));
        next(err);
    }
});

// * [GET] Get All Admins
// ? /api/admin/
router.get('/', verifyAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
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

// * [GET] Get Single Admin
// ? /api/admin/:id
router.get('/:id', verifyAdmin, async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    try {
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

// * [POST] Create Admin
// ? /api/admin/
router.post('/', verifyAdmin, async (req: Request, res: Response, next: NextFunction) => {
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

// * [PUT] Update Admin
// ? /api/admin/:id
router.put('/:id', verifyAdmin, async (req: Request, res: Response, next: NextFunction) => {
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

        // ! [ERROR] Forward to global error handler
        next(err);
    }
});

// * [PATCH] Reactivate Admin
// ? /api/admin/:id/reactivate
router.patch('/:id/reactivate', verifyAdmin, async (req: Request, res: Response, next: NextFunction) => {
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

// * [PATCH] Soft delete all admins (except self)
// ? /api/admin/delete-all
router.patch('/delete-all', verifyAdmin, async (req, res, next) => {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const currentUserId = (req as any).user?.userId;

        const result = await prisma.user.updateMany({
            where: {
                role: 'ADMIN',
                id: { not: currentUserId }
            },
            data: { isActive: false }
        });

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

// * [DELETE] Delete Admin (Soft Delete)
// ? /api/admin/:id
router.delete('/:id', verifyAdmin, async (req: Request, res: Response, next: NextFunction) => {
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

        // * [SUCCESS] Admin soft-deleted successfully
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

        // ! [ERROR] Forward to global error handler
        next(err);
    }
});

// * [DELETE] Hard Delete Admin
// ? /api/admin/:id/hard
router.delete('/:id/hard', verifyAdmin, async (req: Request, res: Response, next: NextFunction) => {
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

export const adminRoutes = router;