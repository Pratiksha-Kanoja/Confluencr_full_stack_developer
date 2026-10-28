export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: any;

  constructor(statusCode: number, code: string, message: string, details?: any) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', details?: any) {
    super(404, 'NOT_FOUND', message, details);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request', details?: any) {
    super(400, 'BAD_REQUEST', message, details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists or conflict occurred', details?: any) {
    super(409, 'DUPLICATE_TRANSACTION', message, details);
  }
}

export class InsufficientBalanceError extends AppError {
  constructor(message: string = 'Transaction rejected: insufficient balance', details?: any) {
    super(422, 'INSUFFICIENT_BALANCE', message, details);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: any) {
    super(400, 'VALIDATION_ERROR', message, details);
  }
}
