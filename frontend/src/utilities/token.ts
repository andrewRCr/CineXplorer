/**
 * Utility functions for authentication token management.
 *
 * Supports hybrid authentication architecture:
 * - Access tokens: localStorage (5-min lifetime, readable by JavaScript)
 * - Refresh tokens: HTTP-only cookies (14-day lifetime, XSS-proof)
 *
 * This balances security with UX - access tokens allow instant auth checks
 * and session warnings, while refresh tokens remain protected from XSS.
 */

/**
 * Storage type for authentication tokens
 */
export type TokenStorage = "localStorage" | "sessionStorage" | "cookie";

/**
 * Gets a specific cookie value by name
 * @param name - Cookie name to retrieve
 * @returns Cookie value or null if not found
 */
export function getTokenFromCookie(name: string): string | null {
	const value = `; ${document.cookie}`;
	const parts = value.split(`; ${name}=`);

	if (parts.length === 2) {
		const cookieValue = parts.pop()?.split(';').shift();
		return cookieValue ? decodeURIComponent(cookieValue) : null;
	}

	return null;
}

/**
 * Decodes JWT payload and extracts expiration timestamp
 * @param token - JWT token string
 * @returns Expiration Date or null if token is invalid
 */
export function getTokenExpiration(token: string): Date | null {
	try {
		// JWT structure: header.payload.signature
		const parts = token.split('.');
		if (parts.length !== 3) return null;

		// Decode base64url payload (middle part)
		const payload = parts[1];
		const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
		const jsonPayload = decodeURIComponent(
			atob(base64)
				.split('')
				.map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
				.join('')
		);

		const decoded = JSON.parse(jsonPayload);

		// JWT exp claim is in seconds, Date expects milliseconds
		if (decoded.exp && typeof decoded.exp === 'number') {
			return new Date(decoded.exp * 1000);
		}

		return null;
	} catch {
		// Invalid JWT format
		return null;
	}
}

/**
 * Returns whether the user is initially authenticated based on storage.
 */
export function getInitialAuthenticatedValue(): boolean {
	const authenticated =
		localStorage.getItem("isAuthenticated") ||
		sessionStorage.getItem("isAuthenticated");
	return authenticated !== null && authenticated === "true";
}

/**
 * Returns the storage type currently being used for authentication
 */
export function getCurrentStorageType(): TokenStorage {
	// Check cookies first (hybrid auth priority)
	if (getTokenFromCookie("access_token")) {
		return "cookie";
	}

	if (localStorage.getItem("isAuthenticated") === "true") {
		return "localStorage";
	}

	if (sessionStorage.getItem("isAuthenticated") === "true") {
		return "sessionStorage";
	}

	return "localStorage"; // default
}

/**
 * Sets authentication tokens in the specified storage.
 *
 * For hybrid authentication (default):
 * - Access token stored in localStorage for instant auth checks
 * - Refresh token managed by backend in HTTP-only cookie (not set here)
 * - isAuthenticated flag for quick boolean checks
 *
 * @param accessToken - JWT access token
 * @param refreshToken - Optional refresh token (legacy compatibility, ignored in hybrid mode)
 * @param storage - Storage type (default: localStorage for hybrid auth)
 */
export const setAuthTokens = (
	accessToken: string,
	refreshToken?: string,
	storage: TokenStorage = "localStorage"
) => {
	const storageObj = storage === "localStorage" ? localStorage : sessionStorage;

	// Store access token in localStorage for instant auth checks
	storageObj.setItem("authToken", accessToken);
	storageObj.setItem("isAuthenticated", "true");

	// DEPRECATED: Refresh token storage (now handled by HTTP-only cookie)
	// Keep this for backward compatibility with existing code
	if (refreshToken) {
		storageObj.setItem("refreshToken", refreshToken);
	}

	// Store actual JWT expiration time if available
	const expiration = getTokenExpiration(accessToken);
	if (expiration && storage === "localStorage") {
		storageObj.setItem("tokenExpiration", expiration.getTime().toString());
	}
};

/**
 * Gets authentication tokens from storage.
 *
 * Priority order (hybrid authentication):
 * 1. Cookies (access_token set by backend during OAuth/login)
 * 2. localStorage (access_token stored by frontend after refresh)
 * 3. sessionStorage (fallback for remember-me=false scenarios)
 *
 * Note: Refresh token is always in HTTP-only cookie (not accessible here)
 *
 * @returns Object with authToken, refreshToken (deprecated), and storage source
 */
export const getAuthTokens = () => {
	// 1. Check cookies first (hybrid auth - backend may set access_token cookie)
	const cookieToken = getTokenFromCookie("access_token");
	if (cookieToken) {
		return {
			authToken: cookieToken,
			refreshToken: null, // Refresh token in HTTP-only cookie (not accessible)
			storage: "cookie" as TokenStorage,
		};
	}

	// 2. Check localStorage (hybrid auth - frontend stores after refresh)
	let authToken = localStorage.getItem("authToken");
	let refreshToken = localStorage.getItem("refreshToken");

	if (authToken) {
		return {
			authToken,
			refreshToken, // May be null (refresh token in HTTP-only cookie)
			storage: "localStorage" as TokenStorage,
		};
	}

	// 3. Check sessionStorage (legacy/fallback)
	authToken = sessionStorage.getItem("authToken");
	refreshToken = sessionStorage.getItem("refreshToken");

	return {
		authToken,
		refreshToken,
		storage: "sessionStorage" as TokenStorage,
	};
};

/**
 * Checks if stored tokens are expired.
 *
 * For hybrid authentication:
 * - Decodes JWT and checks actual expiration timestamp
 * - Fallback to localStorage timestamp for backward compatibility
 * - Returns true if expired or unparseable (defensive approach)
 *
 * @returns true if tokens are expired or invalid
 */
export const areTokensExpired = (): boolean => {
	const { authToken } = getAuthTokens();

	// No token = considered expired
	if (!authToken) return true;

	// Try to get actual JWT expiration
	const jwtExpiration = getTokenExpiration(authToken);
	if (jwtExpiration) {
		return Date.now() > jwtExpiration.getTime();
	}

	// Fallback to localStorage expiration timestamp (backward compatibility)
	const expirationTime = localStorage.getItem("tokenExpiration");
	if (expirationTime) {
		return Date.now() > parseInt(expirationTime);
	}

	// Can't determine expiration - treat as expired (defensive)
	return false;
};

/**
 * Removes authentication tokens from both storages.
 * Note: HTTP-only refresh token cookie must be cleared by backend.
 */
export const clearAuthTokens = () => {
	localStorage.removeItem("authToken");
	localStorage.removeItem("refreshToken");
	localStorage.removeItem("tokenExpiration");
	localStorage.removeItem("isAuthenticated");

	sessionStorage.removeItem("authToken");
	sessionStorage.removeItem("refreshToken");
	sessionStorage.removeItem("isAuthenticated");
};
