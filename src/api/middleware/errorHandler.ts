import { NextFunction, Request, Response } from 'express';
import { AppError, ConflictError, NotFoundError, UnauthorizedError, ValidationError } from './errors.js';


export function errorHandler(
  error: Error,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) {
  console.error(error);

  if (error instanceof NotFoundError ||
      error instanceof ConflictError ||
      error instanceof ValidationError ||
      error instanceof UnauthorizedError) {
    res.status((error as AppError).statusCode).json({ error: error.message });
    return;
  }

  res.status(500).json({ error: 'Internal server error' });
}