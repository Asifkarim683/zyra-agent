import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../config/logger.js';
import { config } from '../config/index.js';

/**
 * Global error handler middleware.
 * Catches all unhandled errors, logs them, and returns a standardized response.
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  logger.error(`Unhandled error: ${err.message}`, { 
    stack: err.stack,
    path: req.path,
    method: req.method 
  });

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.errors,
      status: 400,
    });
  }

  const status = (err as any).status || 500;
  const errorResponse: { error: string; status: number; stack?: string } = {
    error: err.message || 'Internal Server Error',
    status,
  };

  if (config.nodeEnv === 'development') {
    errorResponse.stack = err.stack;
  }

  res.status(status).json(errorResponse);
};
