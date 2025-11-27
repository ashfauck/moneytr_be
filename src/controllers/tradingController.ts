import { Response } from 'express';
import { ResponseUtils } from '../utils/helpers';
import logger from '../utils/logger';
import { AuthRequest } from '../types';
import db from '../services/database';

export class TradingController {
  /**
   * Get AI Trading Signals
   * GET /api/trading/signals
   */
  static async getSignals(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { symbol, timeframe } = req.query;

      logger.info('Fetching AI trading signals', { userId, symbol, timeframe });

      // TODO: Implement AI signal generation
      // This will call your AI model service
      
      res.json(
        ResponseUtils.success({
          signals: [],
          message: 'AI signal generation not yet implemented',
        }),
      );
    } catch (error) {
      logger.error('Error fetching signals:', error);
      res.status(500).json(ResponseUtils.error('SIGNAL_ERROR', 'Failed to fetch signals'));
    }
  }

  /**
   * Get Trading Mode
   * GET /api/trading/mode
   */
  static async getTradingMode(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;

      const settings = await db.tradingSettings.findUnique({
        where: { userId },
        select: {
          tradingMode: true,
          autoTradeEnabled: true,
          maxDailyLoss: true,
          maxPositionSize: true,
          riskPerTrade: true,
        },
      });

      if (!settings) {
        res.status(404).json(ResponseUtils.error('SETTINGS_NOT_FOUND', 'Trading settings not configured'));
        return;
      }

      res.json(ResponseUtils.success(settings));
    } catch (error) {
      logger.error('Error fetching trading mode:', error);
      res.status(500).json(ResponseUtils.error('MODE_ERROR', 'Failed to fetch trading mode'));
    }
  }

  /**
   * Update Trading Mode
   * PUT /api/trading/mode
   */
  static async updateTradingMode(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { tradingMode, autoTradeEnabled } = req.body;

      const updated = await db.tradingSettings.upsert({
        where: { userId },
        create: {
          userId,
          tradingMode,
          autoTradeEnabled: autoTradeEnabled ?? false,
        },
        update: {
          tradingMode,
          autoTradeEnabled,
          updatedAt: new Date(),
        },
      });

      logger.info('Trading mode updated', { userId, tradingMode, autoTradeEnabled });

      res.json(
        ResponseUtils.success({
          message: 'Trading mode updated successfully',
          settings: updated,
        }),
      );
    } catch (error) {
      logger.error('Error updating trading mode:', error);
      res.status(500).json(ResponseUtils.error('UPDATE_ERROR', 'Failed to update trading mode'));
    }
  }

  /**
   * Update Risk Settings
   * PUT /api/trading/risk-settings
   */
  static async updateRiskSettings(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { maxDailyLoss, maxPositionSize, riskPerTrade, stopLossPercent, takeProfitPercent } =
        req.body;

      const updated = await db.tradingSettings.upsert({
        where: { userId },
        create: {
          userId,
          maxDailyLoss,
          maxPositionSize,
          riskPerTrade,
          stopLossPercent,
          takeProfitPercent,
        },
        update: {
          maxDailyLoss,
          maxPositionSize,
          riskPerTrade,
          stopLossPercent,
          takeProfitPercent,
          updatedAt: new Date(),
        },
      });

      logger.info('Risk settings updated', { userId });

      res.json(
        ResponseUtils.success({
          message: 'Risk settings updated successfully',
          settings: updated,
        }),
      );
    } catch (error) {
      logger.error('Error updating risk settings:', error);
      res.status(500).json(ResponseUtils.error('UPDATE_ERROR', 'Failed to update risk settings'));
    }
  }

  /**
   * Get Active Positions
   * GET /api/trading/positions
   */
  static async getPositions(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;

      const positions = await db.position.findMany({
        where: {
          userId,
          status: 'OPEN',
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      res.json(ResponseUtils.success({ positions }));
    } catch (error) {
      logger.error('Error fetching positions:', error);
      res.status(500).json(ResponseUtils.error('POSITIONS_ERROR', 'Failed to fetch positions'));
    }
  }

  /**
   * Get Order History
   * GET /api/trading/orders
   */
  static async getOrders(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { status, limit = 50 } = req.query;

      const where: any = { userId };
      if (status) {
        where.status = status;
      }

      const orders = await db.order.findMany({
        where,
        take: Number(limit),
        orderBy: {
          createdAt: 'desc',
        },
      });

      res.json(ResponseUtils.success({ orders, count: orders.length }));
    } catch (error) {
      logger.error('Error fetching orders:', error);
      res.status(500).json(ResponseUtils.error('ORDERS_ERROR', 'Failed to fetch orders'));
    }
  }

  /**
   * Get Trade Analytics
   * GET /api/trading/analytics
   */
  static async getAnalytics(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { period = '30d' } = req.query;

      // Calculate date range
      const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
      const days = daysMap[period as string] || 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get trade statistics
      const trades = await db.order.findMany({
        where: {
          userId,
          status: 'COMPLETE',
          createdAt: { gte: startDate },
        },
      });

      const totalTrades = trades.length;
      const profitableTrades = trades.filter((t) => (t.pnl ?? 0) > 0).length;
      const winRate = totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0;
      const totalPnl = trades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
      const avgPnl = totalTrades > 0 ? totalPnl / totalTrades : 0;

      res.json(
        ResponseUtils.success({
          period,
          totalTrades,
          profitableTrades,
          losingTrades: totalTrades - profitableTrades,
          winRate: winRate.toFixed(2),
          totalPnl: totalPnl.toFixed(2),
          avgPnl: avgPnl.toFixed(2),
          bestTrade: trades.length > 0 ? Math.max(...trades.map((t) => t.pnl ?? 0)) : 0,
          worstTrade: trades.length > 0 ? Math.min(...trades.map((t) => t.pnl ?? 0)) : 0,
        }),
      );
    } catch (error) {
      logger.error('Error fetching analytics:', error);
      res.status(500).json(ResponseUtils.error('ANALYTICS_ERROR', 'Failed to fetch analytics'));
    }
  }

  /**
   * Execute Trade (Manual or AI-suggested)
   * POST /api/trading/execute
   */
  static async executeTrade(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { symbol, action, quantity, orderType, price, stopLoss, takeProfit, aiSignalId } =
        req.body;

      // Check trading mode and permissions
      const settings = await db.tradingSettings.findUnique({
        where: { userId },
      });

      if (!settings) {
        res.status(400).json(ResponseUtils.error('NO_SETTINGS', 'Trading settings not configured'));
        return;
      }

      // Validate risk limits
      const riskCheck = await validateRiskLimits(userId, quantity, price);
      if (!riskCheck.allowed) {
        res.status(400).json(ResponseUtils.error('RISK_LIMIT_EXCEEDED', riskCheck.reason || 'Risk limit exceeded'));
        return;
      }

      // TODO: Place order via Kite API
      // const order = await kiteService.placeOrder({ ... });

      // Log trade decision
      await db.tradeLog.create({
        data: {
          userId,
          symbol,
          action,
          quantity,
          orderType,
          price,
          stopLoss,
          takeProfit,
          aiSignalId,
          source: aiSignalId ? 'AI' : 'MANUAL',
          status: 'PENDING',
        },
      });

      logger.info('Trade execution initiated', { userId, symbol, action, quantity });

      res.json(
        ResponseUtils.success({
          message: 'Trade execution initiated',
          orderId: 'TEMP_ORDER_ID', // Replace with actual order ID from Kite
        }),
      );
    } catch (error) {
      logger.error('Error executing trade:', error);
      res.status(500).json(ResponseUtils.error('EXECUTION_ERROR', 'Failed to execute trade'));
    }
  }
}

/**
 * Validate risk limits before placing order
 */
async function validateRiskLimits(
  userId: string,
  quantity: number,
  price: number,
): Promise<{ allowed: boolean; reason?: string }> {
  const settings = await db.tradingSettings.findUnique({
    where: { userId },
  });

  if (!settings) {
    return { allowed: false, reason: 'Trading settings not found' };
  }

  // Check position size
  const positionValue = quantity * price;
  if (settings.maxPositionSize && positionValue > settings.maxPositionSize) {
    return {
      allowed: false,
      reason: `Position size exceeds limit of ${settings.maxPositionSize}`,
    };
  }

  // Check daily loss limit
  if (settings.maxDailyLoss) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayOrders = await db.order.findMany({
      where: {
        userId,
        createdAt: { gte: today },
      },
    });

    const todayLoss = todayOrders
      .filter((o) => (o.pnl ?? 0) < 0)
      .reduce((sum, o) => sum + Math.abs(o.pnl ?? 0), 0);

    if (todayLoss >= settings.maxDailyLoss) {
      return { allowed: false, reason: 'Daily loss limit reached' };
    }
  }

  return { allowed: true };
}
