import { KiteConnect } from 'kiteconnect';
import db from './database';
import logger from '../utils/logger';
import { KiteApiLogger } from './kiteApiLogger';
import { KiteApiMethod } from '@prisma/client';

/**
 * Enhanced Kite Connect API Service with Database Mirroring
 * 
 * This service:
 * 1. Stores all order requests in database BEFORE sending to Kite
 * 2. Logs all API requests and responses
 * 3. Mirrors positions and holdings fetched from Kite
 * 4. Provides comprehensive audit trail
 */
export class EnhancedKiteService {
  private apiKey: string;
  private apiSecret: string;
  private kiteInstances: Map<string, KiteConnect> = new Map();

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
  private async getKiteInstance(userId: string): Promise<KiteConnect> {
    let kite = this.kiteInstances.get(userId);
    
    if (!kite) {
      kite = new KiteConnect({
        api_key: this.apiKey,
      });

      // Get access token from database
      const connection = await db.kiteConnection.findUnique({
        where: { userId, isActive: true },
      });

      if (connection) {
        kite.setAccessToken(connection.accessToken);
      }

      this.kiteInstances.set(userId, kite);
    }

    return kite;
  }

  /**
   * Generate session and store connection
   */
  async generateSession(requestToken: string, userId: string): Promise<{
    userId: string;
    accessToken: string;
    refreshToken?: string;
  }> {
    try {
      const kite = new KiteConnect({
        api_key: this.apiKey,
      });

      // Log the API request
      const logId = await KiteApiLogger.logRequest({
        userId,
        endpoint: '/session/token',
        method: 'POST',
        requestPayload: { request_token: requestToken },
      });

      const startTime = Date.now();

      try {
        // Generate session using official SDK
        const session = await kite.generateSession(requestToken, this.apiSecret);
        const responseTime = Date.now() - startTime;

        // Log successful response
        await KiteApiLogger.logResponse({
          logId,
          responsePayload: { user_id: session.user_id },
          statusCode: 200,
          status: 'SUCCESS',
          responseTime,
        });

        // Store connection in database
        await db.kiteConnection.upsert({
          where: { userId },
          create: {
            userId,
            kiteUserId: session.user_id,
            kiteUserName: session.user_name,
            accessToken: session.access_token,
            refreshToken: session.refresh_token,
            apiKey: this.apiKey,
            isActive: true,
          },
          update: {
            kiteUserId: session.user_id,
            kiteUserName: session.user_name,
            accessToken: session.access_token,
            refreshToken: session.refresh_token,
            isActive: true,
            lastUsedAt: new Date(),
          },
        });

        logger.info('Kite session generated and stored', { userId, kiteUserId: session.user_id });

        return {
          userId: session.user_id,
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
        };
      } catch (error: any) {
        const responseTime = Date.now() - startTime;
        
        // Log error response
        await KiteApiLogger.logResponse({
          logId,
          statusCode: error.statusCode || 500,
          status: 'ERROR',
          errorMessage: error.message,
          responseTime,
        });

        throw error;
      }
    } catch (error: any) {
      logger.error('Error generating Kite session:', error);
      throw new Error('Failed to generate Kite session');
    }
  }

  /**
   * Place an order with database mirroring
   * 1. Store order in database first
   * 2. Send to Kite API
   * 3. Update database with Kite response
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
    requestContext?: { ipAddress?: string; userAgent?: string },
  ): Promise<{ order_id: string; mirrorId: string }> {
    try {
      // Step 1: Store order in database FIRST (before calling Kite)
      const orderMirror = await db.kiteOrderMirror.create({
        data: {
          userId,
          exchange: params.exchange,
          tradingsymbol: params.tradingsymbol,
          transactionType: params.transaction_type,
          quantity: params.quantity,
          orderType: params.order_type,
          product: params.product,
          price: params.price || null,
          triggerPrice: params.trigger_price || null,
          validity: params.validity || 'DAY',
          tag: params.tag || null,
          status: 'PENDING',
        },
      });

      logger.info('Order mirrored in database', { mirrorId: orderMirror.id, userId });

      // Step 2: Call Kite API with logging
      const kite = await this.getKiteInstance(userId);

      const result = await KiteApiLogger.executeAndLog({
        userId,
        endpoint: '/orders/regular',
        method: 'POST',
        requestPayload: params,
        ipAddress: requestContext?.ipAddress,
        userAgent: requestContext?.userAgent,
        apiCall: async () => {
          return await kite.placeOrder('regular', params);
        },
      });

      // Step 3: Update database mirror with Kite response
      await db.kiteOrderMirror.update({
        where: { id: orderMirror.id },
        data: {
          kiteOrderId: result.order_id,
          status: 'SENT',
          kiteResponse: result as any,
          sentToKiteAt: new Date(),
          receivedFromKiteAt: new Date(),
        },
      });

      logger.info('Order placed and synced', { 
        mirrorId: orderMirror.id, 
        kiteOrderId: result.order_id,
        userId 
      });

      return { order_id: result.order_id, mirrorId: orderMirror.id };
    } catch (error: any) {
      logger.error('Error placing order:', error);
      throw new Error('Failed to place order');
    }
  }

  /**
   * Get orders from Kite and update database mirror
   */
  async getOrders(
    userId: string,
    requestContext?: { ipAddress?: string; userAgent?: string },
  ): Promise<any[]> {
    try {
      const kite = await this.getKiteInstance(userId);

      const orders = await KiteApiLogger.executeAndLog({
        userId,
        endpoint: '/orders',
        method: 'GET',
        ipAddress: requestContext?.ipAddress,
        userAgent: requestContext?.userAgent,
        apiCall: async () => {
          return await kite.getOrders();
        },
      });

      // Update order mirrors with latest data from Kite
      for (const order of orders) {
        await db.kiteOrderMirror.updateMany({
          where: {
            userId,
            kiteOrderId: order.order_id,
          },
          data: {
            status: order.status,
            averagePrice: order.average_price || null,
            filledQuantity: order.filled_quantity || null,
            pendingQuantity: order.pending_quantity || null,
            statusMessage: order.status_message || null,
            kiteResponse: order as any,
            receivedFromKiteAt: new Date(),
          },
        });
      }

      logger.info('Orders fetched and synced', { userId, count: orders.length });

      return orders;
    } catch (error: any) {
      logger.error('Error fetching orders:', error);
      throw new Error('Failed to fetch orders');
    }
  }

