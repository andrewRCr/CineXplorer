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
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { AuthStateProps } from "@/@types/auth-state";
import {
	getInitialAuthenticatedValue,
	getAuthTokens,
	setAuthTokens,
	clearAuthTokens,
	areTokensExpired,
	type TokenStorage,
} from "@/utilities/token";
import type { components } from "@/types/api";
import * as authService from "@/services/authService";

// Type alias for user profile from generated API types
type UserProfile = components["schemas"]["UserProfileSchema"];

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
			await authService.logout();
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

			const userDetails = await authService.getUserProfile();
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
			const response = await authService.login(username, password);

			const user_id = response.user_id;
			const accessToken = response.access;
			const refreshToken = response.refresh;

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
		} catch (error: unknown) {
			if (error && typeof error === 'object' && 'response' in error) {
				const axiosError = error as { response?: { status?: number; data?: { detail?: string; error?: string }; message?: string } };
				if (axiosError.response) {
					return {
						status: axiosError.response.status || 500,
						data: axiosError.response.data || {},
						message:
							axiosError.response.data?.detail ||
							axiosError.response.data?.error ||
							'Login failed',
					};
				}
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
			// TODO: Update Register.tsx UI to collect first_name and last_name (Task 5.4-5.5)
			await authService.register(username, email, password, "", "");
			return 201; // Registration successful
		} catch (error: unknown) {
			if (error && typeof error === 'object' && 'response' in error) {
				const axiosError = error as { response?: { status?: number } };
				if (axiosError.response?.status) {
					return axiosError.response.status;
				}
			}
			return error as Error;
		}
	};

	return { login, isAuthenticated, logout, register, user };
}
