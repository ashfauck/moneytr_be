import { Router, Response } from 'express';
import { ResponseUtils } from '../utils/helpers';
import logger from '../utils/logger';
import { authenticateToken } from '../middleware/auth';
import { AuthRequest } from '../types';
import { KiteApiLogger } from '../services/kiteApiLogger';
import db from '../services/database';

const router = Router();

/**
 * Get Kite API Logs
 * GET /api/kite/logs
 * 
 * Retrieve all API request/response logs for auditing
 */
router.get('/logs', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { endpoint, status, limit, startDate, endDate } = req.query;

    const logs = await KiteApiLogger.getUserLogs(userId, {
      endpoint: endpoint as string,
      status: status as any,
      limit: limit ? parseInt(limit as string) : 100,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    });

    res.json(ResponseUtils.success({ logs, count: logs.length }));
  } catch (error) {
    logger.error('Error fetching Kite API logs:', error);
    res.status(500).json(ResponseUtils.error('LOGS_ERROR', 'Failed to fetch API logs'));
  }
});

/**
 * Get Kite API Statistics
 * GET /api/kite/logs/stats
 * 
 * Get aggregated statistics about API usage
 */
router.get('/logs/stats', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { period } = req.query;

    const stats = await KiteApiLogger.getUserStats(userId, period as any || 'day');

    res.json(ResponseUtils.success(stats));
  } catch (error) {
    logger.error('Error fetching Kite API stats:', error);
    res.status(500).json(ResponseUtils.error('STATS_ERROR', 'Failed to fetch API statistics'));
  }
});

/**
 * Get Order Mirrors
 * GET /api/kite/order-mirrors
 * 
 * Get all orders stored in database before/after sending to Kite
 */
router.get('/order-mirrors', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { status, limit, startDate, endDate } = req.query;

    const where: any = { userId };

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate as string);
      }
    }

    const orders = await db.kiteOrderMirror.findMany({
      where,
      take: limit ? parseInt(limit as string) : 100,
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(ResponseUtils.success({ orders, count: orders.length }));
  } catch (error) {
    logger.error('Error fetching order mirrors:', error);
    res.status(500).json(ResponseUtils.error('MIRRORS_ERROR', 'Failed to fetch order mirrors'));
  }
});

/**
 * Get Position Mirrors
 * GET /api/kite/position-mirrors
 * 
 * Get all positions fetched from Kite and stored in database
 */
router.get('/position-mirrors', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const positions = await db.kitePositionMirror.findMany({
      where: { userId },
      orderBy: {
        fetchedAt: 'desc',
      },
    });

    res.json(ResponseUtils.success({ positions, count: positions.length }));
  } catch (error) {
    logger.error('Error fetching position mirrors:', error);
    res.status(500).json(ResponseUtils.error('MIRRORS_ERROR', 'Failed to fetch position mirrors'));
  }
});

/**
 * Get Holding Mirrors
 * GET /api/kite/holding-mirrors
 * 
 * Get all holdings fetched from Kite and stored in database
 */
router.get('/holding-mirrors', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const holdings = await db.kiteHoldingMirror.findMany({
      where: { userId },
      orderBy: {
        fetchedAt: 'desc',
      },
    });

    res.json(ResponseUtils.success({ holdings, count: holdings.length }));
  } catch (error) {
    logger.error('Error fetching holding mirrors:', error);
    res.status(500).json(ResponseUtils.error('MIRRORS_ERROR', 'Failed to fetch holding mirrors'));
  }
});

/**
 * Get specific order mirror details
 * GET /api/kite/order-mirrors/:id
 */
router.get('/order-mirrors/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const order = await db.kiteOrderMirror.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!order) {
      res.status(404).json(ResponseUtils.error('NOT_FOUND', 'Order mirror not found'));
      return;
    }

    res.json(ResponseUtils.success({ order }));
  } catch (error) {
    logger.error('Error fetching order mirror:', error);
    res.status(500).json(ResponseUtils.error('MIRROR_ERROR', 'Failed to fetch order mirror'));
  }
});

/**
 * Get Kite connection status
 * GET /api/kite/connection
 */
router.get('/connection', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const connection = await db.kiteConnection.findUnique({
      where: { userId },
      select: {
        id: true,
        kiteUserId: true,
        kiteUserName: true,
        isActive: true,
        connectedAt: true,
        lastUsedAt: true,
        expiresAt: true,
      },
    });

    res.json(ResponseUtils.success({
      connected: !!connection && connection.isActive,
      connection,
    }));
  } catch (error) {
    logger.error('Error fetching Kite connection:', error);
    res.status(500).json(ResponseUtils.error('CONNECTION_ERROR', 'Failed to fetch connection status'));
  }
});

/**
 * Disconnect Kite account
 * DELETE /api/kite/connection
 */
router.delete('/connection', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    await db.kiteConnection.updateMany({
      where: { userId },
      data: {
        isActive: false,
      },
    });

    logger.info('Kite connection deactivated', { userId });

    res.json(ResponseUtils.success({
      message: 'Kite account disconnected successfully',
    }));
  } catch (error) {
    logger.error('Error disconnecting Kite:', error);
    res.status(500).json(ResponseUtils.error('DISCONNECT_ERROR', 'Failed to disconnect'));
  }
});

export default router;
