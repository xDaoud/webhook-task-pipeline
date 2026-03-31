/**
 * Base class for application-level errors that should be sent to the client.
 * The errorHandler middleware checks instanceof AppError to distinguish these
 * from unexpected runtime errors, which become generic 500 responses.
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(404, message);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message);
    this.name = "ConflictError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message);
    this.name = "ValidationError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string) {
    super(401, message);
    this.name = "UnauthorizedError";
  }
}
