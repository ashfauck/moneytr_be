import axios from 'axios';
import crypto from 'crypto';
import logger from '../utils/logger';

/**
 * Kite Connect API Service
 * 
 * This service handles all interactions with the Zerodha Kite Connect API
 * WARNING: Keep API secret secure - never expose in client-side code
 */
export class KiteService {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl = 'https://api.kite.trade';
  private accessTokens: Map<string, string> = new Map(); // userId -> accessToken

  constructor() {
    this.apiKey = process.env.KITE_API_KEY || '';
    this.apiSecret = process.env.KITE_API_SECRET || '';

    if (!this.apiKey || !this.apiSecret) {
      logger.warn('Kite API credentials not configured');
    }
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
      // Generate checksum
      const checksum = crypto
        .createHash('sha256')
        .update(this.apiKey + requestToken + this.apiSecret)
        .digest('hex');

      const response = await axios.post(`${this.baseUrl}/session/token`, {
        api_key: this.apiKey,
        request_token: requestToken,
        checksum: checksum,
      });

      const { user_id, access_token, refresh_token } = response.data.data;

      // Store access token
      this.accessTokens.set(user_id, access_token);

      logger.info('Kite session generated', { userId: user_id });

      return {
        userId: user_id,
        accessToken: access_token,
        refreshToken: refresh_token,
      };
    } catch (error: any) {
      logger.error('Error generating Kite session:', error.response?.data || error.message);
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

      const response = await axios.post(`${this.baseUrl}/orders/${this.apiKey}`, params, {
        headers: {
          'X-Kite-Version': '3',
          Authorization: `token ${this.apiKey}:${accessToken}`,
        },
      });

      logger.info('Order placed', { userId, orderId: response.data.data.order_id });

      return response.data.data;
    } catch (error: any) {
      logger.error('Error placing order:', error.response?.data || error.message);
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

      const response = await axios.get(`${this.baseUrl}/orders/${orderId}`, {
        headers: {
          'X-Kite-Version': '3',
          Authorization: `token ${this.apiKey}:${accessToken}`,
        },
      });

      return response.data.data;
    } catch (error: any) {
      logger.error('Error fetching order:', error.response?.data || error.message);
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

      const response = await axios.get(`${this.baseUrl}/orders`, {
        headers: {
          'X-Kite-Version': '3',
          Authorization: `token ${this.apiKey}:${accessToken}`,
        },
      });

      return response.data.data;
    } catch (error: any) {
      logger.error('Error fetching orders:', error.response?.data || error.message);
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

      const response = await axios.get(`${this.baseUrl}/portfolio/positions`, {
        headers: {
          'X-Kite-Version': '3',
          Authorization: `token ${this.apiKey}:${accessToken}`,
        },
      });

      return response.data.data;
    } catch (error: any) {
      logger.error('Error fetching positions:', error.response?.data || error.message);
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

      const response = await axios.get(`${this.baseUrl}/quote`, {
        params: { i: symbols },
        headers: {
          'X-Kite-Version': '3',
          Authorization: `token ${this.apiKey}:${accessToken}`,
        },
      });

      return response.data.data;
    } catch (error: any) {
      logger.error('Error fetching quote:', error.response?.data || error.message);
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

      await axios.delete(`${this.baseUrl}/orders/${variety}/${orderId}`, {
        headers: {
          'X-Kite-Version': '3',
          Authorization: `token ${this.apiKey}:${accessToken}`,
        },
      });

      logger.info('Order cancelled', { userId, orderId });
    } catch (error: any) {
      logger.error('Error cancelling order:', error.response?.data || error.message);
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

      const response = await axios.get(`${this.baseUrl}/portfolio/holdings`, {
        headers: {
          'X-Kite-Version': '3',
          Authorization: `token ${this.apiKey}:${accessToken}`,
        },
      });

      return response.data.data;
    } catch (error: any) {
      logger.error('Error fetching holdings:', error.response?.data || error.message);
      throw new Error('Failed to fetch holdings');
    }
  }
}

export const kiteService = new KiteService();
