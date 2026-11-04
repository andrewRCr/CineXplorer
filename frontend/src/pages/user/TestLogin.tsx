import { isRecord } from "@/utilities/typeGuards";
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
      const userInfoResponse = await apiClient.get<unknown>(
        `${BASE_URL}/user/me/`,
        {
          withCredentials: true, // ensure cookies are sent
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
      const userDetails = userInfoResponse.data;
      if (!isRecord(userDetails) || typeof userDetails.username !== "string") {
        throw new Error("User details did not include a username");
      }
      setUsername(userDetails.username);
      return undefined;
    } catch (error) {
      return error;
    }
  };

  return (
    <>
      <div>{authContext?.isAuthenticated?.toString() ?? "Not logged in"}</div>
      <div>
        <Button onClick={() => void authContext?.logout()}>Logout</Button>
        <Button onClick={() => void getUserDetails()}>Get User Details</Button>
        <div>Username: {username}</div>
      </div>
    </>
  );
};
export default TestLogin;
