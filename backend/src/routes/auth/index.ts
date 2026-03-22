// src/routes/auth/index.ts
import { Router } from 'express';
import adminRouter from './admin';

const router = Router();

router.use('/admin', adminRouter);

export const adminRoutes = router;