import jwt from 'jsonwebtoken';
import config from './config';

interface AccessTokenPayload {
  userId: string;
  phoneNumber: string;
  accountStatus: string;
}

interface RefreshTokenPayload {
  userId: string;
  sessionId: string;
}

interface TempTokenPayload {
  [key: string]: any;
  purpose: string;
  step?: string;
}

export class JwtUtils {
  /**
   * Generate access token
   */
  static generateAccessToken(payload: AccessTokenPayload): string {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });
  }

  /**
   * Generate refresh token
   */
  static generateRefreshToken(payload: RefreshTokenPayload): string {
    return jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn,
    });
  }

  /**
   * Generate temporary token (for multi-step flows)
   */
  static generateTempToken(payload: TempTokenPayload, expiresIn?: string): string {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: expiresIn || config.jwt.tempTokenExpiresIn,
    });
  }

  /**
   * Verify access token
   */
  static verifyAccessToken(token: string): any {
    try {
      return jwt.verify(token, config.jwt.secret);
    } catch (error) {
      throw new Error('Invalid or expired access token');
    }
  }

  /**
   * Verify refresh token
   */
  static verifyRefreshToken(token: string): any {
    try {
      return jwt.verify(token, config.jwt.refreshSecret);
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Verify temporary token
   */
  static verifyTempToken(token: string): any {
    try {
      return jwt.verify(token, config.jwt.secret);
    } catch (error) {
      throw new Error('Invalid or expired temporary token');
    }
  }

  /**
   * Decode token without verification (use cautiously)
   */
  static decode(token: string): any {
    return jwt.decode(token);
  }
}