  /**
   * Get positions from Kite and store in database mirror
   */
  async getPositions(
    userId: string,
    requestContext?: { ipAddress?: string; userAgent?: string },
  ): Promise<any> {
    try {
      const kite = await this.getKiteInstance(userId);

      const positions = await KiteApiLogger.executeAndLog({
        userId,
        endpoint: '/portfolio/positions',
        method: 'GET',
        ipAddress: requestContext?.ipAddress,
        userAgent: requestContext?.userAgent,
        apiCall: async () => {
          return await kite.getPositions();
        },
      });

      // Store positions in database mirror
      if (positions.net) {
        for (const position of positions.net) {
          await db.kitePositionMirror.upsert({
            where: {
              userId_tradingsymbol_product: {
                userId,
                tradingsymbol: position.tradingsymbol,
                product: position.product,
              },
            },
            create: {
              userId,
              tradingsymbol: position.tradingsymbol,
              exchange: position.exchange,
              product: position.product,
              quantity: position.quantity || 0,
              overnightQuantity: position.overnight_quantity || 0,
              multiplier: position.multiplier || 1,
              averagePrice: position.average_price || 0,
              closePrice: position.close_price || null,
              lastPrice: position.last_price || 0,
              value: position.value || 0,
              pnl: position.pnl || 0,
              m2m: position.m2m || 0,
              unrealised: position.unrealised || 0,
              realised: position.realised || 0,
              buyQuantity: position.buy_quantity || 0,
              buyPrice: position.buy_price || 0,
              buyValue: position.buy_value || 0,
              buyM2m: position.buy_m2m || 0,
              sellQuantity: position.sell_quantity || 0,
              sellPrice: position.sell_price || 0,
              sellValue: position.sell_value || 0,
              sellM2m: position.sell_m2m || 0,
              dayBuyQuantity: position.day_buy_quantity || 0,
              dayBuyPrice: position.day_buy_price || 0,
              dayBuyValue: position.day_buy_value || 0,
              daySellQuantity: position.day_sell_quantity || 0,
              daySellPrice: position.day_sell_price || 0,
              daySellValue: position.day_sell_value || 0,
              kiteResponse: position as any,
            },
            update: {
              quantity: position.quantity || 0,
              overnightQuantity: position.overnight_quantity || 0,
              averagePrice: position.average_price || 0,
              closePrice: position.close_price || null,
              lastPrice: position.last_price || 0,
              value: position.value || 0,
              pnl: position.pnl || 0,
              m2m: position.m2m || 0,
              unrealised: position.unrealised || 0,
              realised: position.realised || 0,
              buyQuantity: position.buy_quantity || 0,
              buyPrice: position.buy_price || 0,
              buyValue: position.buy_value || 0,
              buyM2m: position.buy_m2m || 0,
              sellQuantity: position.sell_quantity || 0,
              sellPrice: position.sell_price || 0,
              sellValue: position.sell_value || 0,
              sellM2m: position.sell_m2m || 0,
              dayBuyQuantity: position.day_buy_quantity || 0,
              dayBuyPrice: position.day_buy_price || 0,
              dayBuyValue: position.day_buy_value || 0,
              daySellQuantity: position.day_sell_quantity || 0,
              daySellPrice: position.day_sell_price || 0,
              daySellValue: position.day_sell_value || 0,
              kiteResponse: position as any,
              fetchedAt: new Date(),
            },
          });
        }
      }

      logger.info('Positions fetched and stored', { userId });

      return positions;
    } catch (error: any) {
      logger.error('Error fetching positions:', error);
      throw new Error('Failed to fetch positions');
    }
  }

