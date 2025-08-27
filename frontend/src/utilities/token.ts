/**
 * Utility functions for authentication token management.
 *
 * Helpers to retrieve and set authentication tokens in localStorage.
 * Intended for use in services and interceptors that require authentication.
 */

/**
 * Returns whether the user is initially authenticated based on localStorage.
 */
export function getInitialAuthenticatedValue(): boolean {
	const authenticated = localStorage.getItem("isAuthenticated");
	return authenticated !== null && authenticated === "true";
}

/**
 * Removes authentication tokens from localStorage.
 */
export const clearAuthTokens = () => {
	localStorage.removeItem("authToken");
	localStorage.removeItem("refreshToken");
};
