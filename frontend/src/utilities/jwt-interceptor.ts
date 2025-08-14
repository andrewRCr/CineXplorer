import axios, { type AxiosInstance } from "axios";
import { useNavigate } from "react-router-dom";
import { useAuthService } from "@/services/authService";

const BASE_URL = import.meta.env.VITE_BASE_API_URL;

const useAxiosWithInterceptor = (): AxiosInstance => {
	const jwtAxios = axios.create({ baseURL: BASE_URL });
	const navigate = useNavigate();
	const { logout } = useAuthService();

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
