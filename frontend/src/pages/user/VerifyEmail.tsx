import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Box, Text, Spinner, Alert, VStack, Button } from "@chakra-ui/react";
import { ROUTES } from "@/constants/routes";
import { COLORS } from "@/constants/theme";
import axios from "axios";

const VerifyEmail = () => {
	const { token } = useParams<{ token: string }>();
	const navigate = useNavigate();
	const [status, setStatus] = useState<"loading" | "success" | "error">(
		"loading"
	);
	const [message, setMessage] = useState("");
	const [countdown, setCountdown] = useState(3);
	const hasVerifiedRef = useRef(false);

	useEffect(() => {
		// Prevent duplicate verification calls (React Strict Mode can cause double mounting)
		if (hasVerifiedRef.current) {
			return;
		}

		const verifyEmail = async () => {
			if (!token) {
				setStatus("error");
				setMessage("Invalid verification link. No token provided.");
				return;
			}

			hasVerifiedRef.current = true;

			try {
				const BASE_URL = import.meta.env.VITE_BASE_API_URL;

				// Get CSRF token from cookie
				const csrfToken = document.cookie
					.split("; ")
					.find((row) => row.startsWith("XSRF-TOKEN="))
					?.split("=")[1];

				const response = await axios.get(
					`${BASE_URL}/user/verify-email/${token}/`,
					{
						headers: {
							"X-CSRFToken": csrfToken || "",
						},
						withCredentials: true,
					}
				);

				if (response.status === 200) {
					setStatus("success");
					setMessage(response.data.message || "Email verified successfully!");
					// Auto-redirect to login after 3 seconds on success
					let count = 3;
					setCountdown(count);
					const timer = setInterval(() => {
						count--;
						setCountdown(count);
						if (count <= 0) {
							clearInterval(timer);
							navigate(ROUTES.LOGIN, {
								state: { emailVerified: true, message: response.data.message },
							});
						}
					}, 1000);
				} else {
					setStatus("error");
					setMessage("Email verification failed. Please try again.");
				}
			} catch (error: any) {
				console.error("Email verification error:", error);
				setStatus("error");

				if (error.response?.status === 400) {
					setMessage(
						error.response.data.error || "Invalid or expired verification link."
					);
				} else {
					setMessage(
						"An error occurred during verification. Please try again."
					);
				}
			}
		};

		verifyEmail();
	}, [token, navigate]);

	const handleContinue = () => {
		navigate(ROUTES.LOGIN);
	};

	return (
		<Box
			position="relative"
			minH="100%"
			display="flex"
			alignItems="center"
			justifyContent="center"
			paddingX={{ base: 4, md: 6 }}
			paddingY="32px"
		>
			<Box maxW="500px" w="100%" textAlign="center">
				{status === "loading" && (
					<VStack gap={4}>
						<Spinner size="xl" color={COLORS.accent.primary} />
						<Text fontSize="lg">Verifying your email...</Text>
					</VStack>
				)}

				{status === "success" && (
					<VStack gap={6}>
						<Alert.Root
							status="success"
							borderRadius="lg"
							border="1px solid"
							borderColor={COLORS.border.success}
							boxShadow="sm"
						>
							<Alert.Indicator />
							<Box>
								<Alert.Title fontSize="lg" fontWeight="semibold" mb={2}>
									Email Verified!
								</Alert.Title>
								<Alert.Description fontSize="md" mb={3}>
									{message}
								</Alert.Description>
								<Text
									fontSize="sm"
									color={COLORS.text.successDark}
									fontWeight="medium"
								>
									Redirecting to login in {countdown} second
									{countdown !== 1 ? "s" : ""}...
								</Text>
							</Box>
						</Alert.Root>
						<Button
							colorScheme="blue"
							size="lg"
							onClick={handleContinue}
							variant="outline"
							bg="white"
							color="black"
							_hover={{ bg: "gray.50" }}
							borderColor="gray.300"
						>
							Continue to Login Now
						</Button>
					</VStack>
				)}

				{status === "error" && (
					<VStack gap={6}>
						<Alert.Root
							status="error"
							borderRadius="lg"
							border="1px solid"
							borderColor={COLORS.border.error}
							boxShadow="sm"
						>
							<Alert.Indicator />
							<Box>
								<Alert.Title fontSize="lg" fontWeight="semibold" mb={2}>
									Verification Failed
								</Alert.Title>
								<Alert.Description fontSize="md">{message}</Alert.Description>
							</Box>
						</Alert.Root>
						<VStack gap={3}>
							<Button
								colorScheme="blue"
								variant="outline"
								onClick={() => navigate(ROUTES.LOGIN)}
								size="lg"
								w="full"
								maxW="200px"
								bg="white"
								color="black"
								_hover={{ bg: "gray.50" }}
								borderColor="gray.300"
							>
								Back to Login
							</Button>
							<Button
								colorScheme="gray"
								variant="outline"
								onClick={() => window.location.reload()}
								size="lg"
								w="full"
								maxW="200px"
								bg="white"
								color="black"
								_hover={{ bg: "gray.50" }}
								borderColor="gray.300"
							>
								Try Again
							</Button>
						</VStack>
					</VStack>
				)}
			</Box>
		</Box>
	);
};

export default VerifyEmail;
