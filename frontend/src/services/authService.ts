import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AuthServiceProps } from "@/@types/auth-service";
import { getCsrfToken, ensureCsrfTokenCookie } from "@/utilities/csrf";

const BASE_URL = import.meta.env.VITE_BASE_API_URL;

export function useAuthService(): AuthServiceProps {
	// set initial state of isLoggedIn to current local storage value
	const getInitialLoggedInValue = () => {
		const loggedIn = localStorage.getItem("isLoggedIn");
		return loggedIn !== null && loggedIn === "true";
	};
	const [isLoggedIn, setIsLoggedIn] = useState<boolean>(
		getInitialLoggedInValue
	);
	const navigate = useNavigate();

	// store authenticated user's username/email
	// note: not currently sent via jwt-interceptor, as only used by login()
	/**
	 * GET /user/me/
	 * Fetches authenticated user's details.
	 */
	const getUserDetails = async () => {
		try {
			const userInfoResponse = await axios.get(`${BASE_URL}/user/me/`, {
				headers: {
					"Content-Type": "application/json",
				},
				withCredentials: true,
			});
			const userDetails = userInfoResponse.data;
			localStorage.setItem("username", userDetails.username);
			localStorage.setItem("email", userDetails.email);
		} catch (error) {
			// console.error("Failed to fetch user details:", error);
			localStorage.removeItem("user_id");
			localStorage.setItem("isLoggedIn", "false");
			setIsLoggedIn(false);
			return error;
		}
	};

	/**
	 * POST /token/
	 * Authenticates user and sets login state.
	 * Requires CSRF token.
	 */
	const login = async (username: string, password: string) => {
		try {
			await ensureCsrfTokenCookie(BASE_URL);
			const csrfToken = getCsrfToken();
			//  make login request with CSRF header
			const response = await axios.post(
				`${BASE_URL}/token/`,
				{
					username,
					password,
				},
				{
					headers: {
						"Content-Type": "application/json",
						"X-CSRFToken": csrfToken || "",
					},
					withCredentials: true, // important for cookies to be set
				}
			);
			// store frontend isAuthenticated flag (isloggedIn) for setting on context
			localStorage.setItem("isLoggedIn", "true");
			setIsLoggedIn(true);
			// store user_id from response data and username/email from getUserDetails
			const user_id = response.data.user_id;
			if (user_id) {
				localStorage.setItem("user_id", user_id);
			}
			getUserDetails();
		} catch (error) {
			if (axios.isAxiosError(error) && error.response) {
				return error.response.status;
			}
			return error;
		}
	};

	/**
	 * POST /logout/
	 * Logs out the current user and clears local state.
	 * Requires CSRF token.
	 */
	const logout = async () => {
		localStorage.removeItem("user_id");
		localStorage.removeItem("username");
		localStorage.removeItem("email");
		localStorage.setItem("isLoggedIn", "false");
		setIsLoggedIn(false);
		navigate("/login");

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
	 * Fetches CSRF token cookie if not present.
	 */
	const register = async (
		username: string,
		email: string,
		password: string
	) => {
		try {
			await ensureCsrfTokenCookie(BASE_URL);
			const csrfToken = getCsrfToken();
			// make registration request with CSRF header
			const response = await axios.post(
				`${BASE_URL}/register/`,
				{
					username,
					email,
					password,
				},
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
			return error;
		}
	};

	return { login, isLoggedIn, logout, register };
}
