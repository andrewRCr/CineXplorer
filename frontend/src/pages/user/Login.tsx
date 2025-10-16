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
import { FaGoogle, FaGithub } from "react-icons/fa";
import { ERROR_CODES } from "@shared/error-codes";
import * as authService from "@/services/authService";
import GoogleLogo from "@/assets/GoogleLogo";
import GitHubLogo from "@/assets/GitHubLogo";
import LoadingContent from "@/components/layout/LoadingContent";

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
	const [isLoggingIn, setIsLoggingIn] = useState(false);

	// Initialize OAuth loading state immediately from sessionStorage (prevents form flash)
	// Note: State never updates after initialization - component unmounts during navigation
	const [oauthLoading] = useState<{
		provider: string;
		loading: boolean;
	} | null>(() => {
		const oauthProvider = sessionStorage.getItem('oauth_in_progress');
		if (oauthProvider) {
			console.log(`[OAuth] Component initializing with OAuth flow in progress: ${oauthProvider}`);
			return { provider: oauthProvider, loading: true };
		}
		return null;
	});

	// Initialize timing gate: closed if OAuth in progress (will open after minimum display time)
	const [minDisplayTimeElapsed, setMinDisplayTimeElapsed] = useState(() => {
		const oauthProvider = sessionStorage.getItem('oauth_in_progress');
		// If OAuth flow in progress, gate starts CLOSED (false) - will open after minimum display time
		// Otherwise gate starts OPEN (true) - no delay needed for normal login
		return !oauthProvider;
	});

	// Check if returning from OAuth flow and set up timing gate
	useEffect(() => {
		const oauthProvider = sessionStorage.getItem('oauth_in_progress');
		const startTimeStr = sessionStorage.getItem('oauth_start_time');

		if (oauthProvider && startTimeStr) {
			const startTime = parseInt(startTimeStr, 10);
			const elapsedTime = Date.now() - startTime;
			const FAST_OAUTH_THRESHOLD = 3000; // 3 seconds
			const MINIMUM_DISPLAY_TIME = 500; // 0.5 seconds minimum (actual display time from when spinner appears)

			console.log(`[OAuth] Detected return from ${oauthProvider} OAuth flow after ${elapsedTime}ms`);

			// For fast OAuth, enforce minimum display time before allowing navigation
			if (elapsedTime < FAST_OAUTH_THRESHOLD) {
				setMinDisplayTimeElapsed(false);

				// Display spinner for MINIMUM_DISPLAY_TIME from NOW (not from original click time)
				// This ensures consistent visible duration regardless of OAuth speed
				console.log(`[OAuth] Fast OAuth detected, enforcing ${MINIMUM_DISPLAY_TIME}ms minimum display time`);

				setTimeout(() => {
					console.log('[OAuth] Minimum display time elapsed, allowing navigation');
					setMinDisplayTimeElapsed(true);
				}, MINIMUM_DISPLAY_TIME);
			} else {
				console.log('[OAuth] Slow OAuth detected, no minimum display time needed');
				// Slow OAuth - user already waited, allow immediate navigation
				setMinDisplayTimeElapsed(true);
			}

			// Cleanup function: Clear flags when component unmounts (during navigation)
			return () => {
				console.log('[OAuth] Login component unmounting, clearing OAuth flags');
				sessionStorage.removeItem('oauth_in_progress');
				sessionStorage.removeItem('oauth_start_time');
			};
		}
	}, []);

	// Redirect authenticated users away from login page
	// Note: Gate navigation with minDisplayTimeElapsed to enforce minimum spinner display for fast OAuth
	useEffect(() => {
		// Only redirect if:
		// 1. User is authenticated
		// 2. Not in active login process
		// 3. Minimum OAuth display time has elapsed (for fast OAuth UX)
		if (authContext?.isAuthenticated && !isLoggingIn && minDisplayTimeElapsed) {
			console.log("User already authenticated, redirecting to home");
			// Use replace to avoid adding login page to history
			navigate(ROUTES.HOME, { replace: true });
		}
	}, [authContext?.isAuthenticated, navigate, isLoggingIn, minDisplayTimeElapsed]);

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
				setIsLoggingIn(true);
				const response = await login(
					username,
					password,
					formik.values.rememberMe
				);
				setIsLoggingIn(false);
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
						// Type the error data properly to avoid TypeScript errors
						interface ErrorResponse {
							non_field_errors?: string[];
							code?: string;
							[key: string]: unknown;
						}
						const errorData: ErrorResponse = (response.data as ErrorResponse) || {};

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
						if (!isEmailVerificationError) {
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
											item !== null &&
											'code' in item &&
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
		if (location.state?.oauthError) {
			setGeneralError(
				location.state.message ||
					"OAuth authentication failed. Please try again."
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
			await authService.resendVerificationEmail(userEmail);
			setResendMessage("Verification email sent! Please check your inbox.");
		} catch (error: unknown) {
			console.error("Resend error:", error);
			if (error && typeof error === 'object' && 'response' in error) {
				console.error("Error response:", (error as { response: unknown }).response);
			}
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

	const handleGoogleLogin = async () => {
		// Use django-allauth headless mode API
		await initializeOAuthLogin("google");
	};

	const handleGithubLogin = async () => {
		// Use django-allauth headless mode API
		await initializeOAuthLogin("github");
	};

	/**
	 * Initialize OAuth login using django-allauth headless mode.
	 *
	 * Security Model:
	 * - OAuth endpoints (/_allauth/) are CSRF-exempt in backend middleware
	 * - OAuth 2.0 'state' parameter provides CSRF protection at protocol level
	 * - State is random, session-bound, validated on callback (more secure than cookies)
	 * - CSRF token is optional but included for defense-in-depth
	 *
	 * Flow:
	 * 1. Check session endpoint (validates django-allauth is available)
	 * 2. Get CSRF token from existing cookie (may not exist, that's OK)
	 * 3. POST to provider redirect endpoint (browser follows OAuth redirect)
	 * 4. User authorizes on provider site (Google/GitHub)
	 * 5. Provider redirects to backend callback with OAuth code
	 * 6. Backend validates state, exchanges code, creates session, sets JWT cookies
	 * 7. Backend redirects to frontend, useAuth detects tokens, logs in
	 *
	 * Note: Uses HTML form submission (not fetch) so browser follows OAuth redirect.
	 */
	const initializeOAuthLogin = async (provider: string) => {
		try {
			console.log(`[OAuth] Initializing ${provider} OAuth login`);

			// Step 1: Get CSRF token from cookie (if available)
			const csrfToken = document.cookie
				.split("; ")
				.find((row) => row.startsWith("csrftoken="))
				?.split("=")[1];

			console.log(`[OAuth] CSRF token: ${csrfToken ? 'found' : 'not found'}`);

			// Step 2: Create form and submit through Caddy proxy
			// Use absolute URL with protocol to force full page navigation (bypass React Router)
			const form = document.createElement("form");
			form.method = "POST";
			form.action = "https://localhost:8444/_allauth/browser/v1/auth/provider/redirect";
			// CRITICAL: Force full page reload, prevent React Router interception
			form.target = "_self";

			console.log(`[OAuth] Form action: ${form.action}`);

			// Add form fields
			const fields = {
				provider: provider,
				callback_url: "https://localhost:8444/login", // Use full URL with correct port
				process: "login",
				...(csrfToken ? { csrfmiddlewaretoken: csrfToken } : {}),
			};

			console.log("[OAuth] Form fields:", { ...fields, csrfmiddlewaretoken: csrfToken ? "[PRESENT]" : "[NOT PRESENT]" });

			Object.entries(fields).forEach(([key, value]) => {
				const input = document.createElement("input");
				input.type = "hidden";
				input.name = key;
				input.value = value;
				form.appendChild(input);
			});

			// Set flag to indicate OAuth flow is in progress
			// Store provider name and timestamp for UX timing decisions on return
			sessionStorage.setItem('oauth_in_progress', provider);
			sessionStorage.setItem('oauth_start_time', Date.now().toString());

			// Submit form immediately (browser will perform full page navigation)
			// No artificial delay - user will see Google/GitHub login form immediately if needed
			// Loading spinner will show when returning FROM OAuth (not when going TO OAuth)
			console.log("[OAuth] Submitting form through Caddy proxy...");
			document.body.appendChild(form);
			form.submit();
		} catch (error) {
			console.error("OAuth initialization error:", error);
			setGeneralError("Failed to initiate OAuth login. Please try again.");
		}
	};

	// Show loading content when OAuth is in progress
	if (oauthLoading?.loading) {
		return (
			<LoadingContent
				mode="content"
				message={`Logging in with ${
					oauthLoading.provider === "google" ? "Google" : "GitHub"
				}...`}
				icon={
					oauthLoading.provider === "google" ? (
						<GoogleLogo size={64} />
					) : (
						<Box color="black">
							<GitHubLogo size={64} />
						</Box>
					)
				}
			/>
		);
	}

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

							{/* Divider */}
							<Box position="relative" w="100%" mt={4}>
								<Box
									position="absolute"
									top="50%"
									left="0"
									right="0"
									h="1px"
									bg="border.separator"
								/>
								<Text
									position="relative"
									textAlign="center"
									bg="background.main"
									px={3}
									mx="auto"
									w="fit-content"
									fontSize="14px"
									color="text.muted"
								>
									or continue with
								</Text>
							</Box>

							{/* OAuth Buttons */}
							<HStack gap={3} w="100%" mt={4}>
								<Button
									flex="1"
									variant="outline"
									fontSize="16px"
									onClick={handleGoogleLogin}
									_hover={{
										bg: "background.subItem",
									}}
								>
									<FaGoogle size={18} style={{ marginRight: "8px" }} />
									Google
								</Button>
								<Button
									flex="1"
									variant="outline"
									fontSize="16px"
									onClick={handleGithubLogin}
									_hover={{
										bg: "background.subItem",
									}}
								>
									<FaGithub size={18} style={{ marginRight: "8px" }} />
									GitHub
								</Button>
							</HStack>

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
