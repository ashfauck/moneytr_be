import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../services/database';
import { HashUtils } from '../utils/crypto';
import { JwtUtils } from '../utils/jwt';
import {
  ValidationUtils,
  ResponseUtils,
  getDeviceInfo,
  getIpAddress,
  parseTimeToMs,
} from '../utils/helpers';
import config from '../utils/config';
import logger from '../utils/logger';
import { AuthRequest } from '../types';

export class StepAuthController {
  /**
   * Step 1 - LOGIN: Validate phone number for login
   * POST /api/step-auth/login/validate-phone
   */
  static async validatePhoneForLogin(req: Request, res: Response): Promise<void> {
    try {
      const { phoneNumber } = req.body;

      // Format and validate phone number
      const formattedPhone = ValidationUtils.formatPhoneNumber(phoneNumber);

      if (!ValidationUtils.isValidPhoneNumber(formattedPhone)) {
        res.status(400).json(
          ResponseUtils.error(
            'INVALID_PHONE_NUMBER',
            'Phone number must be in international format (e.g., +14155552671)',
          ),
        );
        return;
      }

      // Check if user exists
      const user = await db.user.findUnique({
        where: { phoneNumber: formattedPhone },
        select: {
          id: true,
          phoneNumber: true,
          accountStatus: true,
          loginAttempts: true,
          lockUntil: true,
          isVerified: true,
        },
      });

      if (!user) {
        res
          .status(404)
          .json(
            ResponseUtils.error('USER_NOT_FOUND', 'User with this phone number not found'),
          );
        return;
      }

      // Check if account is locked
      if (user.lockUntil && user.lockUntil > new Date()) {
        const remainingTime = Math.ceil(
          (user.lockUntil.getTime() - Date.now()) / 1000 / 60,
        );
        res.status(423).json(
          ResponseUtils.error(
            'ACCOUNT_LOCKED',
            `Account is temporarily locked. Please try again in ${remainingTime} minutes.`,
            {
              lockUntil: user.lockUntil,
              remainingMinutes: remainingTime,
            },
          ),
        );
        return;
      }

      // Check account status
      if (user.accountStatus === 'SUSPENDED') {
        res
          .status(403)
          .json(ResponseUtils.error('ACCOUNT_SUSPENDED', 'Account has been suspended'));
        return;
      }

      // Generate temporary token for next step
      const tempToken = JwtUtils.generateTempToken(
        {
          userId: user.id,
          phoneNumber: user.phoneNumber,
          purpose: 'PIN_VERIFICATION',
          step: 'LOGIN_STEP_2',
        },
        config.jwt.tempTokenExpiresIn,
      );

      logger.info(`Login step 1 completed for user: ${user.phoneNumber}`);

      res.status(200).json(
        ResponseUtils.success(
          {
            tempToken,
            nextStep: 'PIN_VERIFICATION',
            expiresIn: config.jwt.tempTokenExpiresIn,
          },
          'Phone number validated. Please enter your PIN.',
        ),
      );
    } catch (error) {
      logger.error('Validate phone for login error:', error);
      res
        .status(500)
        .json(
          ResponseUtils.error('INTERNAL_ERROR', 'Failed to validate phone number'),
        );
    }
  }

