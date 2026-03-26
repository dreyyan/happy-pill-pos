// [IMPORT] Setup
import { Router } from 'express';

// [IMPORT] Routes
import adminRouter from './admin';
import cashierRouter from './cashier';

const router = Router();

// * Sub-routes
router.use('/admin', adminRouter);
router.use('/cashier', cashierRouter);

export const authRoutes = router;