  /**
   * Get holdings from Kite and store in database mirror
   */
  async getHoldings(
    userId: string,
    requestContext?: { ipAddress?: string; userAgent?: string },
  ): Promise<any[]> {
    try {
      const kite = await this.getKiteInstance(userId);

      const holdings = await KiteApiLogger.executeAndLog({
        userId,
        endpoint: '/portfolio/holdings',
        method: 'GET',
        ipAddress: requestContext?.ipAddress,
        userAgent: requestContext?.userAgent,
        apiCall: async () => {
          return await kite.getHoldings();
        },
      });

      // Store holdings in database mirror
      for (const holding of holdings) {
        await db.kiteHoldingMirror.upsert({
          where: {
            userId_tradingsymbol: {
              userId,
              tradingsymbol: holding.tradingsymbol,
            },
          },
          create: {
            userId,
            tradingsymbol: holding.tradingsymbol,
            exchange: holding.exchange,
            isin: holding.isin || null,
            quantity: holding.quantity || 0,
            t1Quantity: holding.t1_quantity || 0,
            realisedQuantity: holding.realised_quantity || 0,
            collateralQuantity: holding.collateral_quantity || 0,
            collateralType: holding.collateral_type || null,
            averagePrice: holding.average_price || 0,
            lastPrice: holding.last_price || 0,
            closePrice: holding.close_price || null,
            pnl: holding.pnl || 0,
            dayChange: holding.day_change || 0,
            dayChangePercentage: holding.day_change_percentage || 0,
            kiteResponse: holding as any,
          },
          update: {
            quantity: holding.quantity || 0,
            t1Quantity: holding.t1_quantity || 0,
            realisedQuantity: holding.realised_quantity || 0,
            collateralQuantity: holding.collateral_quantity || 0,
            collateralType: holding.collateral_type || null,
            averagePrice: holding.average_price || 0,
            lastPrice: holding.last_price || 0,
            closePrice: holding.close_price || null,
            pnl: holding.pnl || 0,
            dayChange: holding.day_change || 0,
            dayChangePercentage: holding.day_change_percentage || 0,
            kiteResponse: holding as any,
            fetchedAt: new Date(),
          },
        });
      }

      logger.info('Holdings fetched and stored', { userId, count: holdings.length });

      return holdings;
    } catch (error: any) {
      logger.error('Error fetching holdings:', error);
      throw new Error('Failed to fetch holdings');
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(
    userId: string,
    orderId: string,
    requestContext?: { ipAddress?: string; userAgent?: string },
  ): Promise<void> {
    try {
      const kite = await this.getKiteInstance(userId);

      await KiteApiLogger.executeAndLog({
        userId,
        endpoint: `/orders/regular/${orderId}`,
        method: 'DELETE',
        requestPayload: { order_id: orderId },
        ipAddress: requestContext?.ipAddress,
        userAgent: requestContext?.userAgent,
        apiCall: async () => {
          return await kite.cancelOrder('regular', orderId);
        },
      });

      // Update order mirror
      await db.kiteOrderMirror.updateMany({
        where: {
          userId,
          kiteOrderId: orderId,
        },
        data: {
          status: 'CANCELLED',
          receivedFromKiteAt: new Date(),
        },
      });

      logger.info('Order cancelled', { userId, orderId });
    } catch (error: any) {
      logger.error('Error cancelling order:', error);
      throw new Error('Failed to cancel order');
    }
  }

  /**
   * Get quote for instruments
   */
  async getQuote(
    userId: string,
    symbols: string[],
    requestContext?: { ipAddress?: string; userAgent?: string },
  ): Promise<any> {
    try {
      const kite = await this.getKiteInstance(userId);

      const quote = await KiteApiLogger.executeAndLog({
        userId,
        endpoint: '/quote',
        method: 'GET',
        requestPayload: { symbols },
        ipAddress: requestContext?.ipAddress,
        userAgent: requestContext?.userAgent,
        apiCall: async () => {
          return await kite.getQuote(symbols);
        },
      });

      return quote;
    } catch (error: any) {
      logger.error('Error fetching quote:', error);
      throw new Error('Failed to fetch quote');
    }
  }

  /**
   * Get order mirrors from database (audit trail)
   */
  async getOrderMirrors(userId: string, filters?: {
    status?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }) {
    const where: any = { userId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    return await db.kiteOrderMirror.findMany({
      where,
      take: filters?.limit || 100,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}

export const enhancedKiteService = new EnhancedKiteService();
