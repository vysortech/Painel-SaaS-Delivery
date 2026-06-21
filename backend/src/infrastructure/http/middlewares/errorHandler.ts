import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../../domain/errors/AppError';
import { logger } from '../../../shared/logger';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err instanceof AppError) {
    logger.warn({ message: err.message, statusCode: err.statusCode }, 'AppError handled');
    return res.status(err.statusCode).json({ error: err.message });
  }

  logger.error({ err, path: req.path, method: req.method }, 'Unhandled internal error');
  return res.status(500).json({ error: 'Erro interno do servidor' });
}
