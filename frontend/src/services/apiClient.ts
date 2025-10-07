import axios, { CanceledError } from "axios";
import {
	clearAuthTokens,
	getAuthTokens,
	setAuthTokens,
} from "@/utilities/token";

const BASE_URL = import.meta.env.VITE_BASE_API_URL;

// Debug: Log the base URL being used
console.log('[apiClient] BASE_URL configured as:', BASE_URL);

const apiClient = axios.create({
	baseURL: BASE_URL,
	headers: {
		"Content-Type": "application/json",
	},
});

// Attach CSRF token for unsafe methods
apiClient.interceptors.request.use((config) => {
	// Attach JWT token from storage (checks both localStorage and sessionStorage)
	const { authToken } = getAuthTokens();
	if (authToken) {
		config.headers.Authorization = `Bearer ${authToken}`;
	}

	// Attach CSRF token from cookie for unsafe methods
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

// Handle token refresh and authentication errors
apiClient.interceptors.response.use(
	(response) => response,
	async (error) => {
		// If the error is a cancellation, we don't need to do anything.
		if (axios.isCancel(error)) {
			return Promise.reject(error);
		}

		const originalRequest = error.config;

		// Check for token expiration error (401/403) and if it's not a retry request
		if (
			error.response &&
			(error.response.status === 401 || error.response.status === 403) &&
			!originalRequest._retry
		) {
			originalRequest._retry = true; // Mark request as a retry
			axios.defaults.withCredentials = true;

			try {
				// Attempt to refresh the token using the current storage type
				const { refreshToken, storage } = getAuthTokens();
				const response = await axios.post(`${BASE_URL}/token/refresh/`, {
					refresh: refreshToken,
				});

				// If refresh is successful, update tokens in the same storage
				if (response.status === 200) {
					setAuthTokens(
						response.data.access,
						response.data.refresh || refreshToken,
						storage
					);
					apiClient.defaults.headers.common[
						"Authorization"
					] = `Bearer ${response.data.access}`;
					return apiClient(originalRequest);
				}
			} catch (refreshError) {
				// If refresh fails, clear tokens and redirect to login
				clearAuthTokens();
				window.location.href = "/login"; // Force a full page reload to clear all state
				return Promise.reject(refreshError);
			}
		}
		// For all other errors, just pass them along
		return Promise.reject(error);
	}
);

export default apiClient;
export { CanceledError };
