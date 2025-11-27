import rateLimit from 'express-rate-limit';
import { ValidationUtils } from '../utils/helpers';
import { Request } from 'express';

/**
 * Rate limiter for phone number validation
 */
export const phoneValidationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per phone number per window
  keyGenerator: (req: Request) => {
    const phoneNumber = req.body.phoneNumber;
    return phoneNumber ? ValidationUtils.formatPhoneNumber(phoneNumber) : req.ip || 'unknown';
  },
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many validation attempts. Please try again later.',
    },
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for PIN verification
 */
export const pinVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 PIN attempts per 15 minutes
  keyGenerator: (req: Request) => {
    return req.body.tempToken || req.ip || 'unknown';
  },
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_ATTEMPTS',
      message: 'Too many PIN attempts. Please try again later.',
    },
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for registration
 */
export const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registration attempts per hour
  keyGenerator: (req: Request) => {
    const phoneNumber = req.body.phoneNumber;
    return phoneNumber ? ValidationUtils.formatPhoneNumber(phoneNumber) : req.ip || 'unknown';
  },
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REGISTRATIONS',
      message: 'Too many registration attempts. Please try again later.',
    },
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for login attempts
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per 15 minutes
  keyGenerator: (req: Request) => {
    const phoneNumber = req.body.phoneNumber;
    return phoneNumber ? ValidationUtils.formatPhoneNumber(phoneNumber) : req.ip || 'unknown';
  },
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_LOGIN_ATTEMPTS',
      message: 'Too many login attempts. Please try again later.',
    },
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for biometric operations
 */
export const biometricLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 biometric operations per 15 minutes
  keyGenerator: (req: Request) => {
    return req.body.phoneNumber || req.ip || 'unknown';
  },
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_BIOMETRIC_ATTEMPTS',
      message: 'Too many biometric attempts. Please try again later.',
    },
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * General API rate limiter
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  keyGenerator: (req: Request) => {
    return req.ip || 'unknown';
  },
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
    },
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});
