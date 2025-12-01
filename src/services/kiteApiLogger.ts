import db from './database';
import logger from '../utils/logger';
import { KiteApiMethod, KiteApiStatus } from '@prisma/client';

/**
 * Kite API Logger Service
 * 
 * This service logs all Kite API requests and responses to the database
 * Provides comprehensive audit trail for all Kite Connect API interactions
 */
export class KiteApiLogger {
  /**
   * Log a Kite API request
   * Call this before making the API request to Kite
   */
  static async logRequest(params: {
    userId: string;
    endpoint: string;
    method: KiteApiMethod;
    requestPayload?: any;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<string> {
    try {
      const { userId, endpoint, method, requestPayload, ipAddress, userAgent } = params;

      // Get kite connection if exists
      const kiteConnection = await db.kiteConnection.findUnique({
        where: { userId },
        select: { id: true },
      });

      const log = await db.kiteApiLog.create({
        data: {
          userId,
          kiteConnectionId: kiteConnection?.id,
          endpoint,
          method,
          requestPayload: requestPayload || {},
          status: 'PENDING',
          ipAddress,
          userAgent,
        },
      });

      logger.info('Kite API request logged', { logId: log.id, endpoint, method });

      return log.id;
    } catch (error) {
      logger.error('Error logging Kite API request:', error);
      throw error;
    }
  }

  /**
   * Log a Kite API response
   * Call this after receiving the response from Kite
   */
  static async logResponse(params: {
    logId: string;
    responsePayload?: any;
    statusCode?: number;
    status: KiteApiStatus;
    errorMessage?: string;
    responseTime?: number;
  }): Promise<void> {
    try {
      const { logId, responsePayload, statusCode, status, errorMessage, responseTime } = params;

      await db.kiteApiLog.update({
        where: { id: logId },
        data: {
          responsePayload: responsePayload || {},
          statusCode,
          status,
          errorMessage,
          responseTime,
        },
      });

      logger.info('Kite API response logged', { logId, status, statusCode });
    } catch (error) {
      logger.error('Error logging Kite API response:', error);
    }
  }

  /**
   * Wrapper function to execute and log Kite API calls
   */
  static async executeAndLog<T>(params: {
    userId: string;
    endpoint: string;
    method: KiteApiMethod;
    requestPayload?: any;
    ipAddress?: string;
    userAgent?: string;
    apiCall: () => Promise<T>;
  }): Promise<T> {
    const { userId, endpoint, method, requestPayload, ipAddress, userAgent, apiCall } = params;

    const startTime = Date.now();
    let logId: string | null = null;

    try {
      // Log the request
      logId = await this.logRequest({
        userId,
        endpoint,
        method,
        requestPayload,
        ipAddress,
        userAgent,
      });

      // Execute the API call
      const response = await apiCall();
      const responseTime = Date.now() - startTime;

      // Log the successful response
      if (logId) {
        await this.logResponse({
          logId,
          responsePayload: response,
          statusCode: 200,
          status: 'SUCCESS',
          responseTime,
        });
      }

      return response;
    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      // Log the error response
      if (logId) {
        await this.logResponse({
          logId,
          statusCode: error.statusCode || 500,
          status: 'ERROR',
          errorMessage: error.message || 'Unknown error',
          responseTime,
        });
      }

      throw error;
    }
  }

  /**
   * Get API logs for a user
   */
  static async getUserLogs(
    userId: string,
    options?: {
      limit?: number;
      endpoint?: string;
      status?: KiteApiStatus;
      startDate?: Date;
      endDate?: Date;
    },
  ) {
    const where: any = { userId };

    if (options?.endpoint) {
      where.endpoint = options.endpoint;
    }

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.startDate || options?.endDate) {
      where.createdAt = {};
      if (options.startDate) {
        where.createdAt.gte = options.startDate;
      }
      if (options.endDate) {
        where.createdAt.lte = options.endDate;
      }
    }

    const logs = await db.kiteApiLog.findMany({
      where,
      take: options?.limit || 100,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        endpoint: true,
        method: true,
        status: true,
        statusCode: true,
        errorMessage: true,
        responseTime: true,
        createdAt: true,
      },
    });

    return logs;
  }

  /**
   * Get API statistics for a user
   */
  static async getUserStats(userId: string, period: 'day' | 'week' | 'month' = 'day') {
    const now = new Date();
    const startDate = new Date();

    switch (period) {
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
    }

    const logs = await db.kiteApiLog.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate,
        },
      },
    });

    const stats = {
      totalRequests: logs.length,
      successfulRequests: logs.filter((l) => l.status === 'SUCCESS').length,
      failedRequests: logs.filter((l) => l.status === 'ERROR').length,
      averageResponseTime: logs.reduce((sum, l) => sum + (l.responseTime || 0), 0) / logs.length || 0,
      endpointBreakdown: {} as Record<string, number>,
    };

    logs.forEach((log) => {
      stats.endpointBreakdown[log.endpoint] =
        (stats.endpointBreakdown[log.endpoint] || 0) + 1;
    });

    return stats;
  }
}
