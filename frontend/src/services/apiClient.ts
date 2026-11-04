import { isRecord } from "@/utilities/typeGuards";
import { apiBaseUrl as BASE_URL } from "@/config/baseUrls";
import axios, { CanceledError, type InternalAxiosRequestConfig } from "axios";
import {
    clearAuthTokens,
    getAuthTokens,
    setAuthTokens,
} from "@/utilities/tokenUtils";
import logger from "./logger";
import { getPaginationContextId } from "./paginationContext";
import { toaster } from "@/components/core/chakra/toaster";

// Debug: Log the base URL being used
logger.debug("[apiClient] BASE_URL configured", { BASE_URL });

/**
 * Axios client configured for two-pattern authentication.
 *
 * Pattern 1 - Email/Password (JWT):
 * - Access tokens sent in Authorization header (from localStorage/sessionStorage)
 * - Refresh tokens sent as HTTP-only cookie (withCredentials: true)
 * - Automatic token refresh on 401 responses
 *
 * Pattern 2 - OAuth (Session):
 * - Session cookies sent automatically (withCredentials: true)
 * - No Authorization header (session-based authentication only)
 * - No token refresh needed (session managed by backend)
 *
 * Request queuing prevents concurrent refresh calls.
 */
const apiClient = axios.create({
    baseURL: BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
    // CRITICAL: Send cookies with every request
    // - OAuth: Session cookie (HTTP-only, manages authentication)
    // - Email/Password: Refresh token cookie (HTTP-only, for token refresh)
    withCredentials: true,
});

// Token refresh state management
let isRefreshing = false;
interface RefreshSubscriber {
    resolve: (token: string) => void;
    reject: (error: unknown) => void;
}
let refreshSubscribers: RefreshSubscriber[] = [];

/**
 * Adds a callback to be executed when token refresh completes
 */
function subscribeTokenRefresh(subscriber: RefreshSubscriber): void {
    refreshSubscribers.push(subscriber);
}

/**
 * Notifies all subscribers with the new access token
 */
function onTokenRefreshed(token: string): void {
    const subscribers = refreshSubscribers;
    refreshSubscribers = [];
    subscribers.forEach((subscriber) => subscriber.resolve(token));
}

/** Reject requests waiting on a failed refresh before starting any cleanup. */
function onTokenRefreshFailed(error: unknown): void {
    const subscribers = refreshSubscribers;
    refreshSubscribers = [];
    subscribers.forEach((subscriber) => subscriber.reject(error));
}

// Request interceptor: Attach JWT access token (email/password), CSRF token, and pagination context
apiClient.interceptors.request.use((config) => {
    // Attach JWT access token from storage (email/password authentication only)
    // OAuth users authenticate via session cookie automatically (no Authorization header needed)
    const { access_token } = getAuthTokens();
    if (access_token) {
        config.headers.Authorization = `Bearer ${access_token}`;
    }

    // Attach CSRF token from cookie for unsafe methods (required for both auth patterns)
    const unsafeMethods = ["post", "put", "patch", "delete"];
    if (config.method && unsafeMethods.includes(config.method.toLowerCase())) {
        const csrfToken = document.cookie
            .split("; ")
            .find((row) => row.startsWith("XSRF-TOKEN="))
            ?.split("=")[1];
        if (csrfToken) {
            config.headers["X-CSRFToken"] = csrfToken;
        }
    }

    // Attach pagination context ID for movie endpoints (multi-tab isolation)
    // This ID is unique per page load and helps the backend track which movies
    // have been returned in this tab's pagination session
    const movieEndpoints = [
        "/movies/browse",
        "/movies/now-playing",
        "/movies/upcoming",
        "/movies/search",
    ];
    const url = config.url ?? "";
    if (movieEndpoints.some((endpoint) => url.includes(endpoint))) {
        config.headers["X-Pagination-Context"] = getPaginationContextId();
    }

    return config;
});

// Response interceptor: Handle token refresh (JWT only) and authentication errors
apiClient.interceptors.response.use(
    (response) => response,
    async (error: unknown) => {
        // If the error is a cancellation, we don't need to do anything.
        if (axios.isCancel(error)) {
            throw error;
        }

        if (!axios.isAxiosError<unknown>(error)) throw error;

        // Check for server errors (5xx) and show toast notification
        // This provides consistent user feedback for infrastructure/backend failures
        if (error.response && error.response.status >= 500) {
            toaster.error({
                title: "Server error",
                description: "Please try again later.",
                closable: true,
            });
            // Continue to reject the error so callers can still handle it
        }

        if (!error.config) throw error;
        const originalRequest: InternalAxiosRequestConfig & {
            _retry?: boolean;
        } = error.config;

        // Check for authentication error (401 only - 403 is authorization, not authentication)
        // Note: This refresh flow only applies to email/password (JWT) authentication
        // OAuth users have session cookies managed by backend (no client-side refresh needed)
        if (
            error.response &&
            error.response.status === 401 &&
            !originalRequest._retry
        ) {
            // Check if user has JWT tokens (email/password authentication)
            const { access_token } = getAuthTokens();

            // OAuth users won't have JWT tokens - let them handle 401 via session endpoint
            if (!access_token) {
                throw error;
            }

            // If token is already being refreshed, queue this request
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    subscribeTokenRefresh({
                        resolve: (token) => {
                            originalRequest.headers.Authorization = `Bearer ${token}`;
                            resolve(apiClient(originalRequest));
                        },
                        reject,
                    });
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Call JWT token refresh endpoint (email/password authentication only)
                // Validates HTTP-only refresh token cookie
                const response = await axios.post<unknown>(
                    `${BASE_URL}/auth/refresh`,
                    {},
                    { withCredentials: true }, // Send refresh token cookie
                );

                const data = response.data;
                if (
                    response.status !== 200 ||
                    !isRecord(data) ||
                    typeof data.access_token !== "string" ||
                    !data.access_token
                ) {
                    throw new Error(
                        "Token refresh did not return a valid access token",
                    );
                }
                const newAccessToken = data.access_token;

                // Store new access token in localStorage
                setAuthTokens(newAccessToken);

                // Update default headers for future requests
                apiClient.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;

                // Notify all queued requests with new token
                onTokenRefreshed(newAccessToken);

                // Keep retry failures separate from refresh failures.
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                return apiClient(originalRequest);
            } catch (refreshError) {
                onTokenRefreshFailed(refreshError);
                // If refresh fails, clear tokens and redirect to login with session expired indicator
                clearAuthTokens();
                window.location.href = "/login?session_expired=true"; // Force a full page reload to clear all state
                throw refreshError;
            } finally {
                isRefreshing = false;
            }
        }

        // For all other errors, just pass them along
        throw error;
    },
);

export default apiClient;
export { CanceledError };
