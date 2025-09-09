/**
 * useAuth
 *
 * This custom React hook manages authentication state and actions (login, logout, register, user info).
 * It is used by AuthContextProvider to provide state to the context.
 *
 * Relationship:
 * - Called by AuthContextProvider to get auth state and actions.
 * - State is shared via AuthContext.
 * - Components access state using useAuthContext.
 */
import { ROUTES } from "@/constants/routes";
import axios from "axios";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { AuthStateProps } from "@/@types/auth-state";
import type { User } from "@/@types/user";
import { getCsrfToken, ensureCsrfTokenCookie } from "@/utilities/csrf";
import {
	getInitialAuthenticatedValue,
	getAuthTokens,
	setAuthTokens,
	clearAuthTokens,
	areTokensExpired,
	type TokenStorage,
} from "@/utilities/token";

const BASE_URL = import.meta.env.VITE_BASE_API_URL;

export function useAuth(): AuthStateProps & { user: User | null } {
	const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
		// Check if tokens exist and are not expired
		const { authToken } = getAuthTokens();
		const isExpired = areTokensExpired();
		return authToken !== null && !isExpired && getInitialAuthenticatedValue();
	});
	const [user, setUser] = useState<User | null>(null);
	const navigate = useNavigate();

	useEffect(() => {
		if (isAuthenticated) {
			getUserDetails();
		}
	}, [isAuthenticated]);

	// Check for token expiration every minute
	useEffect(() => {
		const checkTokenExpiration = () => {
			if (isAuthenticated && areTokensExpired()) {
				console.log("Tokens expired during session, logging out...");
				logout();
			}
		};

		const interval = setInterval(checkTokenExpiration, 60000); // Check every minute
		return () => clearInterval(interval);
	}, [isAuthenticated]);

	const getUserDetails = async () => {
		try {
			// Check if tokens are expired before making the request
			if (areTokensExpired()) {
				console.log("Tokens expired, logging out...");
				await logout();
				return;
			}

			const userInfoResponse = await axios.get(`${BASE_URL}/user/me/`, {
				headers: { "Content-Type": "application/json" },
				withCredentials: true,
			});
			const userDetails = userInfoResponse.data;
			setUser(userDetails);
			// Ensure isAuthenticated is true when user details are successfully fetched
			setIsAuthenticated(true);
		} catch (error) {
			console.error("Error fetching user details:", error);
			setUser(null);
			setIsAuthenticated(false);
			clearAuthTokens();
			return error;
		}
	};

	const login = async (
		username: string,
		password: string,
		rememberMe: boolean = false
	): Promise<
		void | number | Error | { status: number; data: any; message: string }
	> => {
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
			const accessToken = response.data.access;
			const refreshToken = response.data.refresh;

			if (user_id && accessToken && refreshToken) {
				// Choose storage based on remember me setting
				const storage: TokenStorage = rememberMe
					? "localStorage"
					: "sessionStorage";

				// Store tokens in the appropriate storage
				setAuthTokens(accessToken, refreshToken, storage);

				setIsAuthenticated(true);
				await getUserDetails();
				return;
			}
			await getUserDetails();
			return;
		} catch (error) {
			if (axios.isAxiosError(error) && error.response) {
				// Return an object with status and error details for better error handling
				return {
					status: error.response.status,
					data: error.response.data,
					message:
						error.response.data?.detail ||
						error.response.data?.error ||
						error.message,
				};
			}
			return error as Error;
		}
	};

	const logout = async () => {
		setIsAuthenticated(false);
		setUser(null);
		clearAuthTokens();
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
					withCredentials: true,
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