  /**
   * Step 2 - LOGIN: Verify PIN and complete login
   * POST /api/step-auth/login/verify-pin
   */
  static async verifyPinAndLogin(req: Request, res: Response): Promise<void> {
    try {
      const { tempToken, pin, deviceId, deviceToken } = req.body;

      // Verify temporary token
      let decoded;
      try {
        decoded = JwtUtils.verifyTempToken(tempToken);
      } catch (error) {
        res
          .status(401)
          .json(
            ResponseUtils.error('INVALID_TOKEN', 'Invalid or expired temporary token'),
          );
        return;
      }

      // Validate decoded token purpose
      if (decoded.purpose !== 'PIN_VERIFICATION' || decoded.step !== 'LOGIN_STEP_2') {
        res
          .status(400)
          .json(ResponseUtils.error('INVALID_TOKEN_PURPOSE', 'Invalid token purpose'));
        return;
      }

      // Get user
      const user = await db.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          phoneNumber: true,
          name: true,
          email: true,
          pinHash: true,
          accountStatus: true,
          biometricEnabled: true,
          loginAttempts: true,
          lockUntil: true,
        },
      });

      if (!user) {
        res.status(404).json(ResponseUtils.error('USER_NOT_FOUND', 'User not found'));
        return;
      }

      // Verify PIN
      const isPinValid = await HashUtils.compare(pin, user.pinHash);

      if (!isPinValid) {
        // Increment failed attempts
        const newAttempts = user.loginAttempts + 1;
        const shouldLock = newAttempts >= config.security.maxLoginAttempts;

        await db.user.update({
          where: { id: user.id },
          data: {
            loginAttempts: newAttempts,
            lockUntil: shouldLock
              ? new Date(Date.now() + config.security.accountLockoutTimeMs)
              : null,
          },
        });

        if (shouldLock) {
          res.status(423).json(
            ResponseUtils.error(
              'ACCOUNT_LOCKED',
              'Too many failed login attempts. Account has been temporarily locked.',
              {
                lockDurationMinutes: config.security.accountLockoutTimeMs / 1000 / 60,
              },
            ),
          );
        } else {
          res.status(401).json(
            ResponseUtils.error('INVALID_PIN', 'Incorrect PIN', {
              remainingAttempts: config.security.maxLoginAttempts - newAttempts,
            }),
          );
        }

        logger.warn(`Failed login attempt for user: ${user.phoneNumber}`);
        return;
      }

      // Reset login attempts on successful login
      await db.user.update({
        where: { id: user.id },
        data: {
          loginAttempts: 0,
          lockUntil: null,
          lastLoginAt: new Date(),
        },
      });

      // Generate session
      const sessionId = uuidv4();
      const accessToken = JwtUtils.generateAccessToken({
        userId: user.id,
        phoneNumber: user.phoneNumber,
        accountStatus: user.accountStatus,
      });

      const refreshToken = JwtUtils.generateRefreshToken({
        userId: user.id,
        sessionId,
      });

      // Create session record
      const expiresAt = new Date(
        Date.now() + parseTimeToMs(config.session.expiresIn),
      );

      await db.session.create({
        data: {
          id: sessionId,
          userId: user.id,
          refreshToken,
          deviceInfo: getDeviceInfo(req.headers['user-agent']),
          ipAddress: getIpAddress(req),
          expiresAt,
          isActive: true,
        },
      });

      // Update or create device token if provided
      if (deviceId && deviceToken) {
        await db.deviceToken.upsert({
          where: {
            deviceId_deviceToken: {
              deviceId,
              deviceToken,
            },
          },
          update: {
            userId: user.id,
            isActive: true,
            lastUsedAt: new Date(),
            ipAddress: getIpAddress(req),
          },
          create: {
            userId: user.id,
            deviceId,
            deviceToken,
            deviceInfo: getDeviceInfo(req.headers['user-agent']),
            platform: req.body.platform || 'unknown',
            appVersion: req.body.appVersion,
            ipAddress: getIpAddress(req),
            expiresAt: new Date(
              Date.now() + parseTimeToMs(config.session.deviceTokenExpiresIn),
            ),
          },
        });
      }

      logger.info(`User logged in successfully: ${user.phoneNumber}`);

      res.status(200).json(
        ResponseUtils.success(
          {
            accessToken,
            refreshToken,
            expiresIn: config.jwt.expiresIn,
            user: {
              id: user.id,
              phoneNumber: user.phoneNumber,
              name: user.name,
              email: user.email,
              accountStatus: user.accountStatus,
              biometricEnabled: user.biometricEnabled,
            },
          },
          'Login successful',
        ),
      );
    } catch (error) {
      logger.error('Verify PIN and login error:', error);
      res
        .status(500)
        .json(ResponseUtils.error('INTERNAL_ERROR', 'Failed to complete login'));
    }
  }

  /**
   * Step 1 - REGISTRATION: Validate phone number for registration
   * POST /api/step-auth/register/validate-phone
   */
  static async validatePhoneForRegistration(req: Request, res: Response): Promise<void> {
    try {
      const { phoneNumber } = req.body;

      // Format and validate
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

      // Check if user already exists
      const existingUser = await db.user.findUnique({
        where: { phoneNumber: formattedPhone },
        select: { id: true, isVerified: true, accountStatus: true },
      });

      if (existingUser && existingUser.isVerified) {
        res.status(409).json(
          ResponseUtils.error(
            'USER_ALREADY_EXISTS',
            'User with this phone number already exists',
          ),
        );
        return;
      }

      // Generate temporary token
      const tempToken = JwtUtils.generateTempToken(
        {
          phoneNumber: formattedPhone,
          purpose: 'REGISTRATION',
          step: 'PIN_SETUP',
          existingUserId: existingUser?.id || null,
        },
        config.registration.tempTokenExpiresIn,
      );

      logger.info(`Registration step 1 completed for: ${formattedPhone}`);

      res.status(200).json(
        ResponseUtils.success(
          {
            tempToken,
            nextStep: 'PIN_SETUP',
            expiresIn: config.registration.tempTokenExpiresIn,
          },
          'Phone number validated. Please set up your PIN.',
        ),
      );
    } catch (error) {
      logger.error('Validate phone for registration error:', error);
      res
        .status(500)
        .json(
          ResponseUtils.error('INTERNAL_ERROR', 'Failed to validate phone number'),
        );
    }
  }

  /**
   * Step 2 - REGISTRATION: Setup PIN
   * POST /api/step-auth/register/setup-pin
   */
  static async setupPin(req: Request, res: Response): Promise<void> {
    try {
      const { tempToken, pin, confirmPin } = req.body;

      // Verify PINs match
      if (pin !== confirmPin) {
        res.status(400).json(ResponseUtils.error('PIN_MISMATCH', 'PINs do not match'));
        return;
      }

      // Verify temporary token
      let decoded;
      try {
        decoded = JwtUtils.verifyTempToken(tempToken);
      } catch (error) {
        res
          .status(401)
          .json(
            ResponseUtils.error('INVALID_TOKEN', 'Invalid or expired temporary token'),
          );
        return;
      }

      // Validate decoded token purpose
      if (decoded.purpose !== 'REGISTRATION' || decoded.step !== 'PIN_SETUP') {
        res
          .status(400)
          .json(ResponseUtils.error('INVALID_TOKEN_PURPOSE', 'Invalid token purpose'));
        return;
      }

      // Hash PIN
      const pinHash = await HashUtils.hash(pin);

      // Create or update user
      let user;
      if (decoded.existingUserId) {
        user = await db.user.update({
          where: { id: decoded.existingUserId },
          data: {
            pinHash,
            isVerified: false,
            accountStatus: 'PENDING_VERIFICATION',
          },
        });
      } else {
        user = await db.user.create({
          data: {
            phoneNumber: decoded.phoneNumber,
            pinHash,
            isVerified: false,
            accountStatus: 'PENDING_VERIFICATION',
          },
        });
      }

      // Generate token for profile setup
      const profileToken = JwtUtils.generateTempToken(
        {
          userId: user.id,
          phoneNumber: user.phoneNumber,
          purpose: 'PROFILE_SETUP',
          step: 'REGISTRATION_STEP_3',
        },
        config.registration.profileSetupExpiresIn,
      );

      logger.info(`Registration step 2 completed for user: ${user.phoneNumber}`);

      res.status(201).json(
        ResponseUtils.success(
          {
            tempToken: profileToken,
            nextStep: 'PROFILE_SETUP',
            expiresIn: config.registration.profileSetupExpiresIn,
          },
          'PIN set successfully. Please complete your profile.',
        ),
      );
    } catch (error) {
      logger.error('Setup PIN error:', error);
      res
        .status(500)
        .json(ResponseUtils.error('INTERNAL_ERROR', 'Failed to setup PIN'));
    }
  }

  /**
   * Step 3 - REGISTRATION: Complete profile (optional)
   * POST /api/step-auth/register/complete-profile
   */
  static async completeProfile(req: Request, res: Response): Promise<void> {
    try {
      const { tempToken, name, email } = req.body;

      // Verify temporary token
      let decoded;
      try {
        decoded = JwtUtils.verifyTempToken(tempToken);
      } catch (error) {
        res
          .status(401)
          .json(
            ResponseUtils.error('INVALID_TOKEN', 'Invalid or expired temporary token'),
          );
        return;
      }

      // Validate decoded token purpose
      if (
        decoded.purpose !== 'PROFILE_SETUP' ||
        decoded.step !== 'REGISTRATION_STEP_3'
      ) {
        res
          .status(400)
          .json(ResponseUtils.error('INVALID_TOKEN_PURPOSE', 'Invalid token purpose'));
        return;
      }

      // Update user profile
      const user = await db.user.update({
        where: { id: decoded.userId },
        data: {
          name: name || null,
          email: email || null,
          isVerified: true,
          accountStatus: 'ACTIVE',
        },
      });

      // Generate session
      const sessionId = uuidv4();
      const accessToken = JwtUtils.generateAccessToken({
        userId: user.id,
        phoneNumber: user.phoneNumber,
        accountStatus: user.accountStatus,
      });

      const refreshToken = JwtUtils.generateRefreshToken({
        userId: user.id,
        sessionId,
      });

      // Create session record
      const expiresAt = new Date(
        Date.now() + parseTimeToMs(config.session.expiresIn),
      );

      await db.session.create({
        data: {
          id: sessionId,
          userId: user.id,
          refreshToken,
          deviceInfo: getDeviceInfo(req.headers['user-agent']),
          ipAddress: getIpAddress(req),
          expiresAt,
          isActive: true,
        },
      });

      logger.info(`Registration completed for user: ${user.phoneNumber}`);

      res.status(201).json(
        ResponseUtils.success(
          {
            accessToken,
            refreshToken,
            expiresIn: config.jwt.expiresIn,
            user: {
              id: user.id,
              phoneNumber: user.phoneNumber,
              name: user.name,
              email: user.email,
              accountStatus: user.accountStatus,
              biometricEnabled: user.biometricEnabled,
            },
          },
          'Registration completed successfully',
        ),
      );
    } catch (error) {
      logger.error('Complete profile error:', error);
      res
        .status(500)
        .json(ResponseUtils.error('INTERNAL_ERROR', 'Failed to complete profile'));
    }
  }

  /**
   * Re-authenticate with PIN or Biometric
   * POST /api/step-auth/reauth/pin
   */
  static async reauthenticate(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { pin, authType, challengeId, signature, publicKey } = req.body;

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
          pinHash: true,
          biometricEnabled: true,
          biometricKeys: {
            where: { isActive: true },
            select: { publicKey: true },
          },
        },
      });

      if (!user) {
        res.status(404).json(ResponseUtils.error('USER_NOT_FOUND', 'User not found'));
        return;
      }

      // PIN authentication
      if (authType === 'pin') {
        const isPinValid = await HashUtils.compare(pin, user.pinHash);

        if (!isPinValid) {
          res.status(401).json(ResponseUtils.error('INVALID_PIN', 'Incorrect PIN'));
          return;
        }

        logger.info(`User re-authenticated with PIN: ${user.phoneNumber}`);
        res.status(200).json(
          ResponseUtils.success(
            { authenticated: true, method: 'pin' },
            'Re-authentication successful',
          ),
        );
        return;
      }

      // Biometric authentication
      if (authType === 'biometric') {
        if (!user.biometricEnabled) {
          res.status(400).json(
            ResponseUtils.error(
              'BIOMETRIC_NOT_ENABLED',
              'Biometric authentication is not enabled for this account',
            ),
          );
          return;
        }

        if (!challengeId || !signature || !publicKey) {
          res.status(400).json(
            ResponseUtils.error(
              'MISSING_BIOMETRIC_DATA',
              'Challenge ID, signature, and public key are required for biometric authentication',
            ),
          );
          return;
        }

        // Verify challenge exists and is valid
        const challenge = await db.biometricChallenge.findUnique({
          where: { id: challengeId },
        });

        if (!challenge) {
          res
            .status(404)
            .json(ResponseUtils.error('CHALLENGE_NOT_FOUND', 'Challenge not found'));
          return;
        }

        if (challenge.usedAt) {
          res
            .status(400)
            .json(
              ResponseUtils.error('CHALLENGE_ALREADY_USED', 'Challenge has already been used'),
            );
          return;
        }

        if (challenge.expiresAt < new Date()) {
          res
            .status(400)
            .json(ResponseUtils.error('CHALLENGE_EXPIRED', 'Challenge has expired'));
          return;
        }

        // Verify public key belongs to user
        const hasPublicKey = user.biometricKeys.some((key) => key.publicKey === publicKey);
        if (!hasPublicKey) {
          res.status(401).json(
            ResponseUtils.error(
              'INVALID_PUBLIC_KEY',
              'Public key not found for this user',
            ),
          );
          return;
        }

        // Mark challenge as used
        await db.biometricChallenge.update({
          where: { id: challengeId },
          data: { usedAt: new Date() },
        });

        // Update last used time for biometric key
        await db.userBiometricKey.updateMany({
          where: {
            userId: user.id,
            publicKey,
            isActive: true,
          },
          data: {
            lastUsedAt: new Date(),
          },
        });

        logger.info(`User re-authenticated with biometric: ${user.phoneNumber}`);
        res.status(200).json(
          ResponseUtils.success(
            { authenticated: true, method: 'biometric' },
            'Re-authentication successful',
          ),
        );
        return;
      }

      res.status(400).json(
        ResponseUtils.error('INVALID_AUTH_TYPE', 'Invalid authentication type'),
      );
    } catch (error) {
      logger.error('Re-authenticate error:', error);
      res
        .status(500)
        .json(ResponseUtils.error('INTERNAL_ERROR', 'Failed to re-authenticate'));
    }
  }
}
