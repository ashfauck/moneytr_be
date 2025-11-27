import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { JwtUtils } from '../utils/jwt';
import { ResponseUtils } from '../utils/helpers';
import db from '../services/database';
import logger from '../utils/logger';

/**
 * Middleware to authenticate JWT tokens
 */
export async function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!token) {
      res.status(401).json(ResponseUtils.error('MISSING_TOKEN', 'Authentication token required'));
      return;
    }

    // Check if token is blacklisted
    const blacklistedToken = await db.blacklistedToken.findUnique({
      where: { token },
    });

    if (blacklistedToken) {
      res.status(401).json(ResponseUtils.error('TOKEN_BLACKLISTED', 'Token has been revoked'));
      return;
    }

    // Verify token
    try {
      const decoded = JwtUtils.verifyAccessToken(token);

      // Check if user still exists and account is active
      const user = await db.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          phoneNumber: true,
          accountStatus: true,
          isVerified: true,
        },
      });

      if (!user) {
        res.status(401).json(ResponseUtils.error('USER_NOT_FOUND', 'User no longer exists'));
        return;
      }

      if (user.accountStatus === 'SUSPENDED') {
        res
          .status(403)
          .json(ResponseUtils.error('ACCOUNT_SUSPENDED', 'Account has been suspended'));
        return;
      }

      // Attach user to request
      req.user = {
        userId: user.id,
        phoneNumber: user.phoneNumber,
        accountStatus: user.accountStatus,
      };

      next();
    } catch (error) {
      logger.error('Token verification failed:', error);
      res.status(401).json(ResponseUtils.error('INVALID_TOKEN', 'Invalid or expired token'));
    }
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    res.status(500).json(ResponseUtils.error('INTERNAL_ERROR', 'Authentication failed'));
  }
}

/**
 * Middleware to check if user is verified
 */
export async function requireVerified(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json(ResponseUtils.error('UNAUTHORIZED', 'Authentication required'));
      return;
    }

    const user = await db.user.findUnique({
      where: { id: req.user.userId },
      select: { isVerified: true },
    });

    if (!user?.isVerified) {
      res
        .status(403)
        .json(
          ResponseUtils.error('VERIFICATION_REQUIRED', 'Account verification required'),
        );
      return;
    }

    next();
  } catch (error) {
    logger.error('Verification check error:', error);
    res.status(500).json(ResponseUtils.error('INTERNAL_ERROR', 'Verification check failed'));
  }
}

/**
 * Middleware to check account status
 */
export function requireAccountStatus(allowedStatuses: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json(ResponseUtils.error('UNAUTHORIZED', 'Authentication required'));
      return;
    }

    if (!allowedStatuses.includes(req.user.accountStatus)) {
      res
        .status(403)
        .json(
          ResponseUtils.error('INSUFFICIENT_PERMISSIONS', 'Account status does not permit this action'),
        );
      return;
    }

    next();
  };
}
