import { Router } from 'express';
import adminRouter from './admin';

const router = Router();

router.use('/admin', adminRouter);

export const authRoutes = router;