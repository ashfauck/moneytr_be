import { Request, Response, NextFunction } from 'express';
import { ResponseUtils } from '../utils/helpers';
import logger from '../utils/logger';

/**
 * Global error handler middleware
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  logger.error('Error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  // Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any;

    // Unique constraint violation
    if (prismaError.code === 'P2002') {
      res.status(409).json(
        ResponseUtils.error(
          'DUPLICATE_ENTRY',
          'A record with this information already exists',
          {
            field: prismaError.meta?.target,
          },
        ),
      );
      return;
    }

    // Record not found
    if (prismaError.code === 'P2025') {
      res.status(404).json(
        ResponseUtils.error('NOT_FOUND', 'The requested resource was not found'),
      );
      return;
    }
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json(ResponseUtils.error('INVALID_TOKEN', 'Invalid authentication token'));
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json(ResponseUtils.error('TOKEN_EXPIRED', 'Authentication token expired'));
    return;
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    res.status(400).json(
      ResponseUtils.error('VALIDATION_ERROR', 'Invalid input data', {
        details: err.message,
      }),
    );
    return;
  }

  // Default error
  const statusCode = (err as any).statusCode || 500;
  const message = (err as any).message || 'Internal server error';

  res.status(statusCode).json(
    ResponseUtils.error('INTERNAL_ERROR', message),
  );
}

/**
 * 404 handler for undefined routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json(
    ResponseUtils.error(
      'ROUTE_NOT_FOUND',
      `Route ${req.method} ${req.path} not found`,
    ),
  );
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
