/**
 * Shar    // Authentication errors
    EMAIL_NOT_VERIFIED: 'email_not_verified',
    INVALID_CREDENTIALS: 'invalid_credentials',
    ACCOUNT_DISABLED: 'account_disabled',
    ACCOUNT_LOCKED: 'account_locked',
    INVALID_AUTHORIZATION: 'invalid_authorization',
    INVALID_REFRESH_TOKEN: 'invalid_refresh_token',ror Constants
 *
 * Centralized error codes used across CineXplorer frontend and backend.
 * This ensures consistency and prevents drift between error definitions.
 *
 * Usage:
 * - Backend: Import and use in ValidationError(code=ERROR_CODES.EMAIL_NOT_VERIFIED)
 * - Frontend: Import and check error responses for these codes
 */

export const ERROR_CODES = {
	// Authentication errors
	EMAIL_NOT_VERIFIED: "email_not_verified",
	INVALID_CREDENTIALS: "invalid_credentials",
	ACCOUNT_DISABLED: "account_disabled",
	ACCOUNT_LOCKED: "account_locked",
	INVALID_AUTHORIZATION: "invalid_authorization",
	INVALID_REFRESH_TOKEN: "invalid_refresh_token",

	// User Management Errors
	USERNAME_EXISTS: "username_exists",
	EMAIL_EXISTS: "email_exists",
	INVALID_USERNAME: "invalid_username",
	WEAK_PASSWORD: "weak_password",

	// Movie Data Errors
	MOVIE_NOT_FOUND: "movie_not_found",
	INVALID_RATING: "invalid_rating",
	DUPLICATE_RATING: "duplicate_rating",

	// General API Errors
	VALIDATION_ERROR: "validation_error",
	PERMISSION_DENIED: "permission_denied",
	RESOURCE_NOT_FOUND: "resource_not_found",
	RATE_LIMITED: "rate_limited",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * Error Categories for better organization and handling
 */
export const ERROR_CATEGORIES = {
	AUTHENTICATION: "authentication",
	USER_MANAGEMENT: "user_management",
	MOVIE_DATA: "movie_data",
	API_GENERAL: "api_general",
} as const;

export type ErrorCategory =
	(typeof ERROR_CATEGORIES)[keyof typeof ERROR_CATEGORIES];

/**
 * Maps error codes to their categories for programmatic handling
 */
export const ERROR_CODE_TO_CATEGORY: Record<ErrorCode, ErrorCategory> = {
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
 * Helper function to check if an error code belongs to a category
 */
export const isErrorInCategory = (
	errorCode: string,
	category: ErrorCategory
): boolean => {
	return ERROR_CODE_TO_CATEGORY[errorCode as ErrorCode] === category;
};

/**
 * Helper function to get category for an error code
 */
export const getErrorCategory = (
	errorCode: string
): ErrorCategory | undefined => {
	return ERROR_CODE_TO_CATEGORY[errorCode as ErrorCode];
};
