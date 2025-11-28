import { KiteConnect } from 'kiteconnect';
import logger from '../utils/logger';

/**
 * Kite Connect API Service
 * 
 * This service handles all interactions with the Zerodha Kite Connect API
 * Uses official KiteConnect SDK for robust integration
 * WARNING: Keep API secret secure - never expose in client-side code
 */
export class KiteService {
  private apiKey: string;
  private apiSecret: string;
  private kiteInstances: Map<string, KiteConnect> = new Map(); // userId -> KiteConnect instance
  private accessTokens: Map<string, string> = new Map(); // userId -> accessToken

  constructor() {
    this.apiKey = process.env.KITE_API_KEY || '';
    this.apiSecret = process.env.KITE_API_SECRET || '';

    if (!this.apiKey || !this.apiSecret) {
      logger.warn('Kite API credentials not configured');
    }
  }

  /**
   * Get or create KiteConnect instance for a user
   */
  private getKiteInstance(userId: string, accessToken?: string): KiteConnect {
    let kite = this.kiteInstances.get(userId);
    
    if (!kite) {
      kite = new KiteConnect({
        api_key: this.apiKey,
      });
      this.kiteInstances.set(userId, kite);
    }

    // Set access token if provided
    if (accessToken) {
      kite.setAccessToken(accessToken);
      this.accessTokens.set(userId, accessToken);
    }

    return kite;
  }

  /**
   * Exchange request_token for access_token
   */
  async generateSession(requestToken: string): Promise<{
    userId: string;
    accessToken: string;
    refreshToken?: string;
  }> {
    try {
      const kite = new KiteConnect({
        api_key: this.apiKey,
      });

      // Generate session using official SDK
      const session = await kite.generateSession(requestToken, this.apiSecret);

      const userId = session.user_id;
      const accessToken = session.access_token;

      // Store access token and create instance
      this.getKiteInstance(userId, accessToken);

      logger.info('Kite session generated', { userId });

      return {
        userId,
        accessToken,
        refreshToken: session.refresh_token,
      };
    } catch (error: any) {
      logger.error('Error generating Kite session:', error);
      throw new Error('Failed to generate Kite session');
    }
  }

  /**
   * Store access token for a user
   */
  setAccessToken(userId: string, accessToken: string): void {
    this.accessTokens.set(userId, accessToken);
  }

  /**
   * Get stored access token for a user
   */
  getAccessToken(userId: string): string | undefined {
    return this.accessTokens.get(userId);
  }

  /**
   * Place an order
   */
  async placeOrder(
    userId: string,
    params: {
      exchange: string;
      tradingsymbol: string;
      transaction_type: 'BUY' | 'SELL';
      quantity: number;
      order_type: 'MARKET' | 'LIMIT' | 'SL' | 'SL-M';
      product: 'CNC' | 'MIS' | 'NRML';
      price?: number;
      trigger_price?: number;
      validity?: 'DAY' | 'IOC';
      tag?: string;
    },
  ): Promise<{ order_id: string }> {
    try {
      const accessToken = this.getAccessToken(userId);
      if (!accessToken) {
        throw new Error('Access token not found for user');
      }

      const kite = this.getKiteInstance(userId, accessToken);
      
      // Place order using official SDK
      const response = await kite.placeOrder('regular', params);

      logger.info('Order placed', { userId, orderId: response.order_id });

      return { order_id: response.order_id };
    } catch (error: any) {
      logger.error('Error placing order:', error);
      throw new Error('Failed to place order');
    }
  }

  /**
   * Get order details
   */
  async getOrder(userId: string, orderId: string): Promise<any> {
    try {
      const accessToken = this.getAccessToken(userId);
      if (!accessToken) {
        throw new Error('Access token not found for user');
      }

      const kite = this.getKiteInstance(userId, accessToken);
      const orders = await kite.getOrders();
      
      return orders.find((order: any) => order.order_id === orderId);
    } catch (error: any) {
      logger.error('Error fetching order:', error);
      throw new Error('Failed to fetch order');
    }
  }

  /**
   * Get all orders
   */
  async getOrders(userId: string): Promise<any[]> {
    try {
      const accessToken = this.getAccessToken(userId);
      if (!accessToken) {
        throw new Error('Access token not found for user');
      }

      const kite = this.getKiteInstance(userId, accessToken);
      return await kite.getOrders();
    } catch (error: any) {
      logger.error('Error fetching orders:', error);
      throw new Error('Failed to fetch orders');
    }
  }

  /**
   * Get positions
   */
  async getPositions(userId: string): Promise<any> {
    try {
      const accessToken = this.getAccessToken(userId);
      if (!accessToken) {
        throw new Error('Access token not found for user');
      }

      const kite = this.getKiteInstance(userId, accessToken);
      return await kite.getPositions();
    } catch (error: any) {
      logger.error('Error fetching positions:', error);
      throw new Error('Failed to fetch positions');
    }
  }

  /**
   * Get quote for instruments
   */
  async getQuote(userId: string, symbols: string[]): Promise<any> {
    try {
      const accessToken = this.getAccessToken(userId);
      if (!accessToken) {
        throw new Error('Access token not found for user');
      }

      const kite = this.getKiteInstance(userId, accessToken);
      return await kite.getQuote(symbols);
    } catch (error: any) {
      logger.error('Error fetching quote:', error);
      throw new Error('Failed to fetch quote');
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(userId: string, orderId: string, variety: string = 'regular'): Promise<void> {
    try {
      const accessToken = this.getAccessToken(userId);
      if (!accessToken) {
        throw new Error('Access token not found for user');
      }

      const kite = this.getKiteInstance(userId, accessToken);
      await kite.cancelOrder(variety, orderId);

      logger.info('Order cancelled', { userId, orderId });
    } catch (error: any) {
      logger.error('Error cancelling order:', error);
      throw new Error('Failed to cancel order');
    }
  }

  /**
   * Get holdings
   */
  async getHoldings(userId: string): Promise<any[]> {
    try {
      const accessToken = this.getAccessToken(userId);
      if (!accessToken) {
        throw new Error('Access token not found for user');
      }

      const kite = this.getKiteInstance(userId, accessToken);
      return await kite.getHoldings();
    } catch (error: any) {
      logger.error('Error fetching holdings:', error);
      throw new Error('Failed to fetch holdings');
    }
  }
}

export const kiteService = new KiteService();
