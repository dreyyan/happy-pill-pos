// [IMPORT] Setup
import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';

// [IMPORT] Helpers
import { successResponse, errorResponse } from '../../utils/response';
import { error, info } from '../../utils/logger';
import { verifyToken } from '../../utils/auth';

// [IMPORT] Middleware
import { verifyRole } from '../../middleware/authMiddleware';

const router = Router();

// * [GET] Fetch Admin Config (First-time Setup)
// ? /api/admin/config/first-time
router.get('/first-time', async (req, res) => {
  const adminConfig = await prisma.adminConfig.findFirst();
  
  if (!adminConfig) {
    // No config → first-time setup
    return res.json(successResponse("No admin config found", null));
  }

  // Config exists → return all info needed for frontend (without auth)
  return res.json(successResponse("Config exists", {
    exists: true,
    businessName: adminConfig.businessName,
    themeColor: adminConfig.themeColor,
    logo: adminConfig.logo
  }));
});

// * [GET] Fetch Current Admin Config
// ? /api/admin/config
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const adminConfig = await prisma.adminConfig.findFirst({
      include: { admin: true },
    });

    // ! [FIRST-TIME SETUP] No config → allow onboarding
    if (!adminConfig) {
      return res.json(successResponse("No admin config found", null));
    }

    // [1] Get token from headers
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json(errorResponse("Unauthorized: No token provided"));
    }

    const token = authHeader.split(" ")[1];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const decoded: any = verifyToken(token);
    const currentUserId = decoded?.userId;

    if (!currentUserId || currentUserId !== adminConfig.adminId) {
      return res.status(401).json(errorResponse("Unauthorized: Invalid token"));
    }

    // * [SUCCESS] Config fetched
    info(`Admin config fetched for user id ${currentUserId}`);
    res.json(successResponse("[SUCCESS] Admin config fetched successfully", adminConfig));
  } catch (err: unknown) {
    let errorMessage = "An unexpected error occurred while fetching admin config";
    if (err instanceof Error) errorMessage = err.message;

    error(`Error fetching admin config: ${errorMessage}`);
    res.status(500).json(errorResponse(errorMessage));
    next(err);
  }
});

// * [POST] Create or Update Admin Config
// ? /api/admin/config
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { businessName, themeColor, logo } = req.body;

    // [1] Check if admin config exists
    const existingConfig = await prisma.adminConfig.findFirst();

    // [2] First-time setup → create config without token
    if (!existingConfig) {
      // Get any existing admin or create default
      const admin = await prisma.admin.findFirst();

      if (!admin) {
        return res.status(400).json(errorResponse("Cannot create config: No admin exists"));
      }

      // Create new config
      const newConfig = await prisma.adminConfig.create({
        data: {
          adminId: admin.id,
          businessName,
          themeColor,
          logo,
        },
      });

      info(`Admin config created for user id ${admin.id}`);
      return res.json(successResponse("Admin config created successfully", newConfig));
    }

    // [3] If config exists → require token auth
    // Use verifyRole middleware logic manually to allow token check here
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json(errorResponse("Unauthorized: No token provided"));
    }

    const token = authHeader.split(" ")[1];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const decoded: any = verifyToken(token);
    const currentUserId = decoded?.userId;

    if (!currentUserId || currentUserId !== existingConfig.adminId) {
      return res.status(401).json(errorResponse("Unauthorized: Invalid token"));
    }

    // [4] Update config
    const updatedConfig = await prisma.adminConfig.update({
      where: { adminId: currentUserId },
      data: { businessName, themeColor, logo },
    });

    info(`Admin config updated for user id ${currentUserId}`);
    res.json(successResponse("Admin config updated successfully", updatedConfig));
  } catch (err: unknown) {
    let errorMessage = "An unexpected error occurred while saving admin config";
    if (err instanceof Error) errorMessage = err.message;

    error(`Error saving admin config: ${errorMessage}`);
    res.status(500).json(errorResponse(errorMessage));
    next(err);
  }
});

// * [PUT] Update Admin Config
// ? /api/admin/config
router.put('/', verifyRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
    const { themeColor, logo } = req.body;

    try {
        // [1] Get current admin user ID from middleware
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const currentUserId = (req as any).user?.userId;

        // ! [ERROR] No token/user
        if (!currentUserId) {
            return res.status(401).json(errorResponse("Unauthorized: No valid token provided"));
        }

        // [2] Fetch existing config
        const existingConfig = await prisma.adminConfig.findUnique({
            where: { adminId: Number(currentUserId) }
        });

        // ! [ERROR] Config not found
        if (!existingConfig) {
            return res.status(404).json(errorResponse("Admin configuration not found"));
        }

        // [3] Prepare update data only if values changed
        const updateData: Partial<{ themeColor: string; logo: string }> = {};

        if (themeColor && themeColor !== existingConfig.themeColor) updateData.themeColor = themeColor;
        if (logo && logo !== existingConfig.logo) updateData.logo = logo;

        // [4] Update admin config
        const updatedConfig = await prisma.adminConfig.update({
            where: { adminId: Number(currentUserId) },
            data: updateData
        });

        // * [SUCCESS] Config updated
        info(`Admin config updated for user id ${currentUserId}`);
        res.json(successResponse("Admin configuration updated successfully", updatedConfig));

    } catch (err: unknown) {
        let errorMessage = "An unexpected error occurred while updating admin config";
        if (err instanceof Error) errorMessage = err.message;

        error(`Error updating admin config: ${errorMessage}`);
        res.status(500).json(errorResponse(errorMessage));
        next(err);
    }
});

// * [DELETE] Delete all admin configs
// ? /api/admin/config
router.delete('/', verifyRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentUserId = (req as any).user?.userId;

    if (!currentUserId) {
      return res.status(401).json(errorResponse("Unauthorized: No valid token provided"));
    }

    // Delete all admin configs
    const deletedConfigs = await prisma.adminConfig.deleteMany({});

    info(`All admin configs deleted by user id ${currentUserId}`);
    res.json(successResponse(`Deleted ${deletedConfigs.count} admin config(s) successfully`, null));
  } catch (err: unknown) {
    let errorMessage = "An unexpected error occurred while deleting admin configs";
    if (err instanceof Error) errorMessage = err.message;

    error(`Error deleting admin configs: ${errorMessage}`);
    res.status(500).json(errorResponse(errorMessage));
    next(err);
  }
});

export const configRoutes = router;