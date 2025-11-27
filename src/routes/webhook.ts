import { Router } from 'express';
import { WebhookController } from '../controllers/webhookController';
import { validateWebhookAuthNotify, handleValidationErrors } from '../middleware/validation';

const router = Router();

/**
 * Send authentication request notification
 * POST /api/webhook/auth-notify
 */
router.post(
  '/auth-notify',
  validateWebhookAuthNotify(),
  handleValidationErrors,
  WebhookController.sendAuthNotification,
);

/**
 * Check authentication request status
 * GET /api/webhook/auth-status?requestId=xxx
 */
router.get('/auth-status', WebhookController.checkRequestStatus);

export default router;
