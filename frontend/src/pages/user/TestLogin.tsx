import { Button } from "@chakra-ui/react";
import { useState } from "react";
import useAuthServiceContext from "@/hooks/useAuthServiceContext";
import apiClient from "@/services/apiClient";

const BASE_URL = import.meta.env.VITE_BASE_API_URL;

const TestLogin = () => {
	const authServiceContext = useAuthServiceContext();
	const [username, setUsername] = useState("");

	// store authenticated user's username/email
	const getUserDetails = async () => {
		try {
			const userInfoResponse = await apiClient.get(`${BASE_URL}/user/me/`, {
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
