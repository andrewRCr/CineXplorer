import axios, { CanceledError, type InternalAxiosRequestConfig } from "axios";
import {
	clearAuthTokens,
	getAuthTokens,
	setAuthTokens,
} from "@/utilities/token";

const BASE_URL = import.meta.env.VITE_BASE_API_URL;

// Debug: Log the base URL being used
console.log('[apiClient] BASE_URL configured as:', BASE_URL);

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
let refreshSubscribers: ((token: string) => void)[] = [];

/**
 * Adds a callback to be executed when token refresh completes
 */
function subscribeTokenRefresh(callback: (token: string) => void): void {
	refreshSubscribers.push(callback);
}

/**
 * Notifies all subscribers with the new access token
 */
function onTokenRefreshed(token: string): void {
	refreshSubscribers.forEach((callback) => callback(token));
	refreshSubscribers = [];
}

// Request interceptor: Attach JWT access token (email/password) and CSRF token
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

	return config;
});

// Response interceptor: Handle token refresh (JWT only) and authentication errors
apiClient.interceptors.response.use(
	(response) => response,
	async (error) => {
		// If the error is a cancellation, we don't need to do anything.
		if (axios.isCancel(error)) {
			return Promise.reject(error);
		}

		const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

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
				return Promise.reject(error);
			}

			// If token is already being refreshed, queue this request
			if (isRefreshing) {
				return new Promise((resolve) => {
					subscribeTokenRefresh((token: string) => {
						originalRequest.headers.Authorization = `Bearer ${token}`;
						resolve(apiClient(originalRequest));
					});
				});
			}

			originalRequest._retry = true;
			isRefreshing = true;

			try {
				// Call JWT token refresh endpoint (email/password authentication only)
				// Validates HTTP-only refresh token cookie
				const response = await axios.post(
					`${BASE_URL}/auth/refresh`,
					{},
					{ withCredentials: true } // Send refresh token cookie
				);

				// If refresh is successful, update access token in localStorage
				if (response.status === 200 && response.data.access_token) {
					const newAccessToken = response.data.access_token;

					// Store new access token in localStorage
					setAuthTokens(newAccessToken);

					// Update default headers for future requests
					apiClient.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;

					// Notify all queued requests with new token
					onTokenRefreshed(newAccessToken);

					// Retry original request with new token
					originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
					return apiClient(originalRequest);
				}
			} catch (refreshError) {
				// If refresh fails, clear tokens and redirect to login
				clearAuthTokens();
				window.location.href = "/login"; // Force a full page reload to clear all state
				return Promise.reject(refreshError);
			} finally {
				isRefreshing = false;
			}
		}

		// For all other errors, just pass them along
		return Promise.reject(error);
	}
);

export default apiClient;
export { CanceledError };
