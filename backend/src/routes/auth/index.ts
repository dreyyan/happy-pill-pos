import { Router } from 'express';
import adminRouter from './admin';
import cashierRouter from './cashier';

const router = Router();

router.use('/admin', adminRouter);
router.use('/cashier', cashierRouter);

export const authRoutes = router;