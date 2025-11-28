import { Router } from 'express';
import { TradingController } from '../controllers/tradingController';
import { authenticateToken, requireVerified } from '../middleware/auth';
import { handleValidationErrors } from '../middleware/validation';
import { body, query } from 'express-validator';

const router = Router();

// All trading routes require authentication
router.use(authenticateToken);
router.use(requireVerified);

/**
 * Get AI Trading Signals
 * GET /api/trading/signals
 */
router.get(
  '/signals',
  query('symbol').optional().isString(),
  query('timeframe').optional().isIn(['1m', '5m', '15m', '1h', '1d']),
  handleValidationErrors,
  TradingController.getSignals,
);

/**
 * Get Trading Mode Settings
 * GET /api/trading/mode
 */
router.get('/mode', TradingController.getTradingMode);

/**
 * Update Trading Mode
 * PUT /api/trading/mode
 */
router.put(
  '/mode',
  body('tradingMode').isIn(['SUGGEST_ONLY', 'AUTO_TRADE', 'DISABLED']),
  body('autoTradeEnabled').optional().isBoolean(),
  handleValidationErrors,
  TradingController.updateTradingMode,
);

/**
 * Update Risk Settings
 * PUT /api/trading/risk-settings
 */
router.put(
  '/risk-settings',
  body('maxDailyLoss').optional().isFloat({ min: 0 }),
  body('maxPositionSize').optional().isFloat({ min: 0 }),
  body('riskPerTrade').optional().isFloat({ min: 0, max: 100 }),
  body('stopLossPercent').optional().isFloat({ min: 0, max: 100 }),
  body('takeProfitPercent').optional().isFloat({ min: 0 }),
  handleValidationErrors,
  TradingController.updateRiskSettings,
);

/**
 * Get Active Positions
 * GET /api/trading/positions
 */
router.get('/positions', TradingController.getPositions);

/**
 * Get Order History
 * GET /api/trading/orders
 */
router.get(
  '/orders',
  query('status').optional().isIn(['PENDING', 'COMPLETE', 'CANCELLED', 'REJECTED']),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  handleValidationErrors,
  TradingController.getOrders,
);

/**
 * Get Trade Analytics
 * GET /api/trading/analytics
 */
router.get(
  '/analytics',
  query('period').optional().isIn(['7d', '30d', '90d', '1y']),
  handleValidationErrors,
  TradingController.getAnalytics,
);

/**
 * Execute Trade
 * POST /api/trading/execute
 */
router.post(
  '/execute',
  body('symbol').isString().notEmpty(),
  body('action').isIn(['BUY', 'SELL']),
  body('quantity').isInt({ min: 1 }),
  body('orderType').isIn(['MARKET', 'LIMIT', 'SL', 'SL-M']),
  body('price').optional().isFloat({ min: 0 }),
  body('stopLoss').optional().isFloat({ min: 0 }),
  body('takeProfit').optional().isFloat({ min: 0 }),
  body('aiSignalId').optional().isString(),
  handleValidationErrors,
  TradingController.executeTrade,
);

/**
 * Place Order (Direct Kite Connect)
 * POST /api/trading/place-order
 */
router.post(
  '/place-order',
  body('exchange').isString().notEmpty(),
  body('tradingsymbol').isString().notEmpty(),
  body('transaction_type').isIn(['BUY', 'SELL']),
  body('quantity').isInt({ min: 1 }),
  body('order_type').isIn(['MARKET', 'LIMIT', 'SL', 'SL-M']),
  body('product').isIn(['CNC', 'MIS', 'NRML']),
  body('price').optional().isFloat({ min: 0 }),
  body('trigger_price').optional().isFloat({ min: 0 }),
  handleValidationErrors,
  TradingController.placeOrder,
);

/**
 * Cancel Order
 * DELETE /api/trading/cancel-order/:orderId
 */
router.delete('/cancel-order/:orderId', TradingController.cancelOrder);

/**
 * Get Account Info
 * GET /api/trading/account-info
 */
router.get('/account-info', TradingController.getAccountInfo);

export default router;
