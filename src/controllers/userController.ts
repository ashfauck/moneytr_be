import { Response } from 'express';
import { HashUtils } from '../utils/crypto';
import { ValidationUtils, ResponseUtils } from '../utils/helpers';
import db from '../services/database';
import logger from '../utils/logger';
import { AuthRequest } from '../types';

export class UserController {
  /**
   * Get user profile
   * GET /api/user/profile
   */
  static async getProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res
          .status(401)
          .json(ResponseUtils.error('UNAUTHORIZED', 'Authentication required'));
        return;
      }

      const user = await db.user.findUnique({
        where: { id: req.user.userId },
        select: {
          id: true,
          phoneNumber: true,
          name: true,
          email: true,
          isVerified: true,
          biometricEnabled: true,
          accountStatus: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
        },
      });

      if (!user) {
        res.status(404).json(ResponseUtils.error('USER_NOT_FOUND', 'User not found'));
        return;
      }

      res.status(200).json(
        ResponseUtils.success(
          { user },
          'Profile retrieved successfully',
        ),
      );
    } catch (error) {
      logger.error('Get profile error:', error);
      res
        .status(500)
        .json(ResponseUtils.error('INTERNAL_ERROR', 'Failed to get profile'));
    }
  }

  /**
   * Update user profile
   * PATCH /api/user/profile
   */
  static async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res
          .status(401)
          .json(ResponseUtils.error('UNAUTHORIZED', 'Authentication required'));
        return;
      }

      const { name, email } = req.body;

      // Validate email if provided
      if (email && !ValidationUtils.isValidEmail(email)) {
        res.status(400).json(ResponseUtils.error('INVALID_EMAIL', 'Invalid email format'));
        return;
      }

      // Validate name if provided
      if (name && !ValidationUtils.isValidName(name)) {
        res.status(400).json(
          ResponseUtils.error(
            'INVALID_NAME',
            'Name must be 2-50 characters, letters and spaces only',
          ),
        );
        return;
      }

      const user = await db.user.update({
        where: { id: req.user.userId },
        data: {
          name: name || undefined,
          email: email || undefined,
        },
        select: {
          id: true,
          phoneNumber: true,
          name: true,
          email: true,
          accountStatus: true,
          biometricEnabled: true,
        },
      });

      logger.info(`Profile updated for user: ${user.phoneNumber}`);

      res.status(200).json(
        ResponseUtils.success(
          { user },
          'Profile updated successfully',
        ),
      );
    } catch (error) {
      logger.error('Update profile error:', error);
      res
        .status(500)
        .json(ResponseUtils.error('INTERNAL_ERROR', 'Failed to update profile'));
    }
  }

  /**
   * Change PIN
   * POST /api/user/change-pin
   */
  static async changePin(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res
          .status(401)
          .json(ResponseUtils.error('UNAUTHORIZED', 'Authentication required'));
        return;
      }

      const { currentPin, newPin, confirmPin } = req.body;

      // Verify new PINs match
      if (newPin !== confirmPin) {
        res.status(400).json(ResponseUtils.error('PIN_MISMATCH', 'New PINs do not match'));
        return;
      }

      // Get user
      const user = await db.user.findUnique({
        where: { id: req.user.userId },
        select: {
          id: true,
          phoneNumber: true,
          pinHash: true,
        },
      });

      if (!user) {
        res.status(404).json(ResponseUtils.error('USER_NOT_FOUND', 'User not found'));
        return;
      }

      // Verify current PIN
      const isCurrentPinValid = await HashUtils.compare(currentPin, user.pinHash);

      if (!isCurrentPinValid) {
        res.status(401).json(
          ResponseUtils.error('INVALID_PIN', 'Current PIN is incorrect'),
        );
        return;
      }

      // Hash new PIN
      const newPinHash = await HashUtils.hash(newPin);

      // Update PIN
      await db.user.update({
        where: { id: user.id },
        data: {
          pinHash: newPinHash,
        },
      });

      logger.info(`PIN changed for user: ${user.phoneNumber}`);

      res.status(200).json(ResponseUtils.success({}, 'PIN changed successfully'));
    } catch (error) {
      logger.error('Change PIN error:', error);
      res
        .status(500)
        .json(ResponseUtils.error('INTERNAL_ERROR', 'Failed to change PIN'));
    }
  }

  /**
   * List active sessions
   * GET /api/user/sessions
   */
  static async listSessions(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res
          .status(401)
          .json(ResponseUtils.error('UNAUTHORIZED', 'Authentication required'));
        return;
      }

      const sessions = await db.session.findMany({
        where: {
          userId: req.user.userId,
          isActive: true,
          expiresAt: {
            gt: new Date(),
          },
        },
        select: {
          id: true,
          deviceInfo: true,
          ipAddress: true,
          createdAt: true,
          expiresAt: true,
          isActive: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      res.status(200).json(
        ResponseUtils.success(
          {
            sessions,
            count: sessions.length,
          },
          'Sessions retrieved successfully',
        ),
      );
    } catch (error) {
      logger.error('List sessions error:', error);
      res
        .status(500)
        .json(ResponseUtils.error('INTERNAL_ERROR', 'Failed to list sessions'));
    }
  }

  /**
   * Terminate session
   * DELETE /api/user/sessions/:sessionId
   */
  static async terminateSession(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res
          .status(401)
          .json(ResponseUtils.error('UNAUTHORIZED', 'Authentication required'));
        return;
      }

      const { sessionId } = req.params;

      const result = await db.session.updateMany({
        where: {
          id: sessionId,
          userId: req.user.userId,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });

      if (result.count === 0) {
        res.status(404).json(ResponseUtils.error('SESSION_NOT_FOUND', 'Session not found'));
        return;
      }

      logger.info(`Session terminated for user: ${req.user.phoneNumber}`);

      res.status(200).json(ResponseUtils.success({}, 'Session terminated successfully'));
    } catch (error) {
      logger.error('Terminate session error:', error);
      res
        .status(500)
        .json(ResponseUtils.error('INTERNAL_ERROR', 'Failed to terminate session'));
    }
  }
}
