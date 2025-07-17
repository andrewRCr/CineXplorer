import type { AuthServiceProps } from "@/@types/auth-service";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_BASE_API_URL;

export function useAuthService(): AuthServiceProps {
	const login = async (username: string, password: string) => {
		try {
			const response = await axios.post(
				`${BASE_URL}/token/`,
				{
					username,
					password,
				},
				{
					headers: {
						"Content-Type": "application/json",
					},
				}
			);
			console.log("Login successful:", response.data);
			// Here you would typically save the token to local storage or context
		} catch (error) {
			console.error("Login failed:", error);
			return error;
		}
	};
	return { login };
}
