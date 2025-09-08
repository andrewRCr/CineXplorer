/**
 * Utility functions for authentication token management.
 *
 * Helpers to retrieve and set authentication tokens in localStorage or sessionStorage.
 * Intended for use in services and interceptors that require authentication.
 */

/**
 * Storage type for authentication tokens
 */
export type TokenStorage = "localStorage" | "sessionStorage";

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
	if (localStorage.getItem("isAuthenticated") === "true") {
		return "localStorage";
	}
	if (sessionStorage.getItem("isAuthenticated") === "true") {
		return "sessionStorage";
	}
	return "localStorage"; // default
}

/**
 * Sets authentication tokens in the specified storage
 */
export const setAuthTokens = (
	accessToken: string,
	refreshToken: string,
	storage: TokenStorage = "localStorage"
) => {
	const storageObj = storage === "localStorage" ? localStorage : sessionStorage;

	storageObj.setItem("authToken", accessToken);
	storageObj.setItem("refreshToken", refreshToken);
	storageObj.setItem("isAuthenticated", "true");

	// Set expiration time (30 days for localStorage, session for sessionStorage)
	if (storage === "localStorage") {
		const expirationTime = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
		storageObj.setItem("tokenExpiration", expirationTime.toString());
	}
};

/**
 * Gets authentication tokens from storage (checks both localStorage and sessionStorage)
 */
export const getAuthTokens = () => {
	// Prefer localStorage if available, otherwise check sessionStorage
	let storage: TokenStorage = "localStorage";
	let authToken = localStorage.getItem("authToken");
	let refreshToken = localStorage.getItem("refreshToken");

	if (!authToken) {
		storage = "sessionStorage";
		authToken = sessionStorage.getItem("authToken");
		refreshToken = sessionStorage.getItem("refreshToken");
	}

	return {
		authToken,
		refreshToken,
		storage,
	};
};

/**
 * Checks if stored tokens are expired (only applies to localStorage tokens)
 */
export const areTokensExpired = (): boolean => {
	const expirationTime = localStorage.getItem("tokenExpiration");
	if (!expirationTime) return false;

	return Date.now() > parseInt(expirationTime);
};

/**
 * Removes authentication tokens from both storages.
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
