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
import { getInitialAuthenticatedValue } from "@/utilities/token";

const BASE_URL = import.meta.env.VITE_BASE_API_URL;

export function useAuth(): AuthStateProps & { user: User | null } {
	const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
		getInitialAuthenticatedValue
	);
	const [user, setUser] = useState<User | null>(null);
	const navigate = useNavigate();

	useEffect(() => {
		if (isAuthenticated) {
			getUserDetails();
		}
	}, [isAuthenticated]);

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
