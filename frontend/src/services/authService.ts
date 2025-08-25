import { ROUTES } from "@/constants/routes";
import axios from "axios";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { AuthServiceProps } from "@/@types/auth-service";
import type { User } from "@/@types/user";
import { getCsrfToken, ensureCsrfTokenCookie } from "@/utilities/csrf";

const BASE_URL = import.meta.env.VITE_BASE_API_URL;

/**
 * Utility: Get initial authentication state from localStorage.
 */
function getInitialAuthenticatedValue(): boolean {
	const authenticated = localStorage.getItem("isAuthenticated");
	return authenticated !== null && authenticated === "true";
}

/**
 * Removes authentication tokens from localStorage.
 * This is a standalone utility function and not a React hook.
 */
export const clearAuthTokens = () => {
	localStorage.removeItem("authToken");
	localStorage.removeItem("refreshToken");
};

/**
 * React hook: Authentication service for login, logout, registration, and user state.
 */
export function useAuthService(): AuthServiceProps & { user: User | null } {
	// -------------------- State --------------------
	const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
		getInitialAuthenticatedValue
	);
	const [user, setUser] = useState<User | null>(null);
	const navigate = useNavigate();

	// -------------------- Effects --------------------
	useEffect(() => {
		/**
		 * On mount or when isAuthenticated changes, validate the session with the backend.
		 * This ensures that persistent authentication state in localStorage matches the actual backend session.
		 * If the session is expired or invalid, user state and isAuthenticated will be cleared.
		 */
		if (isAuthenticated) {
			getUserDetails();
		}
	}, [isAuthenticated]);

	// -------------------- Helpers --------------------
	/**
	 * GET /user/me/
	 * Fetches authenticated user's details.
	 */
	const getUserDetails = async () => {
		try {
			const userInfoResponse = await axios.get(`${BASE_URL}/user/me/`, {
				headers: { "Content-Type": "application/json" },
				withCredentials: true,
			});
			const userDetails = userInfoResponse.data;
			setUser(userDetails);
		} catch (error) {
			setUser(null);
			setIsAuthenticated(false);
			localStorage.setItem("isAuthenticated", "false");
			return error;
		}
	};

	// -------------------- Actions --------------------
	/**
	 * POST /token/
	 * Authenticates user and sets login state.
	 * Requires CSRF token.
	 */
	const login = async (
		username: string,
		password: string
	): Promise<void | number | Error> => {
		try {
			await ensureCsrfTokenCookie(BASE_URL);
			const csrfToken = getCsrfToken();
			const response = await axios.post(
				`${BASE_URL}/token/`,
				{ username, password },
				{
					headers: {
						"Content-Type": "application/json",
						"X-CSRFToken": csrfToken || "",
					},
					withCredentials: true,
				}
			);

			const user_id = response.data.user_id;
			if (user_id) {
				setIsAuthenticated(true);
				localStorage.setItem("isAuthenticated", "true");
			}
			await getUserDetails();
			return;
		} catch (error) {
			if (axios.isAxiosError(error) && error.response) {
				return error.response.status;
			}
			return error as Error;
		}
	};

	/**
	 * POST /logout/
	 * Logs out the current user and clears state.
	 * Requires CSRF token.
	 */
	const logout = async () => {
		setIsAuthenticated(false);
		localStorage.setItem("isAuthenticated", "false");
		setUser(null);
		navigate(ROUTES.LOGIN);

		try {
			const csrfToken = getCsrfToken();
			await axios.post(
				`${BASE_URL}/logout/`,
				{},
				{
					headers: {
						"Content-Type": "application/json",
						"X-CSRFToken": csrfToken || "",
					},
					withCredentials: true,
				}
			);
		} catch (error) {
			console.error("Logout failed:", error);
			return Promise.reject(error);
		}
	};

	/**
	 * POST /register/
	 * Registers a new user.
	 * Requires CSRF token.
	 */
	const register = async (
		username: string,
		email: string,
		password: string
	): Promise<number | Error> => {
		try {
			await ensureCsrfTokenCookie(BASE_URL);
			const csrfToken = getCsrfToken();
			const response = await axios.post(
				`${BASE_URL}/register/`,
				{ username, email, password },
				{
					headers: {
						"Content-Type": "application/json",
						"X-CSRFToken": csrfToken || "",
					},
				}
			);
			return response.status;
		} catch (error) {
			if (axios.isAxiosError(error) && error.response) {
				return error.response.status;
			}
			return error as Error;
		}
	};

	return { login, isAuthenticated, logout, register, user };
}
