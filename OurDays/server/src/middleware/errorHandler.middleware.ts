import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export function errorHandler(err: Error & { code?: string; meta?: { target?: string[] } }, _req: Request, res: Response, _next: NextFunction) {
  logger.error({ err }, 'Unhandled error');

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }

  // Prisma known errors
  if (err.name === 'PrismaClientKnownRequestError') {
    if (err.code === 'P2002') {
      const target = err.meta?.target;
      const field = Array.isArray(target) ? target[0] : 'field';
      return res.status(409).json({
        success: false,
        message: `A record with this ${field} already exists`,
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Record not found',
      });
    }
  }

  // Prisma connection errors
  if (err.name === 'PrismaClientInitializationError') {
    return res.status(503).json({
      success: false,
      message: 'Database connection failed. Please try again later.',
    });
  }

  res.status(500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
}
