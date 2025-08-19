/**
 * Utility functions for CSRF token management.
 *
 * Helpers to retrieve the CSRF token from cookies and ensure the token is set before making unsafe API requests.
 * Intended for use in services and interceptors that require CSRF protection.
 */

/**
 * Gets the CSRF token from the browser cookie.
 */
export function getCsrfToken(): string | null {
	const match = document.cookie.match(new RegExp("(^| )XSRF-TOKEN=([^;]+)"));
	return match ? match[2] : null;
}

/**
 * Ensures the CSRF token cookie is present.
 * If not, fetches it from the backend and waits briefly for the cookie to be set.
 * @param baseUrl - The base API URL to use for fetching the CSRF token.
 */
export async function ensureCsrfTokenCookie(baseUrl: string): Promise<void> {
	if (!getCsrfToken()) {
		await fetch(`${baseUrl}/csrf-token/`, { credentials: "include" });
		await new Promise((resolve) => setTimeout(resolve, 100));
	}
}
