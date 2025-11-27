import { Request, Response } from 'express';
import { JwtUtils } from '../utils/jwt';
import { ResponseUtils } from '../utils/helpers';
import db from '../services/database';
import logger from '../utils/logger';
import { AuthRequest } from '../types';
import config from '../utils/config';

export class AuthController {
  /**
   * Refresh access token
   * POST /api/auth/refresh-token
   */
  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res
          .status(400)
          .json(ResponseUtils.error('MISSING_TOKEN', 'Refresh token is required'));
        return;
      }

      // Verify refresh token
      try {
        JwtUtils.verifyRefreshToken(refreshToken);
      } catch (error) {
        res
          .status(401)
          .json(
            ResponseUtils.error('INVALID_TOKEN', 'Invalid or expired refresh token'),
          );
        return;
      }

      // Check if session exists and is active
      const session = await db.session.findUnique({
        where: {
          refreshToken,
        },
        include: {
          user: {
            select: {
              id: true,
              phoneNumber: true,
              accountStatus: true,
            },
          },
        },
      });

      if (!session || !session.isActive) {
        res
          .status(401)
          .json(ResponseUtils.error('INVALID_SESSION', 'Session is invalid or expired'));
        return;
      }

      if (session.expiresAt < new Date()) {
        res
          .status(401)
          .json(ResponseUtils.error('SESSION_EXPIRED', 'Session has expired'));
        return;
      }

      // Check user account status
      if (session.user.accountStatus === 'SUSPENDED') {
        res
          .status(403)
          .json(ResponseUtils.error('ACCOUNT_SUSPENDED', 'Account has been suspended'));
        return;
      }

      // Generate new access token
      const accessToken = JwtUtils.generateAccessToken({
        userId: session.user.id,
        phoneNumber: session.user.phoneNumber,
        accountStatus: session.user.accountStatus,
      });

      logger.info(`Token refreshed for user: ${session.user.phoneNumber}`);

      res.status(200).json(
        ResponseUtils.success(
          {
            accessToken,
            expiresIn: config.jwt.expiresIn,
          },
          'Token refreshed successfully',
        ),
      );
    } catch (error) {
      logger.error('Refresh token error:', error);
      res
        .status(500)
        .json(ResponseUtils.error('INTERNAL_ERROR', 'Failed to refresh token'));
    }
  }

  /**
   * Logout
   * POST /api/auth/logout
   */
  static async logout(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res
          .status(401)
          .json(ResponseUtils.error('UNAUTHORIZED', 'Authentication required'));
        return;
      }

      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

      if (token) {
        // Get token expiration
        const decoded = JwtUtils.decode(token);
        const expiresAt = new Date(decoded.exp * 1000);

        // Add token to blacklist
        await db.blacklistedToken.create({
          data: {
            token,
            expiresAt,
          },
        });
      }

      // Deactivate all sessions for user (or specific session if provided)
      const { sessionId } = req.body;

      if (sessionId) {
        await db.session.update({
          where: { id: sessionId },
          data: { isActive: false },
        });
      } else {
        await db.session.updateMany({
          where: {
            userId: req.user.userId,
            isActive: true,
          },
          data: {
            isActive: false,
          },
        });
      }

      logger.info(`User logged out: ${req.user.phoneNumber}`);

      res.status(200).json(ResponseUtils.success({}, 'Logged out successfully'));
    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json(ResponseUtils.error('INTERNAL_ERROR', 'Failed to logout'));
    }
  }
}
