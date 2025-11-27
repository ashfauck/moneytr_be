import { Request, Response } from 'express';
import { generateChallenge } from '../utils/helpers';
import { ValidationUtils, ResponseUtils } from '../utils/helpers';
import db from '../services/database';
import logger from '../utils/logger';
import { AuthRequest } from '../types';
import config from '../utils/config';
import { parseTimeToMs } from '../utils/helpers';

export class BiometricController {
  /**
   * Generate biometric challenge
   * POST /api/step-auth/biometric/challenge
   */
  static async generateChallenge(req: Request, res: Response): Promise<void> {
    try {
      const { phoneNumber } = req.body;

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
          biometricEnabled: true,
        },
      });

      if (!user) {
        res.status(404).json(ResponseUtils.error('USER_NOT_FOUND', 'User not found'));
        return;
      }

      // Generate challenge
      const challengeString = generateChallenge(32);
      const expiresAt = new Date(
        Date.now() + parseTimeToMs(config.jwt.biometricChallengeExpiresIn),
      );

      const challenge = await db.biometricChallenge.create({
        data: {
          challengeString,
          expiresAt,
        },
      });

      logger.info(`Biometric challenge generated for user: ${user.phoneNumber}`);

      res.status(200).json(
        ResponseUtils.success(
          {
            challengeId: challenge.id,
            challenge: challenge.challengeString,
            expiresAt: challenge.expiresAt,
          },
          'Challenge generated',
        ),
      );
    } catch (error) {
      logger.error('Generate biometric challenge error:', error);
      res
        .status(500)
        .json(ResponseUtils.error('INTERNAL_ERROR', 'Failed to generate challenge'));
    }
  }

  /**
   * Enroll biometric authentication
   * POST /api/step-auth/biometric/enroll
   */
  static async enrollBiometric(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res
          .status(401)
          .json(ResponseUtils.error('UNAUTHORIZED', 'Authentication required'));
        return;
      }

      const { publicKey, biometryType, deviceId } = req.body;

      // Check if public key already exists
      const existingKey = await db.userBiometricKey.findFirst({
        where: {
          userId: req.user.userId,
          publicKey,
          isActive: true,
        },
      });

      if (existingKey) {
        res.status(409).json(
          ResponseUtils.error(
            'BIOMETRIC_ALREADY_ENROLLED',
            'This biometric key is already enrolled',
          ),
        );
        return;
      }

      // Create biometric key
      const biometricKey = await db.userBiometricKey.create({
        data: {
          userId: req.user.userId,
          publicKey,
          biometryType,
          deviceId,
          isActive: true,
        },
      });

      // Enable biometric for user if not already enabled
      await db.user.update({
        where: { id: req.user.userId },
        data: { biometricEnabled: true },
      });

      logger.info(`Biometric enrolled for user: ${req.user.phoneNumber}`);

      res.status(201).json(
        ResponseUtils.success(
          {
            id: biometricKey.id,
            biometryType: biometricKey.biometryType,
            enrolledAt: biometricKey.enrolledAt,
          },
          'Biometric authentication enrolled successfully',
        ),
      );
    } catch (error) {
      logger.error('Enroll biometric error:', error);
      res
        .status(500)
        .json(ResponseUtils.error('INTERNAL_ERROR', 'Failed to enroll biometric'));
    }
  }

  /**
   * Disable biometric authentication
   * POST /api/step-auth/biometric/disable
   */
  static async disableBiometric(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res
          .status(401)
          .json(ResponseUtils.error('UNAUTHORIZED', 'Authentication required'));
        return;
      }

      // Deactivate all biometric keys for user
      await db.userBiometricKey.updateMany({
        where: {
          userId: req.user.userId,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });

      // Disable biometric for user
      await db.user.update({
        where: { id: req.user.userId },
        data: { biometricEnabled: false },
      });

      logger.info(`Biometric disabled for user: ${req.user.phoneNumber}`);

      res.status(200).json(
        ResponseUtils.success(
          { biometricEnabled: false },
          'Biometric authentication disabled',
        ),
      );
    } catch (error) {
      logger.error('Disable biometric error:', error);
      res
        .status(500)
        .json(ResponseUtils.error('INTERNAL_ERROR', 'Failed to disable biometric'));
    }
  }
}
