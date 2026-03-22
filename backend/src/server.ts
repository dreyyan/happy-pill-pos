import 'dotenv/config';
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { prisma } from './../lib/prisma';

const app: Express = express();

// [MIDDLEWARE] CORS and JSON parsing
app.use(express.json());
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

// [MIDDLEWARE] Request Logging
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  console.log(req.body);
  next();
});

// [ROUTES]
// import authRoutes from './routes/auth';
// app.use('/api/auth', authRoutes);

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