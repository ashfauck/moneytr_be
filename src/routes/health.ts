import { Router, Request, Response } from 'express';
import { testDatabaseConnection } from '../services/database';
import { ResponseUtils } from '../utils/helpers';

const router = Router();

/**
 * Basic health check
 * GET /health
 */
router.get('/', (_req: Request, res: Response) => {
  res.status(200).json(
    ResponseUtils.success(
      {
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      },
      'Service is healthy',
    ),
  );
});

/**
 * Database health check
 * GET /health/db
 */
router.get('/db', async (_req: Request, res: Response) => {
  try {
    const isConnected = await testDatabaseConnection();

    if (isConnected) {
      res.status(200).json(
        ResponseUtils.success(
          {
            status: 'healthy',
            database: 'connected',
          },
          'Database is healthy',
        ),
      );
    } else {
      res.status(503).json(
        ResponseUtils.error('DATABASE_ERROR', 'Database connection failed'),
      );
    }
  } catch (error) {
    res.status(503).json(
      ResponseUtils.error('DATABASE_ERROR', 'Database health check failed'),
    );
  }
});

export default router;
