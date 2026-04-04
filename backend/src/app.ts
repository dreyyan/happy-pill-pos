// [IMPORT]
import 'dotenv/config';
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { prisma } from './lib/prisma';

// [IMPORT] Routes
import { authRoutes } from './routes/auth';
import { itemRoutes } from './routes/item';
import { adminRoutes } from './routes/admin';
import { cashierRoutes } from './routes/cashier/index';
import { inventoryRoutes } from './routes/inventory';
import { transactionRoutes } from './routes/transactions';
import { reportsRoutes } from './routes/reports';
import { categoryRoutes } from './routes/categories';
import { subcategoryRoutes } from './routes/subcategories';
import { orderRoutes } from './routes/orders';
import { customerRoutes } from './routes/admin/customers';

const app: Express = express();

// [MIDDLEWARE] CORS
app.use(cors({
    origin: [
      "http://192.168.1.33:5173",
      "http://192.168.1.38:5173",
      "http://192.168.56.1:5173",
      "http://localhost:5173"
    ],
  credentials: true,
}));

// [MIDDLEWARE] JSON parsing
app.use(express.json());

// [MIDDLEWARE] Request Logging
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  console.log(req.body);
  next();
});

// [ROUTES] Main
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/cashier', cashierRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/subcategories', subcategoryRoutes);

// [MIDDLEWARE] 404 Not Found
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// [MIDDLEWARE] Error Handling
interface AppError extends Error {
  status?: number;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: AppError, req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Something went wrong' });
});

export { app, prisma };