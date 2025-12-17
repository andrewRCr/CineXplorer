/**
 * Error Types
 *
 * Type aliases and constants from auto-generated API types (Django Ninja OpenAPI).
 * Single source of truth for error codes - generated from backend Pydantic enums.
 */

import type { components } from '@/types/api';

// =============================================================================
// Core Types (from OpenAPI)
// =============================================================================

/**
 * All available error codes returned by the API.
 * Auto-generated from backend ErrorCode enum.
 */
export type ErrorCode = components['schemas']['ErrorCode'];

/**
 * Error categories for grouping related error codes.
 * Auto-generated from backend ErrorCategory enum.
 */
export type ErrorCategory = components['schemas']['ErrorCategory'];

/**
 * Standard API error structure.
 */
export type ApiError = components['schemas']['ApiErrorSchema'];

// =============================================================================
// Error Code Constants
// =============================================================================

/**
 * Error code constants for type-safe comparisons.
 * Use these instead of string literals for compile-time checking.
 *
 * @example
 * if (response.error.code === ERROR_CODES.EMAIL_NOT_VERIFIED) {
 *   // Handle email verification required
 * }
 */
export const ERROR_CODES = {
  // Authentication errors
  EMAIL_NOT_VERIFIED: 'email_not_verified',
  INVALID_CREDENTIALS: 'invalid_credentials',
  ACCOUNT_DISABLED: 'account_disabled',
  ACCOUNT_LOCKED: 'account_locked',
  INVALID_AUTHORIZATION: 'invalid_authorization',
  INVALID_REFRESH_TOKEN: 'invalid_refresh_token',

  // User Management Errors
  USERNAME_EXISTS: 'username_exists',
  EMAIL_EXISTS: 'email_exists',
  INVALID_USERNAME: 'invalid_username',
  WEAK_PASSWORD: 'weak_password',

  // Movie Data Errors
  MOVIE_NOT_FOUND: 'movie_not_found',
  INVALID_RATING: 'invalid_rating',
  DUPLICATE_RATING: 'duplicate_rating',

  // General API Errors
  VALIDATION_ERROR: 'validation_error',
  PERMISSION_DENIED: 'permission_denied',
  RESOURCE_NOT_FOUND: 'resource_not_found',
  RATE_LIMITED: 'rate_limited',
} as const satisfies Record<string, ErrorCode>;

/**
 * Error category constants.
 */
export const ERROR_CATEGORIES = {
  AUTHENTICATION: 'authentication',
  USER_MANAGEMENT: 'user_management',
  MOVIE_DATA: 'movie_data',
  API_GENERAL: 'api_general',
} as const satisfies Record<string, ErrorCategory>;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Maps error codes to their categories.
 */
const ERROR_CODE_TO_CATEGORY: Record<ErrorCode, ErrorCategory> = {
  [ERROR_CODES.EMAIL_NOT_VERIFIED]: ERROR_CATEGORIES.AUTHENTICATION,
  [ERROR_CODES.INVALID_CREDENTIALS]: ERROR_CATEGORIES.AUTHENTICATION,
  [ERROR_CODES.ACCOUNT_DISABLED]: ERROR_CATEGORIES.AUTHENTICATION,
  [ERROR_CODES.ACCOUNT_LOCKED]: ERROR_CATEGORIES.AUTHENTICATION,
  [ERROR_CODES.INVALID_AUTHORIZATION]: ERROR_CATEGORIES.AUTHENTICATION,
  [ERROR_CODES.INVALID_REFRESH_TOKEN]: ERROR_CATEGORIES.AUTHENTICATION,

  [ERROR_CODES.USERNAME_EXISTS]: ERROR_CATEGORIES.USER_MANAGEMENT,
  [ERROR_CODES.EMAIL_EXISTS]: ERROR_CATEGORIES.USER_MANAGEMENT,
  [ERROR_CODES.INVALID_USERNAME]: ERROR_CATEGORIES.USER_MANAGEMENT,
  [ERROR_CODES.WEAK_PASSWORD]: ERROR_CATEGORIES.USER_MANAGEMENT,

  [ERROR_CODES.MOVIE_NOT_FOUND]: ERROR_CATEGORIES.MOVIE_DATA,
  [ERROR_CODES.INVALID_RATING]: ERROR_CATEGORIES.MOVIE_DATA,
  [ERROR_CODES.DUPLICATE_RATING]: ERROR_CATEGORIES.MOVIE_DATA,

  [ERROR_CODES.VALIDATION_ERROR]: ERROR_CATEGORIES.API_GENERAL,
  [ERROR_CODES.PERMISSION_DENIED]: ERROR_CATEGORIES.API_GENERAL,
  [ERROR_CODES.RESOURCE_NOT_FOUND]: ERROR_CATEGORIES.API_GENERAL,
  [ERROR_CODES.RATE_LIMITED]: ERROR_CATEGORIES.API_GENERAL,
};

/**
 * Check if an error code belongs to a specific category.
 */
export const isErrorInCategory = (
  errorCode: string,
  category: ErrorCategory
): boolean => {
  return ERROR_CODE_TO_CATEGORY[errorCode as ErrorCode] === category;
};

/**
 * Get the category for an error code.
 */
export const getErrorCategory = (
  errorCode: string
): ErrorCategory | undefined => {
  return ERROR_CODE_TO_CATEGORY[errorCode as ErrorCode];
};
