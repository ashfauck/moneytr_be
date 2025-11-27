import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { ResponseUtils } from '../utils/helpers';
import logger from '../utils/logger';

const router = Router();

/**
 * Interface for Kite Connect Postback Payload
 */
interface KitePostbackPayload {
  user_id: string;
  unfilled_quantity: number;
  app_id: number;
  checksum: string;
  placed_by: string;
  order_id: string;
  exchange_order_id: string | null;
  parent_order_id: string | null;
  status: 'COMPLETE' | 'REJECTED' | 'CANCELLED' | 'UPDATE';
  status_message: string | null;
  status_message_raw: string | null;
  order_timestamp: string;
  exchange_update_timestamp: string;
  exchange_timestamp: string;
  variety: string;
  exchange: string;
  tradingsymbol: string;
  instrument_token: number;
  order_type: string;
  transaction_type: 'BUY' | 'SELL';
  validity: string;
  product: string;
  quantity: number;
  disclosed_quantity: number;
  price: number;
  trigger_price: number;
  average_price: number;
  filled_quantity: number;
  pending_quantity: number;
  cancelled_quantity: number;
  market_protection: number;
  meta: Record<string, any>;
  tag: string | null;
  guid: string;
}

/**
 * Verify Kite Connect Postback Checksum
 * Checksum = SHA-256(order_id + order_timestamp + api_secret)
 */
function verifyChecksum(orderId: string, orderTimestamp: string, checksum: string): boolean {
  // Get Kite API Secret from environment
  const apiSecret = process.env.KITE_API_SECRET;

  if (!apiSecret) {
    logger.error('Kite API Secret not configured');
    return false;
  }

  // Compute expected checksum
  const data = orderId + orderTimestamp + apiSecret;
  const expectedChecksum = crypto.createHash('sha256').update(data).digest('hex');

  // Compare checksums (constant-time comparison to prevent timing attacks)
  return crypto.timingSafeEqual(
    Buffer.from(checksum, 'hex'),
    Buffer.from(expectedChecksum, 'hex'),
  );
}

/**
 * Kite Connect Postback Webhook
 * POST /api/kite/postback
 * 
 * Receives order status updates from Kite Connect
 * This endpoint should be configured in your Kite Connect app settings
 * 
 * Postback URL: https://yourdomain.com/api/kite/postback
 */
router.post('/postback', async (req: Request, res: Response): Promise<void> => {
  try {
    const payload: KitePostbackPayload = req.body;

    // Log the incoming postback
    logger.info('Kite Connect postback received', {
      order_id: payload.order_id,
      user_id: payload.user_id,
      status: payload.status,
      tradingsymbol: payload.tradingsymbol,
    });

    // Verify checksum to ensure authenticity
    const isValid = verifyChecksum(
      payload.order_id,
      payload.order_timestamp,
      payload.checksum,
    );

    if (!isValid) {
      logger.error('Invalid checksum in Kite postback', {
        order_id: payload.order_id,
        checksum: payload.checksum,
      });

      res.status(401).json(
        ResponseUtils.error('INVALID_CHECKSUM', 'Postback authentication failed'),
      );
      return;
    }

    // Process the order update based on status
    switch (payload.status) {
      case 'COMPLETE':
        await handleOrderComplete(payload);
        break;

      case 'CANCELLED':
        await handleOrderCancelled(payload);
        break;

      case 'REJECTED':
        await handleOrderRejected(payload);
        break;

      case 'UPDATE':
        await handleOrderUpdate(payload);
        break;

      default:
        logger.warn('Unknown order status in postback', { status: payload.status });
    }

    // Acknowledge receipt
    res.json(
      ResponseUtils.success({
        message: 'Postback received and processed',
        order_id: payload.order_id,
      }),
    );
  } catch (error) {
    logger.error('Error processing Kite postback:', error);
    res.status(500).json(ResponseUtils.error('POSTBACK_ERROR', 'Failed to process postback'));
  }
});

/**
 * Handle completed orders
 */
async function handleOrderComplete(payload: KitePostbackPayload): Promise<void> {
  logger.info('Order completed', {
    order_id: payload.order_id,
    user_id: payload.user_id,
    tradingsymbol: payload.tradingsymbol,
    quantity: payload.quantity,
    filled_quantity: payload.filled_quantity,
    average_price: payload.average_price,
    transaction_type: payload.transaction_type,
  });

  // TODO: Implement your business logic here:
  // 1. Update order status in your database
  // 2. Update user's portfolio/positions
  // 3. Calculate P&L if applicable
  // 4. Send push notification to user about order completion
  // 5. Trigger any post-trade workflows
  // 6. Update trading analytics/statistics

  // Example database update (pseudo-code):
  // await db.order.update({
  //   where: { kiteOrderId: payload.order_id },
  //   data: {
  //     status: 'COMPLETE',
  //     filledQuantity: payload.filled_quantity,
  //     averagePrice: payload.average_price,
  //     completedAt: new Date(payload.exchange_update_timestamp),
  //   },
  // });
}

/**
 * Handle cancelled orders
 */
async function handleOrderCancelled(payload: KitePostbackPayload): Promise<void> {
  logger.info('Order cancelled', {
    order_id: payload.order_id,
    user_id: payload.user_id,
    tradingsymbol: payload.tradingsymbol,
    cancelled_quantity: payload.cancelled_quantity,
  });

  // TODO: Implement your business logic here:
  // 1. Update order status to CANCELLED
  // 2. Send notification to user
  // 3. Free up any reserved funds/margins
}

/**
 * Handle rejected orders
 */
async function handleOrderRejected(payload: KitePostbackPayload): Promise<void> {
  logger.error('Order rejected', {
    order_id: payload.order_id,
    user_id: payload.user_id,
    tradingsymbol: payload.tradingsymbol,
    status_message: payload.status_message,
    status_message_raw: payload.status_message_raw,
  });

  // TODO: Implement your business logic here:
  // 1. Update order status to REJECTED
  // 2. Send notification to user with rejection reason
  // 3. Log rejection for analysis
}

/**
 * Handle order updates (modifications or partial fills)
 */
async function handleOrderUpdate(payload: KitePostbackPayload): Promise<void> {
  logger.info('Order updated', {
    order_id: payload.order_id,
    user_id: payload.user_id,
    tradingsymbol: payload.tradingsymbol,
    filled_quantity: payload.filled_quantity,
    pending_quantity: payload.pending_quantity,
  });

  // TODO: Implement your business logic here:
  // 1. Update order details (partial fills, modifications)
  // 2. If partial fill, send notification about partial execution
  // 3. Update position if partial execution occurred
}

/**
 * Test endpoint to verify postback configuration
 * GET /api/kite/postback/test
 */
router.get('/postback/test', (_req: Request, res: Response): void => {
  const hasApiSecret = !!process.env.KITE_API_SECRET;

  res.json(
    ResponseUtils.success({
      message: 'Kite Connect postback endpoint is active',
      configured: hasApiSecret,
      postback_url: '/api/kite/postback',
      note: hasApiSecret
        ? 'API secret is configured'
        : 'Warning: KITE_API_SECRET is not configured',
    }),
  );
});

export default router;
