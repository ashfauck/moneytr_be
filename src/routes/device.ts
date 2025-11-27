import { Router } from 'express';
import { DeviceController } from '../controllers/deviceController';
import { authenticateToken } from '../middleware/auth';
import { body } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation';

const router = Router();

/**
 * Register device token
 * POST /api/device/register
 */
router.post(
  '/register',
  authenticateToken,
  body('deviceId').notEmpty().withMessage('Device ID is required'),
  body('deviceToken').notEmpty().withMessage('Device token is required'),
  body('platform')
    .optional()
    .isIn(['ios', 'android', 'web'])
    .withMessage('Invalid platform'),
  handleValidationErrors,
  DeviceController.registerDevice,
);

/**
 * Remove device
 * DELETE /api/device/:deviceId
 */
router.delete('/:deviceId', authenticateToken, DeviceController.removeDevice);

/**
 * List user's devices
 * GET /api/device/list
 */
router.get('/list', authenticateToken, DeviceController.listDevices);

export default router;
