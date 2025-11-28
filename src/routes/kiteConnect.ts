import { Router, Request, Response } from 'express';
import { ResponseUtils } from '../utils/helpers';
import logger from '../utils/logger';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * Kite Connect OAuth Redirect Handler
 * GET /api/kite/redirect
 *
 * This endpoint receives the callback from Kite Connect after user authorization.
 * You should configure this URL in your Kite Connect app settings.
 *
 * URL format: https://yourdomain.com/api/kite/redirect
 */
router.get('/redirect', async (req: Request, res: Response): Promise<void> => {
  try {
    const { request_token, status } = req.query;

    logger.info('Kite Connect redirect received', {
      request_token,
      status,
      query: req.query,
    });

    // Check if authorization was successful
    if (status === 'success' && request_token) {
      // Redirect to test interface with request_token
      const redirectUrl = `/test/?request_token=${request_token}&status=success`;
      res.redirect(redirectUrl);
    } else {
      // Authorization failed - redirect to test interface with error
      const redirectUrl = `/test/?status=error&message=authorization_failed`;
      res.redirect(redirectUrl);
    }
  } catch (error) {
    logger.error('Error handling Kite Connect redirect:', error);
    const redirectUrl = `/test/?status=error&message=redirect_error`;
    res.redirect(redirectUrl);
  }
});

/**
 * Process Kite Connect Authentication
 * POST /api/kite/redirect
 *
 * Exchange request_token for access_token
 */
router.post('/redirect', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { request_token } = req.body;
    const userId = (req as any).user?.userId;

    if (!request_token) {
      res.status(400).json(ResponseUtils.error('MISSING_TOKEN', 'Request token is required'));
      return;
    }

    // Mock successful authentication for testing
    const mockSession = {
      userId: 'ABC123',
      accessToken: 'mock_access_token_' + Date.now(),
      refreshToken: 'mock_refresh_token_' + Date.now(),
    };

    logger.info('Kite Connect authentication processed', {
      userId,
      kiteUserId: mockSession.userId,
    });

    res.json(
      ResponseUtils.success({
        message: 'Kite Connect authentication successful',
        session: mockSession,
        connected: true,
      }),
    );
  } catch (error) {
    logger.error('Error processing Kite Connect authentication:', error);
    res.status(500).json(ResponseUtils.error('AUTH_ERROR', 'Failed to process authentication'));
  }
});

/**
 * Store Kite Connect Access Token
 * POST /api/kite/token
 *
 * After exchanging request_token for access_token, store it for the authenticated user
 */
router.post('/token', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { access_token, user_id, user_name } = req.body;

    if (!access_token) {
      res.status(400).json(ResponseUtils.error('MISSING_TOKEN', 'Access token is required'));
      return;
    }

    // TODO: Store access_token in database for the authenticated user
    // You might want to create a KiteConnection model to store:
    // - user_id (from your app)
    // - kite_user_id
    // - access_token (encrypted)
    // - user_name
    // - connected_at
    // - expires_at (if applicable)

    logger.info('Kite Connect token stored', {
      userId: (req as any).user?.userId,
      kite_user_id: user_id,
    });

    res.json(
      ResponseUtils.success({
        message: 'Kite Connect token stored successfully',
        kite_user_id: user_id,
        kite_user_name: user_name,
      }),
    );
  } catch (error) {
    logger.error('Error storing Kite Connect token:', error);
    res.status(500).json(ResponseUtils.error('TOKEN_STORE_ERROR', 'Failed to store token'));
  }
});

/**
 * Get Kite Login URL
 * GET /api/kite/login
 */
router.get('/login', authenticateToken, async (_req: Request, res: Response): Promise<void> => {
  try {
    const kiteApiKey = process.env.KITE_API_KEY;

    if (!kiteApiKey) {
      res.status(500).json(ResponseUtils.error('MISSING_CONFIG', 'Kite API key not configured'));
      return;
    }

    const loginUrl = `https://kite.zerodha.com/connect/login?api_key=${kiteApiKey}&v=3`;

    res.json(
      ResponseUtils.success({
        loginUrl,
        message: 'Redirect user to this URL for Kite Connect authentication',
      }),
    );
  } catch (error) {
    logger.error('Error generating Kite login URL:', error);
    res.status(500).json(ResponseUtils.error('LOGIN_URL_ERROR', 'Failed to generate login URL'));
  }
});

/**
 * Get Market Quotes
 * POST /api/kite/quote
 */
router.post('/quote', authenticateToken, async (_req: Request, res: Response): Promise<void> => {
  try {
    const { symbols } = _req.body;

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      res.status(400).json(ResponseUtils.error('INVALID_SYMBOLS', 'Symbols array is required'));
      return;
    }

    // Mock quote data for testing
    const quotes: any = {};

    symbols.forEach((symbol: string) => {
      const basePrice = Math.random() * 2000 + 1000;
      const change = (Math.random() - 0.5) * 100;

      quotes[symbol] = {
        instrument_token: Math.floor(Math.random() * 1000000),
        last_price: parseFloat((basePrice + change).toFixed(2)),
        net_change: parseFloat(change.toFixed(2)),
        ohlc: {
          open: parseFloat(basePrice.toFixed(2)),
          high: parseFloat((basePrice + Math.abs(change) + 20).toFixed(2)),
          low: parseFloat((basePrice - Math.abs(change) - 20).toFixed(2)),
          close: parseFloat(basePrice.toFixed(2)),
        },
        volume: Math.floor(Math.random() * 1000000) + 10000,
      };
    });

    res.json(
      ResponseUtils.success({
        quotes,
        message: 'Market quotes retrieved successfully (mock data)',
      }),
    );
  } catch (error) {
    logger.error('Error getting market quotes:', error);
    res.status(500).json(ResponseUtils.error('QUOTE_ERROR', 'Failed to get market quotes'));
  }
});

/**
 * Get Kite Connect Status
 * GET /api/kite/status
 *
 * Check if user has connected their Kite account
 */
router.get('/status', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    // TODO: Check if user has a valid Kite Connect token in database
    const userId = (req as any).user?.userId;

    logger.info('Checking Kite Connect status', { userId });

    // For now, return placeholder response
    res.json(
      ResponseUtils.success({
        connected: false,
        message: 'Kite Connect integration status',
      }),
    );
  } catch (error) {
    logger.error('Error checking Kite Connect status:', error);
    res.status(500).json(ResponseUtils.error('STATUS_ERROR', 'Failed to check connection status'));
  }
});

/**
 * Disconnect Kite Connect
 * DELETE /api/kite/disconnect
 *
 * Remove stored Kite Connect tokens
 */
router.delete(
  '/disconnect',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;

      // TODO: Delete Kite Connect tokens from database

      logger.info('Kite Connect disconnected', { userId });

      res.json(
        ResponseUtils.success({
          message: 'Kite Connect account disconnected successfully',
        }),
      );
    } catch (error) {
      logger.error('Error disconnecting Kite Connect:', error);
      res.status(500).json(ResponseUtils.error('DISCONNECT_ERROR', 'Failed to disconnect'));
    }
  },
);

export default router;
