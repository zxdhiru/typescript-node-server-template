import { Response } from 'express';
import { IApiResponse, IPaginatedResponse, IPaginationMeta } from '@/shared/types/response.types';
import { HTTP_STATUS } from '@/shared/constants';
import { AppError } from './errors';

/**
 * Success response helper
 */
export function successResponse<T>(
  res: Response,
  message: string,
  data?: T,
  statusCode: number = HTTP_STATUS.OK,
  pagination?: IPaginationMeta
): Response {
  const response: IApiResponse<T> = {
    success: true,
    message,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...(pagination && { pagination }),
    },
  };

  return res.status(statusCode).json(response);
}

/**
 * Error response helper
 */
export function errorResponse(
  res: Response,
  error: Error | AppError,
  requestId?: string
): Response {
  let statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let errorCode = 'INTERNAL_ERROR';
  let message = 'An unexpected error occurred';
  let details: unknown;

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    errorCode = error.code;
    message = error.message;
    details = error.details;
  } else {
    // Log unexpected errors
    console.error('Unexpected error:', error);
  }

  const response: IApiResponse = {
    success: false,
    message,
    error: {
      code: errorCode as never,
      ...(details && typeof details === 'object' ? { details } : {}),
    },
    meta: {
      timestamp: new Date().toISOString(),
      ...(requestId && { requestId }),
    },
  };

  return res.status(statusCode).json(response);
}

/**
 * Paginated response helper
 */
export function paginatedResponse<T>(
  res: Response,
  message: string,
  data: IPaginatedResponse<T>,
  statusCode: number = HTTP_STATUS.OK
): Response {
  return successResponse(res, message, data.items, statusCode, data.pagination);
}

/**
 * Created response helper (201)
 */
export function createdResponse<T>(res: Response, message: string, data?: T): Response {
  return successResponse(res, message, data, HTTP_STATUS.CREATED);
}

/**
 * No content response helper (204)
 */
export function noContentResponse(res: Response): Response {
  return res.status(HTTP_STATUS.NO_CONTENT).send();
}
