// [IMPORT] Setup
import { Router } from 'express';

// [IMPORT] Routes
import { profileRoutes } from './profile';
import { passwordRoutes } from './password';
import { userRoutes } from './users';
import { importRoutes } from './import';
import { dashboardRoutes } from './dashboard';
import { configRoutes } from './config';

const router = Router();

// * Sub-routes
router.use('/profile', profileRoutes);
router.use('/change-password', passwordRoutes);
router.use('/users', userRoutes);
router.use('/import-users', importRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/config', configRoutes);

export const adminRoutes = router;