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
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { AuthStateProps } from "@/@types/auth-state";
import { getCsrfToken, ensureCsrfTokenCookie } from "@/utilities/csrf";
import {
	getInitialAuthenticatedValue,
	getAuthTokens,
	setAuthTokens,
	clearAuthTokens,
	areTokensExpired,
	type TokenStorage,
} from "@/utilities/token";
import type { components } from "@/types/api";

const BASE_URL = import.meta.env.VITE_BASE_API_URL;

// Type aliases for generated API types
type TokenObtainInput = components["schemas"]["TokenObtainInputSchema"];
type TokenResponse = components["schemas"]["TokenResponseSchema"];
type RegisterInput = components["schemas"]["RegisterInputSchema"];
type UserProfile = components["schemas"]["UserProfileSchema"];
type LogoutResponse = components["schemas"]["LogoutResponseSchema"];

export function useAuth(): AuthStateProps & { user: UserProfile | null } {
	const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
		// Check if tokens exist and are not expired
		const { authToken } = getAuthTokens();
		const isExpired = areTokensExpired();
		return authToken !== null && !isExpired && getInitialAuthenticatedValue();
	});
	const [user, setUser] = useState<UserProfile | null>(null);
	const navigate = useNavigate();

	useEffect(() => {
		if (isAuthenticated) {
			getUserDetails();
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isAuthenticated]); // getUserDetails is stable but creates circular dependency

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
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isAuthenticated]); // logout is stable but creates circular dependency

	const logout = useCallback(async () => {
		setIsAuthenticated(false);
		setUser(null);
		clearAuthTokens();
		navigate(ROUTES.LOGIN);

		try {
			const csrfToken = getCsrfToken();
			await axios.post<LogoutResponse>(
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
	}, [navigate]);

	const getUserDetails = useCallback(async () => {
		try {
			// Check if tokens are expired before making the request
			if (areTokensExpired()) {
				console.log("Tokens expired, logging out...");
				await logout();
				return;
			}

			const userInfoResponse = await axios.get<UserProfile>(`${BASE_URL}/profile/`, {
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
	}, [logout]);

	const login = async (
		username: string,
		password: string,
		rememberMe: boolean = false
	): Promise<
	void | number | Error | { status: number; data: unknown; message: string }
	> => {
		try {
			await ensureCsrfTokenCookie(BASE_URL);
			const csrfToken = getCsrfToken();

			// Use generated types - TokenObtainInputSchema uses 'login' field
			const payload: TokenObtainInput = {
				login: username, // Backend accepts username or email
				password,
			};

			const response = await axios.post<TokenResponse>(
				`${BASE_URL}/token/`,
				payload,
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


	const register = async (
		username: string,
		email: string,
		password: string
	): Promise<number | Error> => {
		try {
			await ensureCsrfTokenCookie(BASE_URL);
			const csrfToken = getCsrfToken();

			// Use generated types - RegisterInputSchema requires first_name and last_name
			// TODO: Update Register.tsx UI to collect first_name and last_name (Task 5.4-5.5)
			const payload: RegisterInput = {
				username,
				email,
				password,
				first_name: "", // Temporary: UI doesn't collect this yet
				last_name: "",  // Temporary: UI doesn't collect this yet
			};

			const response = await axios.post<TokenResponse>(
				`${BASE_URL}/register/`,
				payload,
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
