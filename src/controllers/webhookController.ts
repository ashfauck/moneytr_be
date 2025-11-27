import { Request, Response } from 'express';
import { ValidationUtils, ResponseUtils, generateVerificationNumber } from '../utils/helpers';
import db from '../services/database';
import logger from '../utils/logger';
import { AuthRequest } from '../types';
import { sendAuthRequestNotification } from '../services/pushNotification';
import { HashUtils } from '../utils/crypto';
import { getIpAddress } from '../utils/helpers';

export class WebhookController {
  /**
   * Send authentication request notification
   * POST /api/webhook/auth-notify
   */
  static async sendAuthNotification(req: Request, res: Response): Promise<void> {
    try {
      const {
        phoneNumber,
        requesterId,
        requesterName,
        requesterOrganization,
        requestType,
        requestedPermissions,
        description,
        expiresInMinutes,
      } = req.body;

      // Format and validate phone number
      const formattedPhone = ValidationUtils.formatPhoneNumber(phoneNumber);

      if (!ValidationUtils.isValidPhoneNumber(formattedPhone)) {
        res.status(400).json(
          ResponseUtils.error(
            'INVALID_PHONE_NUMBER',
            'Phone number must be in international format',
          ),
        );
        return;
      }

      // Find user
      const user = await db.user.findUnique({
        where: { phoneNumber: formattedPhone },
        select: {
          id: true,
          phoneNumber: true,
          accountStatus: true,
          deviceTokens: {
            where: { isActive: true },
            select: { deviceToken: true },
          },
        },
      });

      if (!user) {
        res
          .status(404)
          .json(ResponseUtils.error('USER_NOT_FOUND', 'User with this phone number not found'));
        return;
      }

      if (user.accountStatus === 'SUSPENDED') {
        res
          .status(403)
          .json(ResponseUtils.error('ACCOUNT_SUSPENDED', 'User account is suspended'));
        return;
      }

      // Generate verification number
      const verificationNumber = generateVerificationNumber();

      // Calculate expiration
      const expirationMinutes = expiresInMinutes || 15;
      const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

      // Create auth request
      const authRequest = await db.authRequest.create({
        data: {
          userId: user.id,
          requesterId,
          requesterName,
          requesterOrganization,
          requestType,
          requestedPermissions,
          description,
          expiresAt,
          ipAddress: getIpAddress(req),
          userAgent: req.headers['user-agent'] || 'Unknown',
        },
      });

      // Create verification request
      await db.verificationRequest.create({
        data: {
          userId: user.id,
          appName: requesterOrganization,
          verificationNumber,
          expiresAt,
        },
      });

      // Send push notifications to all active devices
      if (user.deviceTokens.length > 0) {
        const notifications = user.deviceTokens.map((device) =>
          sendAuthRequestNotification(
            device.deviceToken,
            requesterName,
            requesterOrganization,
            verificationNumber,
          ).catch((error) => {
            logger.error('Failed to send notification to device:', error);
          }),
        );

        await Promise.allSettled(notifications);
      }

      logger.info(`Auth request created for user: ${user.phoneNumber}`);

      res.status(201).json(
        ResponseUtils.success(
          {
            requestId: authRequest.id,
            verificationNumber,
            expiresAt: authRequest.expiresAt,
            status: authRequest.status,
          },
          'Authentication request sent successfully',
        ),
      );
    } catch (error) {
      logger.error('Send auth notification error:', error);
      res
        .status(500)
        .json(ResponseUtils.error('INTERNAL_ERROR', 'Failed to send authentication request'));
    }
  }

  /**
   * Approve authentication request
   * POST /api/step-auth/webhook/approve
   */
  static async approveRequest(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res
          .status(401)
          .json(ResponseUtils.error('UNAUTHORIZED', 'Authentication required'));
        return;
      }

      const { requestId, pin } = req.body;

      // Get auth request
      const authRequest = await db.authRequest.findUnique({
        where: { id: requestId },
        include: {
          user: {
            select: {
              id: true,
              phoneNumber: true,
              pinHash: true,
            },
          },
        },
      });

      if (!authRequest) {
        res
          .status(404)
          .json(ResponseUtils.error('REQUEST_NOT_FOUND', 'Authentication request not found'));
        return;
      }

      // Verify request belongs to user
      if (authRequest.userId !== req.user.userId) {
        res
          .status(403)
          .json(
            ResponseUtils.error(
              'FORBIDDEN',
              'You are not authorized to approve this request',
            ),
          );
        return;
      }

      // Check if request is still valid
      if (authRequest.status !== 'PENDING') {
        res.status(400).json(
          ResponseUtils.error(
            'REQUEST_ALREADY_PROCESSED',
            `Request has already been ${authRequest.status.toLowerCase()}`,
          ),
        );
        return;
      }

      if (authRequest.expiresAt < new Date()) {
        await db.authRequest.update({
          where: { id: requestId },
          data: { status: 'EXPIRED' },
        });

        res
          .status(400)
          .json(ResponseUtils.error('REQUEST_EXPIRED', 'Authentication request has expired'));
        return;
      }

