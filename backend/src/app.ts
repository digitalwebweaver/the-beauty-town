import path from 'path';
import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { env, isProd } from '@/config/env';
import { corsOptions } from '@/config/cors';
import { logger } from '@/config/logger';
import { pool } from '@/config/db';
import { globalLimiter } from '@/middlewares/rateLimiter';
import { errorHandler, notFound } from '@/middlewares/error';

import authRoutes from '@/api/auth/auth.routes';
import servicesRoutes from '@/api/services/services.routes';
import packagesRoutes from '@/api/packages/packages.routes';
import staffRoutes from '@/api/staff/staff.routes';
import appointmentsRoutes from '@/api/appointments/appointments.routes';
// TODO: src/api/uploads/uploads.routes.ts does not exist in the repo. Each
// domain route handles its own uploads via middlewares/upload.ts, so no
// caller depends on this. Restore when the module is added.
// import uploadsRoutes from '@/api/uploads/uploads.routes';
import usersRoutes from '@/api/users/users.routes';
import reviewsRoutes from '@/api/reviews/reviews.routes';
import productsRoutes from '@/api/products/products.routes';
import salesRoutes from '@/api/sales/sales.routes';
import settingsRoutes from '@/api/settings/settings.routes';
import couponsRoutes from '@/api/coupons/coupons.routes';
import couponDesignRoutes from '@/api/coupon-design/coupon-design.routes';
import analyticsRoutes from '@/api/analytics/analytics.routes';
import contactRoutes from '@/api/contact/contact.routes';
import holidaysRoutes from '@/api/holidays/holidays.routes';
import pushRoutes from '@/api/push/push.routes';

export function createApp(): Express {
  const app = express();

  // Trust the first proxy (needed for correct req.ip behind nginx / Vercel)
  app.set('trust proxy', 1);

  // Security & core middleware
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );
  app.use(cors(corsOptions));
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());

  app.use(
    morgan(isProd ? 'combined' : 'dev', {
      stream: { write: (msg) => logger.http?.(msg.trim()) ?? logger.info(msg.trim()) },
    })
  );

  // Static: serve uploaded images
  const uploadDir = path.resolve(process.cwd(), env.UPLOAD_DIR);
  app.use('/uploads', express.static(uploadDir, { maxAge: isProd ? '30d' : 0 }));

  // Global API rate limit
  app.use('/api', globalLimiter);

  // Health — actually checks the DB, not just "the process is alive". A
  // static 200 here would keep an orchestrator routing traffic to an
  // instance whose DB pool has died/exhausted, defeating the point of a
  // health check.
  app.get('/api/health', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ success: true, data: { status: 'ok', time: new Date().toISOString() } });
    } catch (err) {
      logger.error('Health check failed — DB unreachable', { err });
      res.status(503).json({
        success: false,
        data: { status: 'db_unreachable', time: new Date().toISOString() },
      });
    }
  });

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/services', servicesRoutes);
  app.use('/api/packages', packagesRoutes);
  app.use('/api/staff', staffRoutes);
  app.use('/api/appointments', appointmentsRoutes);
  app.use('/api/reviews', reviewsRoutes);
  app.use('/api/products', productsRoutes);
  app.use('/api/sales', salesRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/coupons', couponsRoutes);
  app.use('/api/coupon-design', couponDesignRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/contact', contactRoutes);
  app.use('/api/holidays', holidaysRoutes);
  app.use('/api/push', pushRoutes);
  // app.use('/api/uploads', uploadsRoutes); // see TODO near the import above

  // 404 + error handler MUST be last
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
