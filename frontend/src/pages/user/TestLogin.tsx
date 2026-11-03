import { apiBaseUrl as BASE_URL } from "@/config/baseUrls";
import { Button } from "@chakra-ui/react";
import { useState } from "react";
import useAuthContext from "@/hooks/auth/useAuthContext";
import apiClient from "@/services/apiClient";

const TestLogin = () => {
  const authContext = useAuthContext();
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
      <div>{authContext?.isAuthenticated?.toString() ?? "Not logged in"}</div>
      <div>
        <Button onClick={authContext?.logout}>Logout</Button>
        <Button onClick={getUserDetails}>Get User Details</Button>
        <div>Username: {username}</div>
      </div>
    </>
  );
};
export default TestLogin;
