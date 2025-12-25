/**
 * Error Utilities
 *
 * Shared helpers for handling Axios errors consistently across the application.
 * Provides type-safe error inspection without requiring direct Axios type imports.
 */

/**
 * Shape of Axios-like errors with response data.
 * Used for type narrowing without importing Axios types directly.
 */
export interface AxiosErrorLike {
    response?: {
        status?: number;
        data?: {
            detail?: string;
            error?: string;
            message?: string;
        };
    };
    message?: string;
}

/**
 * Type guard for Axios-like errors.
 * Returns true if the error has a response property (characteristic of Axios errors).
 */
export function isAxiosError(error: unknown): error is AxiosErrorLike {
    return (
        typeof error === 'object' &&
        error !== null &&
        'response' in error
    );
}

/**
 * Extract HTTP status code from an error.
 * Returns undefined if the error is not an Axios error or has no status.
 */
export function getErrorStatus(error: unknown): number | undefined {
    if (isAxiosError(error)) {
        return error.response?.status;
    }
    return undefined;
}

/**
 * Check if an error has a specific HTTP status code.
 * Convenience wrapper for common status checks (e.g., 401, 429, 500).
 *
 * @example
 * if (hasErrorStatus(error, 429)) {
 *     showRateLimitMessage();
 * }
 */
export function hasErrorStatus(error: unknown, status: number): boolean {
    return getErrorStatus(error) === status;
}

/**
 * Extract a human-readable error message from an error.
 * Checks various backend error message formats (detail, error, message).
 */
export function getErrorMessage(error: unknown): string {
    if (isAxiosError(error)) {
        // Check various backend error message formats
        const data = error.response?.data;
        return data?.detail ?? data?.error ?? data?.message ?? error.message ?? '';
    }
    if (error instanceof Error) {
        return error.message;
    }
    return '';
}
