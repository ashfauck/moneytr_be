import { body, ValidationChain, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { ValidationUtils, ResponseUtils } from '../utils/helpers';

/**
 * Middleware to handle validation errors
 */
export function handleValidationErrors(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    res.status(400).json(
      ResponseUtils.error('VALIDATION_ERROR', 'Invalid input data', {
        errors: errors.array(),
      }),
    );
    return;
  }

  next();
}

/**
 * Validation rules for phone number
 */
export const validatePhoneNumber = (): ValidationChain[] => [
  body('phoneNumber')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .custom((value) => {
      const formatted = ValidationUtils.formatPhoneNumber(value);
      if (!ValidationUtils.isValidPhoneNumber(formatted)) {
        throw new Error('Phone number must be in international format (e.g., +14155552671)');
      }
      return true;
    }),
];

/**
 * Validation rules for PIN
 */
export const validatePin = (): ValidationChain[] => [
  body('pin')
    .notEmpty()
    .withMessage('PIN is required')
    .isString()
    .withMessage('PIN must be a string')
    .custom((value) => {
      if (!ValidationUtils.isValidPin(value)) {
        throw new Error('PIN must be exactly 6 digits');
      }
      return true;
    }),
];

/**
 * Validation rules for email (optional)
 */
export const validateEmail = (required = false): ValidationChain[] => {
  const validator = body('email').trim();

  if (required) {
    validator.notEmpty().withMessage('Email is required');
  }

  return [
    validator.optional().custom((value) => {
      if (value && !ValidationUtils.isValidEmail(value)) {
        throw new Error('Invalid email format');
      }
      return true;
    }),
  ];
};

/**
 * Validation rules for name
 */
export const validateName = (required = false): ValidationChain[] => {
  const validator = body('name').trim();

  if (required) {
    validator.notEmpty().withMessage('Name is required');
  }

  return [
    validator.optional().custom((value) => {
      if (value && !ValidationUtils.isValidName(value)) {
        throw new Error('Name must be 2-50 characters, letters and spaces only');
      }
      return true;
    }),
  ];
};

/**
 * Validation rules for temp token
 */
export const validateTempToken = (): ValidationChain[] => [
  body('tempToken')
    .notEmpty()
    .withMessage('Temporary token is required')
    .isString()
    .withMessage('Invalid token format'),
];

/**
 * Validation rules for device info
 */
export const validateDeviceInfo = (): ValidationChain[] => [
  body('deviceId').optional().isString().withMessage('Device ID must be a string'),
  body('deviceToken').optional().isString().withMessage('Device token must be a string'),
];

/**
 * Validation rules for PIN confirmation
 */
export const validatePinConfirmation = (): ValidationChain[] => [
  ...validatePin(),
  body('confirmPin')
    .notEmpty()
    .withMessage('PIN confirmation is required')
    .custom((value, { req }) => {
      if (value !== req.body.pin) {
        throw new Error('PINs do not match');
      }
      return true;
    }),
];

/**
 * Validation rules for biometric enrollment
 */
export const validateBiometricEnrollment = (): ValidationChain[] => [
  body('publicKey').notEmpty().withMessage('Public key is required').isString(),
  body('biometryType')
    .notEmpty()
    .withMessage('Biometry type is required')
    .isIn(['TouchID', 'FaceID', 'Fingerprint', 'Iris'])
    .withMessage('Invalid biometry type'),
  body('deviceId').optional().isString(),
];

/**
 * Validation rules for biometric verification
 */
export const validateBiometricVerification = (): ValidationChain[] => [
  body('challengeId').notEmpty().withMessage('Challenge ID is required').isUUID(),
  body('signature').notEmpty().withMessage('Signature is required').isString(),
  body('publicKey').notEmpty().withMessage('Public key is required').isString(),
];

/**
 * Validation rules for webhook auth notification
 */
export const validateWebhookAuthNotify = (): ValidationChain[] => [
  ...validatePhoneNumber(),
  body('requesterId').notEmpty().withMessage('Requester ID is required').isString(),
  body('requesterName').notEmpty().withMessage('Requester name is required').isString(),
  body('requesterOrganization')
    .notEmpty()
    .withMessage('Requester organization is required')
    .isString(),
  body('requestType')
    .notEmpty()
    .withMessage('Request type is required')
    .isIn(['LOGIN', 'DOCUMENT_VERIFICATION', 'PAYMENT_AUTHORIZATION']),
  body('requestedPermissions').isArray().withMessage('Requested permissions must be an array'),
  body('description').notEmpty().withMessage('Description is required').isString(),
  body('expiresInMinutes')
    .optional()
    .isInt({ min: 1, max: 1440 })
    .withMessage('Expires in minutes must be between 1 and 1440 (24 hours)'),
];

/**
 * Validation rules for webhook approval
 */
export const validateWebhookApproval = (): ValidationChain[] => [
  body('requestId').notEmpty().withMessage('Request ID is required').isUUID(),
  ...validatePin(),
];

/**
 * Validation rules for change PIN
 */
export const validateChangePin = (): ValidationChain[] => [
  body('currentPin').notEmpty().withMessage('Current PIN is required'),
  body('newPin')
    .notEmpty()
    .withMessage('New PIN is required')
    .custom((value) => {
      if (!ValidationUtils.isValidPin(value)) {
        throw new Error('New PIN must be exactly 6 digits');
      }
      return true;
    }),
  body('confirmPin')
    .notEmpty()
    .withMessage('PIN confirmation is required')
    .custom((value, { req }) => {
      if (value !== req.body.newPin) {
        throw new Error('New PINs do not match');
      }
      return true;
    }),
];
