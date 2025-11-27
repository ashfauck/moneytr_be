import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authenticateToken } from '../middleware/auth';
import {
  validateEmail,
  validateName,
  validateChangePin,
  handleValidationErrors,
} from '../middleware/validation';

const router = Router();

/**
 * Get user profile
 * GET /api/user/profile
 */
router.get('/profile', authenticateToken, UserController.getProfile);

/**
 * Update user profile
 * PATCH /api/user/profile
 */
router.patch(
  '/profile',
  authenticateToken,
  validateName(false),
  validateEmail(false),
  handleValidationErrors,
  UserController.updateProfile,
);

/**
 * Change PIN
 * POST /api/user/change-pin
 */
router.post(
  '/change-pin',
  authenticateToken,
  validateChangePin(),
  handleValidationErrors,
  UserController.changePin,
);

/**
 * List active sessions
 * GET /api/user/sessions
 */
router.get('/sessions', authenticateToken, UserController.listSessions);

/**
 * Terminate session
 * DELETE /api/user/sessions/:sessionId
 */
router.delete('/sessions/:sessionId', authenticateToken, UserController.terminateSession);

export default router;
