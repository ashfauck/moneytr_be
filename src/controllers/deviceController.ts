import { Response } from 'express';
import { ResponseUtils, getDeviceInfo, getIpAddress, parseTimeToMs } from '../utils/helpers';
import db from '../services/database';
import logger from '../utils/logger';
import { AuthRequest } from '../types';
import config from '../utils/config';

export class DeviceController {
  /**
   * Register device token
   * POST /api/device/register
   */
  static async registerDevice(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res
          .status(401)
          .json(ResponseUtils.error('UNAUTHORIZED', 'Authentication required'));
        return;
      }

      const { deviceId, deviceToken, platform, appVersion } = req.body;

      if (!deviceId || !deviceToken) {
        res.status(400).json(
          ResponseUtils.error('MISSING_REQUIRED_FIELDS', 'Device ID and token are required'),
        );
        return;
      }

      // Upsert device token
      const device = await db.deviceToken.upsert({
        where: {
          deviceId_deviceToken: {
            deviceId,
            deviceToken,
          },
        },
        update: {
          userId: req.user.userId,
          isActive: true,
          lastUsedAt: new Date(),
          ipAddress: getIpAddress(req),
          platform: platform || 'unknown',
          appVersion: appVersion || null,
        },
        create: {
          userId: req.user.userId,
          deviceId,
          deviceToken,
          deviceInfo: getDeviceInfo(req.headers['user-agent']),
          platform: platform || 'unknown',
          appVersion: appVersion || null,
          ipAddress: getIpAddress(req),
          expiresAt: new Date(
            Date.now() + parseTimeToMs(config.session.deviceTokenExpiresIn),
          ),
        },
      });

      logger.info(`Device registered for user: ${req.user.phoneNumber}`);

      res.status(200).json(
        ResponseUtils.success(
          {
            id: device.id,
            deviceId: device.deviceId,
            platform: device.platform,
            isActive: device.isActive,
            createdAt: device.createdAt,
          },
          'Device registered successfully',
        ),
      );
    } catch (error) {
      logger.error('Register device error:', error);
      res
        .status(500)
        .json(ResponseUtils.error('INTERNAL_ERROR', 'Failed to register device'));
    }
  }

  /**
   * Remove device
   * DELETE /api/device/:deviceId
   */
  static async removeDevice(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res
          .status(401)
          .json(ResponseUtils.error('UNAUTHORIZED', 'Authentication required'));
        return;
      }

      const { deviceId } = req.params;

      // Deactivate device
      const result = await db.deviceToken.updateMany({
        where: {
          deviceId,
          userId: req.user.userId,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });

      if (result.count === 0) {
        res.status(404).json(ResponseUtils.error('DEVICE_NOT_FOUND', 'Device not found'));
        return;
      }

      logger.info(`Device removed for user: ${req.user.phoneNumber}`);

      res.status(200).json(ResponseUtils.success({}, 'Device removed successfully'));
    } catch (error) {
      logger.error('Remove device error:', error);
      res
        .status(500)
        .json(ResponseUtils.error('INTERNAL_ERROR', 'Failed to remove device'));
    }
  }

  /**
   * List user's devices
   * GET /api/device/list
   */
  static async listDevices(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res
          .status(401)
          .json(ResponseUtils.error('UNAUTHORIZED', 'Authentication required'));
        return;
      }

      const devices = await db.deviceToken.findMany({
        where: {
          userId: req.user.userId,
          isActive: true,
        },
        select: {
          id: true,
          deviceId: true,
          deviceInfo: true,
          platform: true,
          appVersion: true,
          lastUsedAt: true,
          createdAt: true,
          ipAddress: true,
        },
        orderBy: {
          lastUsedAt: 'desc',
        },
      });

      res.status(200).json(
        ResponseUtils.success(
          {
            devices,
            count: devices.length,
          },
          'Devices retrieved successfully',
        ),
      );
    } catch (error) {
      logger.error('List devices error:', error);
      res
        .status(500)
        .json(ResponseUtils.error('INTERNAL_ERROR', 'Failed to list devices'));
    }
  }
}
