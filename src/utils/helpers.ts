import crypto from 'crypto';

/**
 * Validation utilities for phone numbers, PINs, emails, etc.
 */
export class ValidationUtils {
  /**
   * Validate phone number (International format with country code)
   * Examples: +14155552671, +966501234567, +919876543210
   */
  static isValidPhoneNumber(phoneNumber: string): boolean {
    // International E.164 format: + followed by 1-15 digits
    const internationalPhoneRegex = /^\+[1-9]\d{1,14}$/;
    return internationalPhoneRegex.test(phoneNumber);
  }

  /**
   * Format phone number to E.164 format
   * Removes spaces, dashes, parentheses
   */
  static formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters except leading +
    let formatted = phoneNumber.replace(/[^\d+]/g, '');

    // Ensure it starts with +
    if (!formatted.startsWith('+')) {
      formatted = '+' + formatted;
    }

    return formatted;
  }

  /**
   * Validate PIN (6-digit numeric)
   */
  static isValidPin(pin: string): boolean {
    return /^\d{6}$/.test(pin);
  }

  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate name (2-50 characters, letters and spaces only)
   */
  static isValidName(name: string): boolean {
    return /^[a-zA-Z\s]{2,50}$/.test(name);
  }
}

/**
 * Response utilities for consistent API responses
 */
export class ResponseUtils {
  static success(data: any, message = 'Success') {
    return {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
    };
  }

  static error(code: string, message: string, details?: any) {
    return {
      success: false,
      error: {
        code,
        message,
        details,
      },
      timestamp: new Date().toISOString(),
    };
  }

  static paginated(data: any[], page: number, limit: number, total: number) {
    return {
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Generate random strings for challenges, tokens, etc.
 */
export function generateChallenge(length: number): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate random 2-digit verification number
 */
export function generateVerificationNumber(): number {
  return Math.floor(Math.random() * 90) + 10; // 10-99
}

/**
 * Parse time string to milliseconds
 * Examples: '15m', '7d', '1h'
 */
export function parseTimeToMs(timeString: string): number {
  const units: { [key: string]: number } = {
    ms: 1,
    s: 1000,
    m: 60000,
    h: 3600000,
    d: 86400000,
  };

  const match = timeString.match(/^(\d+)(ms|s|m|h|d)$/);
  if (!match) {
    throw new Error('Invalid time format');
  }

  const [, value, unit] = match;
  return parseInt(value, 10) * units[unit];
}

/**
 * Get device info from request
 */
export function getDeviceInfo(userAgent?: string): string {
  if (!userAgent) return 'Unknown Device';

  // Simple device detection (can be enhanced with ua-parser-js)
  if (userAgent.includes('iPhone')) return 'iPhone';
  if (userAgent.includes('iPad')) return 'iPad';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('Windows')) return 'Windows PC';
  if (userAgent.includes('Mac')) return 'Mac';
  if (userAgent.includes('Linux')) return 'Linux';

  return 'Unknown Device';
}

/**
 * Get IP address from request
 */
export function getIpAddress(req: any): string {
  return (
    req.headers['x-forwarded-for']?.split(',')[0] ||
    req.headers['x-real-ip'] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    'Unknown'
  );
}
