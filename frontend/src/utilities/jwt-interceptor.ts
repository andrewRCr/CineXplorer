/**
 * Axios JWT interceptor for authenticated API requests.
 *
 * Sets up an Axios instance with JWT and CSRF token handling for secure communication with the backend.
 * Automatically attaches CSRF tokens to unsafe requests and handles token refresh and authentication errors.
 */
import axios, { type AxiosInstance } from "axios";
import { useNavigate } from "react-router-dom";
import { useAuthService } from "@/services/authService";

const BASE_URL = import.meta.env.VITE_BASE_API_URL;

const useAxiosWithInterceptor = (): AxiosInstance => {
	const jwtAxios = axios.create({ baseURL: BASE_URL });
	const navigate = useNavigate();
	const { logout } = useAuthService();

	// attach CSRF token for unsafe methods
	jwtAxios.interceptors.request.use((config) => {
		const unsafeMethods = ["post", "put", "patch", "delete"];
		if (config.method && unsafeMethods.includes(config.method.toLowerCase())) {
			const csrfToken = document.cookie
				.split("; ")
				.find((row) => row.startsWith("XSRF-TOKEN="))
				?.split("=")[1];
			if (csrfToken) {
				config.headers = config.headers || {};
				config.headers["X-CSRFToken"] = csrfToken;
			}
		}
		return config;
	});

	jwtAxios.interceptors.response.use(
		(response) => {
			return response;
		},
		async (error) => {
			const originalRequest = error.config;
			if (error.response.status === 401 || error.response.status === 403) {
				axios.defaults.withCredentials = true;
				try {
					const refreshResponse = await axios.post(
						`${BASE_URL}/token/refresh/`,
						{
							headers: {
								"Content-Type": "application/json",
							},
						}
					);
					if (refreshResponse.status === 200) {
						return jwtAxios(originalRequest);
					}
				} catch (refreshError) {
					logout(); // note: will not delete cookies, but they're by definition invalid here
					navigate("/login");
					return Promise.reject(refreshError);
				}
			}
			throw error;
		}
	);
	return jwtAxios;
};

export default useAxiosWithInterceptor;
