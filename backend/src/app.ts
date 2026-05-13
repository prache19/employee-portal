import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.routes.js';
import employeesRoutes from './routes/employees.routes.js';
import payslipsRoutes from './routes/payslips.routes.js';
import assetsRoutes from './routes/assets.routes.js';
import { errorHandler } from './middleware/error.js';
import { env } from './config/env.js';

export function createApp() {
  const app = express();
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(',').map((s) => s.trim()),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  app.use('/api/auth', authRoutes);
  app.use('/api/employees', employeesRoutes);
  app.use('/api/payslips', payslipsRoutes);
  app.use('/api/assets', assetsRoutes);

  app.use(errorHandler);
  return app;
}
