import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import logger from '../utils/logger';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error(`${req.method} ${req.originalUrl} - ${err.message}`, { stack: err.stack });

  let statusCode = 500;
  let message = 'Internal server error';

  // Mongoose validation error
  if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = 'Validation error';
    const errors = Object.values(err.errors).map((error: any) => ({
      field: error.path,
      message: error.message,
    }));
    
    res.status(statusCode).json({
      success: false,
      message,
      errors,
    });
    return;
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 400;
    message = 'Duplicate field value entered';
    
    res.status(statusCode).json({
      success: false,
      message,
      field: Object.keys(err.keyPattern)[0],
    });
    return;
  }

  // Joi validation error
  if (err.isJoi) {
    statusCode = 400;
    message = 'Validation error';
    
    res.status(statusCode).json({
      success: false,
      message,
      errors: err.details,
    });
    return;
  }

  // Cast error (invalid ID)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // Custom error with status code
  if (err.statusCode) {
    statusCode = err.statusCode;
    message = err.message;
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};