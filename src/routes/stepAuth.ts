import { Router } from 'express';
import { StepAuthController } from '../controllers/stepAuthController';
import { BiometricController } from '../controllers/biometricController';
import { WebhookController } from '../controllers/webhookController';
import {
  phoneValidationLimiter,
  pinVerificationLimiter,
  registrationLimiter,
  loginLimiter,
  biometricLimiter,
} from '../middleware/rateLimiting';
import {
  validatePhoneNumber,
  validatePin,
  validateTempToken,
  validateDeviceInfo,
  validatePinConfirmation,
  validateEmail,
  validateName,
  validateBiometricEnrollment,
  validateWebhookApproval,
  handleValidationErrors,
} from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// ============================================
// LOGIN FLOW
// ============================================

/**
 * Step 1 - Login: Validate phone number
 * POST /api/step-auth/login/validate-phone
 */
router.post(
  '/login/validate-phone',
  loginLimiter,
  validatePhoneNumber(),
  handleValidationErrors,
  StepAuthController.validatePhoneForLogin,
);

/**
 * Step 2 - Login: Verify PIN and complete login
 * POST /api/step-auth/login/verify-pin
 */
router.post(
  '/login/verify-pin',
  pinVerificationLimiter,
  validateTempToken(),
  validatePin(),
  validateDeviceInfo(),
  handleValidationErrors,
  StepAuthController.verifyPinAndLogin,
);

// ============================================
// REGISTRATION FLOW
// ============================================

/**
 * Step 1 - Registration: Validate phone number
 * POST /api/step-auth/register/validate-phone
 */
router.post(
  '/register/validate-phone',
  registrationLimiter,
  validatePhoneNumber(),
  handleValidationErrors,
  StepAuthController.validatePhoneForRegistration,
);

/**
 * Step 2 - Registration: Setup PIN
 * POST /api/step-auth/register/setup-pin
 */
router.post(
  '/register/setup-pin',
  validateTempToken(),
  validatePinConfirmation(),
  handleValidationErrors,
  StepAuthController.setupPin,
);

/**
 * Step 3 - Registration: Complete profile
 * POST /api/step-auth/register/complete-profile
 */
router.post(
  '/register/complete-profile',
  validateTempToken(),
  validateName(false),
  validateEmail(false),
  handleValidationErrors,
  StepAuthController.completeProfile,
);

// ============================================
// RE-AUTHENTICATION
// ============================================

/**
 * Re-authenticate with PIN or Biometric
 * POST /api/step-auth/reauth/pin
 */
router.post(
  '/reauth/pin',
  authenticateToken,
  StepAuthController.reauthenticate,
);

// ============================================
// BIOMETRIC AUTHENTICATION
// ============================================

/**
 * Generate biometric challenge
 * POST /api/step-auth/biometric/challenge
 */
router.post(
  '/biometric/challenge',
  biometricLimiter,
  validatePhoneNumber(),
  handleValidationErrors,
  BiometricController.generateChallenge,
);

/**
 * Enroll biometric authentication
 * POST /api/step-auth/biometric/enroll
 */
router.post(
  '/biometric/enroll',
  authenticateToken,
  validateBiometricEnrollment(),
  handleValidationErrors,
  BiometricController.enrollBiometric,
);

/**
 * Disable biometric authentication
 * POST /api/step-auth/biometric/disable
 */
router.post(
  '/biometric/disable',
  authenticateToken,
  BiometricController.disableBiometric,
);

// ============================================
// WEBHOOK ENDPOINTS
// ============================================

/**
 * Approve authentication request with PIN
 * POST /api/step-auth/webhook/approve
 */
router.post(
  '/webhook/approve',
  authenticateToken,
  validateWebhookApproval(),
  handleValidationErrors,
  WebhookController.approveRequest,
);

/**
 * Reject authentication request
 * POST /api/step-auth/webhook/reject
 */
router.post(
  '/webhook/reject',
  authenticateToken,
  WebhookController.rejectRequest,
);

export default router;
