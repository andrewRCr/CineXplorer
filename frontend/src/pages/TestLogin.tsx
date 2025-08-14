import { Button } from "@chakra-ui/react";
import axios from "axios";
import { useState } from "react";
import useAuthServiceContext from "@/hooks/useAuthServiceContext";
import useAxiosWithInterceptor from "@/utilities/jwt-interceptor";

const BASE_URL = import.meta.env.VITE_BASE_API_URL;

const TestLogin = () => {
	const authServiceContext = useAuthServiceContext();
	const [username, setUsername] = useState("");
	const jwtAxios = useAxiosWithInterceptor();

	// store authenticated user's username/email
	const getUserDetails = async () => {
		try {
			const userInfoResponse = await jwtAxios.get(`${BASE_URL}/user/me/`, {
				withCredentials: true, // ensure cookies are sent
				headers: {
					"Content-Type": "application/json",
				},
			});
			const userDetails = userInfoResponse.data;
			setUsername(userDetails.username);
		} catch (error) {
			return error;
		}
	};

	return (
		<>
			<div>{authServiceContext?.isLoggedIn?.toString() ?? "Not logged in"}</div>
			<div>
				<Button onClick={authServiceContext?.logout}>Logout</Button>
				<Button onClick={getUserDetails}>Get User Details</Button>
				<div>Username: {username}</div>
			</div>
		</>
	);
};
export default TestLogin;
