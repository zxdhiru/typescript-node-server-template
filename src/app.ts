import express, { Application } from 'express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { helmetConfig, corsConfig } from '@/shared/middleware/security.middleware';
import { requestLogger } from '@/shared/middleware/request-logger.middleware';
import { errorHandler, notFoundHandler } from '@/shared/middleware/error-handler.middleware';
import { env } from '@/config/env.config';
import { database } from '@/infrastructure/database/connection';

/**
 * Express Application Configuration
 */
export function createApp(): Application {
  const app = express();

  // Security Middleware
  app.use(helmetConfig);
  app.use(corsConfig);

  // Body Parser
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // cookie parser
  app.use(cookieParser());
  // Compression
  app.use(compression());

  // Request Logging
  app.use(requestLogger);

  // Health Check with Database Status
  app.get('/health', async (_req, res) => {
    const dbHealth = await database.healthCheck();

    res.json({
      status: dbHealth ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: env.NODE_ENV,
      database: dbHealth ? 'connected' : 'disconnected',
    });
  });

  // API Routes
  // const apiPrefix = `/api/${env.API_VERSION}`;
  // app.use(`${apiPrefix}/patient`, patientRoutes);

  // 404 Handler
  app.use(notFoundHandler);

  // Global Error Handler (must be last)
  app.use(errorHandler);

  return app;
}