      // Verify PIN
      const isPinValid = await HashUtils.compare(pin, authRequest.user.pinHash);

      if (!isPinValid) {
        res.status(401).json(ResponseUtils.error('INVALID_PIN', 'Incorrect PIN'));
        return;
      }

      // Approve request
      await db.authRequest.update({
        where: { id: requestId },
        data: {
          status: 'APPROVED',
          respondedAt: new Date(),
        },
      });

      // Update verification request
      await db.verificationRequest.updateMany({
        where: {
          userId: authRequest.userId,
          appName: authRequest.requesterOrganization,
          status: 'PENDING',
        },
        data: {
          status: 'APPROVED',
          verifiedAt: new Date(),
        },
      });

      logger.info(`Auth request approved by user: ${authRequest.user.phoneNumber}`);

      res.status(200).json(
        ResponseUtils.success(
          {
            requestId: authRequest.id,
            status: 'APPROVED',
            respondedAt: new Date(),
          },
          'Authentication request approved',
        ),
      );
    } catch (error) {
      logger.error('Approve request error:', error);
      res
        .status(500)
        .json(ResponseUtils.error('INTERNAL_ERROR', 'Failed to approve request'));
    }
  }

  /**
   * Reject authentication request
   * POST /api/step-auth/webhook/reject
   */
  static async rejectRequest(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res
          .status(401)
          .json(ResponseUtils.error('UNAUTHORIZED', 'Authentication required'));
        return;
      }

      const { requestId } = req.body;

      // Get auth request
      const authRequest = await db.authRequest.findUnique({
        where: { id: requestId },
      });

      if (!authRequest) {
        res
          .status(404)
          .json(ResponseUtils.error('REQUEST_NOT_FOUND', 'Authentication request not found'));
        return;
      }

      // Verify request belongs to user
      if (authRequest.userId !== req.user.userId) {
        res
          .status(403)
          .json(
            ResponseUtils.error(
              'FORBIDDEN',
              'You are not authorized to reject this request',
            ),
          );
        return;
      }

      // Check if request is still valid
      if (authRequest.status !== 'PENDING') {
        res.status(400).json(
          ResponseUtils.error(
            'REQUEST_ALREADY_PROCESSED',
            `Request has already been ${authRequest.status.toLowerCase()}`,
          ),
        );
        return;
      }

      // Reject request
      await db.authRequest.update({
        where: { id: requestId },
        data: {
          status: 'REJECTED',
          respondedAt: new Date(),
        },
      });

      // Update verification request
      await db.verificationRequest.updateMany({
        where: {
          userId: authRequest.userId,
          appName: authRequest.requesterOrganization,
          status: 'PENDING',
        },
        data: {
          status: 'DENIED',
        },
      });

      logger.info(`Auth request rejected by user: ${req.user.phoneNumber}`);

      res.status(200).json(
        ResponseUtils.success(
          {
            requestId: authRequest.id,
            status: 'REJECTED',
            respondedAt: new Date(),
          },
          'Authentication request rejected',
        ),
      );
    } catch (error) {
      logger.error('Reject request error:', error);
      res
        .status(500)
        .json(ResponseUtils.error('INTERNAL_ERROR', 'Failed to reject request'));
    }
  }

  /**
   * Check authentication request status
   * GET /api/webhook/auth-status?requestId=xxx
   */
  static async checkRequestStatus(req: Request, res: Response): Promise<void> {
    try {
      const { requestId } = req.query;

      if (!requestId || typeof requestId !== 'string') {
        res
          .status(400)
          .json(ResponseUtils.error('MISSING_REQUEST_ID', 'Request ID is required'));
        return;
      }

      const authRequest = await db.authRequest.findUnique({
        where: { id: requestId },
        select: {
          id: true,
          status: true,
          requestType: true,
          createdAt: true,
          expiresAt: true,
          respondedAt: true,
        },
      });

      if (!authRequest) {
        res
          .status(404)
          .json(ResponseUtils.error('REQUEST_NOT_FOUND', 'Authentication request not found'));
        return;
      }

      // Check if expired
      if (authRequest.status === 'PENDING' && authRequest.expiresAt < new Date()) {
        await db.authRequest.update({
          where: { id: requestId },
          data: { status: 'EXPIRED' },
        });

        authRequest.status = 'EXPIRED';
      }

      res.status(200).json(
        ResponseUtils.success(
          {
            requestId: authRequest.id,
            status: authRequest.status,
            requestType: authRequest.requestType,
            createdAt: authRequest.createdAt,
            expiresAt: authRequest.expiresAt,
            respondedAt: authRequest.respondedAt,
          },
          'Request status retrieved',
        ),
      );
    } catch (error) {
      logger.error('Check request status error:', error);
      res
        .status(500)
        .json(ResponseUtils.error('INTERNAL_ERROR', 'Failed to check request status'));
    }
  }
}
