import { ErrorCode, HTTP_STATUS } from "@/shared/constants";

/**
 * Standard API response format
 * Ensures consistency across all endpoints
 */
export interface IApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: {
    code: ErrorCode;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
    pagination?: IPaginationMeta;
  };
}

/**
 * Pagination metadata for list responses
 */
export interface IPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Paginated response wrapper
 */
export interface IPaginatedResponse<T> {
  items: T[];
  pagination: IPaginationMeta;
}
