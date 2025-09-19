import { ROUTES } from "@/constants/routes";
import {
	Box,
	Field,
	Input,
	VStack,
	Text,
	Alert,
	HStack,
	IconButton,
	Checkbox,
	Button,
} from "@chakra-ui/react";
import { useFormik } from "formik";
import { useNavigate, useLocation, Link } from "react-router-dom";
import useAuthContext from "@/hooks/useAuthContext";
import { useState, useEffect } from "react";
import { FiMail, FiX } from "react-icons/fi";
import axios from "axios";
import { ERROR_CODES } from "@shared/error-codes";

const Login = () => {
	const authContext = useAuthContext();
	const login = authContext?.login;
	const navigate = useNavigate();
	const location = useLocation();
	const [rememberMeChecked, setRememberMeChecked] = useState(false);
	const [emailVerificationNeeded, setEmailVerificationNeeded] = useState(false);
	const [userEmail, setUserEmail] = useState("");
	const [isResendingEmail, setIsResendingEmail] = useState(false);
	const [resendMessage, setResendMessage] = useState("");
	const [generalError, setGeneralError] = useState("");
	const [emailVerifiedSuccess, setEmailVerifiedSuccess] = useState<
		string | null
	>(null);
	const [registrationSuccess, setRegistrationSuccess] = useState<string | null>(
		null
	);

	// Redirect authenticated users away from login page
	useEffect(() => {
		if (authContext?.isAuthenticated) {
			console.log("User already authenticated, redirecting to home");
			navigate(ROUTES.HOME);
		}
	}, [authContext?.isAuthenticated, navigate]);

	const formik = useFormik({
		initialValues: {
			username: "",
			password: "",
			rememberMe: false,
		},
		validate: (values) => {
			const errors: Partial<typeof values> = {};
			if (!values.username) {
				errors.username = "Required";
			}
			if (!values.password) {
				errors.password = "Required";
			}
			// Clear general error when there are field validation errors
			if (Object.keys(errors).length > 0) {
				setGeneralError("");
			}
			return errors;
		},
		onSubmit: async (values) => {
			const { username, password } = values;
			if (login) {
				const response = await login(
					username,
					password,
					formik.values.rememberMe
				);
				if (response === 401) {
					formik.setErrors({
						username: "Invalid username or password",
						password: "Invalid username or password",
					});
				} else if (
					typeof response === "object" &&
					response !== null &&
					"status" in response
				) {
					if (response.status === 400) {
						// Check if this is an email verification error
						const errorData = response.data || {};

						// Check for non_field_errors array (Django REST Framework standard)
						let isEmailVerificationError = false;
						if (
							errorData.non_field_errors &&
							Array.isArray(errorData.non_field_errors)
						) {
							isEmailVerificationError = errorData.non_field_errors.some(
								(error: string) =>
									error.toLowerCase().includes("verify your email") ||
									error.toLowerCase().includes("email verification") ||
									error.toLowerCase().includes("verify email")
							);
						}

						// Also check for specific error codes in the response (fallback)
						if (!isEmailVerificationError && typeof errorData === "object") {
							// Check for Django REST Framework error codes
							if (errorData.code === ERROR_CODES.EMAIL_NOT_VERIFIED) {
								isEmailVerificationError = true;
							}
							// Check arrays for error codes
							for (const key in errorData) {
								const value = errorData[key];
								if (Array.isArray(value)) {
									isEmailVerificationError = value.some(
										(item) =>
											typeof item === "object" &&
											item.code === ERROR_CODES.EMAIL_NOT_VERIFIED
									);
									if (isEmailVerificationError) break;
								}
							}
						}

						if (isEmailVerificationError) {
							setEmailVerificationNeeded(true);
							// Try to get email from username if it contains @, otherwise leave empty
							const emailFromUsername = username.includes("@") ? username : "";
							setUserEmail(emailFromUsername);
							console.log(
								"Email verification needed for:",
								emailFromUsername || "username (no email provided)"
							);
							setGeneralError(""); // Clear any general error
							formik.setErrors({
								username: "",
								password: "",
							});
						} else {
							// Handle other 400 errors
							setGeneralError("Login failed. Please try again.");
						}
					} else {
						setGeneralError(
							`Login failed with status ${response.status || "unknown"}`
						);
					}
				} else if (response instanceof Error) {
					// Handle other errors
					setGeneralError("An error occurred during login. Please try again.");
				} else {
					// Success case
					setGeneralError(""); // Clear any previous errors
					setEmailVerificationNeeded(false); // Clear verification alert
					setEmailVerifiedSuccess(null); // Clear email verified success
					setRegistrationSuccess(null); // Clear registration success
					navigate(ROUTES.HOME);
				}
			}
		},
	});

	// Sync local state with Formik
	useEffect(() => {
		setRememberMeChecked(formik.values.rememberMe);
	}, [formik.values.rememberMe]);

	// Check for email verification success from redirect
	useEffect(() => {
		if (location.state?.emailVerified) {
			setEmailVerifiedSuccess(
				location.state.message ||
					"Email verified successfully! You can now log in."
			);
			// Clear the state to prevent showing the message again on refresh
			navigate(location.pathname, { replace: true, state: {} });
		}
		if (location.state?.registrationSuccess) {
			setRegistrationSuccess(
				location.state.message ||
					"Registration successful! Please check your email to verify your account before logging in."
			);
			// Clear the state to prevent showing the message again on refresh
			navigate(location.pathname, { replace: true, state: {} });
		}
	}, [location, navigate]);

	const handleResendVerification = async () => {
		if (!userEmail) {
			setResendMessage(
				"Unable to resend email. Please try logging in with your email address."
			);
			return;
		}

		setIsResendingEmail(true);
		setResendMessage("");

		try {
			const BASE_URL = import.meta.env.VITE_BASE_API_URL;

			// Get CSRF token from cookie
			const csrfToken = document.cookie
				.split("; ")
				.find((row) => row.startsWith("XSRF-TOKEN="))
				?.split("=")[1];

			await axios.post(
				`${BASE_URL}/user/resend-verification/`,
				{ email: userEmail },
				{
					headers: {
						"Content-Type": "application/json",
						"X-CSRFToken": csrfToken || "",
					},
					withCredentials: true,
				}
			);
			setResendMessage("Verification email sent! Please check your inbox.");
		} catch (error: any) {
			console.error("Resend error:", error);
			console.error("Error response:", error.response);
			setResendMessage("Failed to send email. Please try again.");
		} finally {
			setIsResendingEmail(false);
		}
	};

	const dismissVerificationAlert = () => {
		setEmailVerificationNeeded(false);
		setResendMessage("");
		setGeneralError(""); // Clear general error when alert is dismissed
	};

	const dismissEmailVerifiedAlert = () => {
		setEmailVerifiedSuccess(null);
	};

	const dismissRegistrationSuccessAlert = () => {
		setRegistrationSuccess(null);
	};

	return (
		<Box
			position="relative"
			minH="100%"
			display="flex"
			alignItems="center"
			justifyContent="center"
			paddingY="32px"
		>
			{/* Login Box - Centered */}
			<Box position="relative" zIndex={1} w="480px">
				<Box
					bg="background.main"
					p={10}
					rounded="lg"
					boxShadow="xl"
					w="100%"
				>
					<form onSubmit={formik.handleSubmit}>
						<VStack gap="24px" align="flex-start">
							<Box minH="80px" w="100%">
								<Field.Root
									required
									invalid={!!formik.errors.username && formik.touched.username}
									w="100%"
									position="relative"
								>
									<Field.Label
										htmlFor="username"
										fontSize="16px"
										fontWeight="medium"
										mb={2}
									>
										Username or Email Address
									</Field.Label>
									<Input
										autoFocus
										id="username"
										name="username"
										type="text"
										value={formik.values.username}
										onChange={(e) => {
											formik.handleChange(e);
											setGeneralError(""); // Clear general error when user types
											setRegistrationSuccess(null); // Clear registration success when user types
										}}
										onBlur={formik.handleBlur}
										borderColor="border.separator"
										_hover={{
											bg: "background.subItem",
										}}
									/>
									<Field.ErrorText
										fontSize="14px"
										position="absolute"
										top="100%"
										left="0"
										right="0"
										mt="4px"
									>
										{formik.errors.username}
									</Field.ErrorText>
								</Field.Root>
							</Box>
							<Box minH="80px" w="100%" mt={3}>
								<Field.Root
									required
									invalid={!!formik.errors.password && formik.touched.password}
									w="100%"
									position="relative"
								>
									<Field.Label
										htmlFor="password"
										fontSize="16px"
										fontWeight="medium"
										mb={2}
									>
										Password
									</Field.Label>
									<Input
										id="password"
										name="password"
										type="password"
										value={formik.values.password}
										onChange={(e) => {
											formik.handleChange(e);
											setGeneralError(""); // Clear general error when user types
											setRegistrationSuccess(null); // Clear registration success when user types
										}}
										onBlur={formik.handleBlur}
										borderColor="border.separator"
										_hover={{
											bg: "background.subItem",
										}}
									/>
									<Field.ErrorText
										fontSize="14px"
										position="absolute"
										top="100%"
										left="0"
										right="0"
										mt="4px"
									>
										{formik.errors.password}
									</Field.ErrorText>
								</Field.Root>
							</Box>
							<Checkbox.Root
								mt={3}
								id="rememberMe"
								name="rememberMe"
								checked={rememberMeChecked}
								onCheckedChange={(details) => {
									const checked = Boolean(details.checked);
									setRememberMeChecked(checked);
									formik.setFieldValue("rememberMe", checked);
								}}
								onBlur={() => {
									formik.setFieldTouched("rememberMe", true);
								}}
							>
								<Checkbox.HiddenInput />
								<Checkbox.Control 
									borderColor="border.separator"
									_hover={{
										bg: "background.subItem",
									}}
								/>
								<Checkbox.Label fontSize="16px">Remember Me</Checkbox.Label>
							</Checkbox.Root>
							<Button
								mt={3}
								type="submit"
								width="full"
								fontSize="16px"
								variant="outline"
								_hover={{
									bg: "background.subItem",
								}}
								loading={formik.isSubmitting}
								loadingText="Logging in..."
							>
								Login
							</Button>
							<Text mt="4px" textAlign="center" w="100%" fontSize="16px">
								Don't have an account?{" "}
								<Link
									to={ROUTES.REGISTER}
									style={{ color: "#4299e1" }}
								>
									Register
								</Link>
							</Text>
						</VStack>
					</form>
				</Box>
			</Box>

			{/* Alerts - Positioned below login box */}
			{(generalError ||
				emailVerificationNeeded ||
				emailVerifiedSuccess ||
				registrationSuccess) && (
				<Box position="relative" top="4" w="480px" mx="auto">
					<VStack gap={4} align="stretch">
						{registrationSuccess && (
							<Alert.Root
								status="success"
								borderRadius="lg"
								border="1px solid"
								borderColor="border.success"
								boxShadow="sm"
								position="relative"
							>
								<IconButton
									size="sm"
									variant="ghost"
									colorScheme="gray"
									aria-label="Dismiss"
									onClick={dismissRegistrationSuccessAlert}
									position="absolute"
									top={2}
									right={2}
									zIndex={1}
								>
									<FiX size={16} />
								</IconButton>
								<Alert.Indicator />
								<Alert.Description fontSize="sm">
									{registrationSuccess}
								</Alert.Description>
							</Alert.Root>
						)}
						{emailVerifiedSuccess && (
							<Alert.Root
								status="success"
								borderRadius="lg"
								border="1px solid"
								borderColor="border.success"
								boxShadow="sm"
								position="relative"
							>
								<IconButton
									size="sm"
									variant="ghost"
									colorScheme="gray"
									aria-label="Dismiss"
									onClick={dismissEmailVerifiedAlert}
									position="absolute"
									top={2}
									right={2}
									zIndex={1}
								>
									<FiX size={16} />
								</IconButton>
								<Alert.Indicator />
								<Alert.Description fontSize="sm">
									{emailVerifiedSuccess}
								</Alert.Description>
							</Alert.Root>
						)}
						{generalError && (
							<Alert.Root
								status="error"
								borderRadius="lg"
								border="1px solid"
								borderColor="border.error"
								boxShadow="sm"
							>
								<Alert.Indicator />
								<Alert.Description fontSize="sm">
									{generalError}
								</Alert.Description>
							</Alert.Root>
						)}
						{emailVerificationNeeded && (
							<Alert.Root
								status="warning"
								borderRadius="lg"
								border="1px solid"
								borderColor="border.subtle"
								boxShadow="sm"
								position="relative"
							>
								<IconButton
									size="sm"
									variant="ghost"
									colorScheme="gray"
									aria-label="Dismiss"
									onClick={dismissVerificationAlert}
									position="absolute"
									top={2}
									right={2}
									zIndex={1}
								>
									<FiX size={16} />
								</IconButton>
								<HStack gap={3} align="flex-start">
									<Alert.Indicator>
										<FiMail size={18} />
									</Alert.Indicator>
									<Box flex="1">
										<Alert.Title fontSize="md" fontWeight="semibold" mb={2}>
											Email Verification Required
										</Alert.Title>
										<Alert.Description fontSize="sm" mb={3}>
											Please verify your email address before logging in. Check
											your email for the verification link.
										</Alert.Description>
										<Box textAlign="center" mt={3} ml={-2}>
											<Button
												size="sm"
												colorScheme="blue"
												variant="solid"
												onClick={handleResendVerification}
												loading={isResendingEmail}
												loadingText="Sending..."
											>
												<FiMail size={14} style={{ marginRight: "4px" }} />
												Resend Email
											</Button>
										</Box>
										{resendMessage && (
											<Box textAlign="center" mt={2}>
												<Text fontSize="sm" color="text.success">
													{resendMessage}
												</Text>
											</Box>
										)}
									</Box>
								</HStack>
							</Alert.Root>
						)}
					</VStack>
				</Box>
			)}
		</Box>
	);
};
export default Login;
