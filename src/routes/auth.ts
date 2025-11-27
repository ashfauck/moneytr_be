import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { body } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation';

const router = Router();

/**
 * Refresh access token
 * POST /api/auth/refresh-token
 */
router.post(
  '/refresh-token',
  body('refreshToken').notEmpty().withMessage('Refresh token is required'),
  handleValidationErrors,
  AuthController.refreshToken,
);

/**
 * Logout and invalidate session
 * POST /api/auth/logout
 */
router.post('/logout', AuthController.logout);

export default router;
