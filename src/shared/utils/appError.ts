export class AppError extends Error {
  public statusCode: number;
  public success: boolean;
  public isOperational: boolean;

  constructor(message: string, statusCode = 500) {
    super(message);

    this.statusCode = statusCode;
    this.success = false;
    this.isOperational = true;

    Object.setPrototypeOf(this, AppError.prototype);

    Error.captureStackTrace(this, this.constructor);
  }
}
