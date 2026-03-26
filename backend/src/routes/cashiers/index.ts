// [IMPORT] Setup
import { Router } from 'express';

// [IMPORT] Routes
import { profileRoutes } from './profile';
import { passwordRoutes } from './password';
import { dashboardRoutes } from './dashboard';

const router = Router();

// * Sub-routes
router.use('/profile', profileRoutes);
router.use('/change-password', passwordRoutes);
router.use('/dashboard', dashboardRoutes);

export const cashierRoutes = router;