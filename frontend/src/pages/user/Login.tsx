import { ROUTES } from "@/constants/routes";
import {
  Box,
  VStack,
  Text,
  HStack,
  Checkbox,
  Button,
} from "@chakra-ui/react";
import { TextLink, FloatingAlert, FloatingAlertContainer } from "@/components/common";
import { AuthFormCard, FormField, EmailVerificationDialog, PasswordResetDialog } from "@/components/auth";
import type { VerificationState } from "@/components/auth";
import { useFormik } from "formik";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import useAuthContext from "@/hooks/auth/useAuthContext";
import { useOAuthFlow } from "@/hooks/auth/useOAuthFlow";
import { useState, useEffect, useRef } from "react";
import { FaGoogle, FaGithub } from "react-icons/fa";
import { ERROR_CODES } from "@/constants/errors";
import * as authService from "@/services/authService";
import GoogleLogo from "@/assets/GoogleLogo";
import GitHubLogo from "@/assets/GitHubLogo";
import LoadingContent from "@/components/layout/LoadingContent";
import { priorityToaster } from "@/components/core/chakra/toaster";

const Login = () => {
  const authContext = useAuthContext();
  const login = authContext?.login;
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [generalError, setGeneralError] = useState("");
  // Email verification error needs special handling (action button for resend)
  const [emailVerificationError, setEmailVerificationError] = useState<{
    message: string;
    email: string;
  } | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  // Registration success message (persistent, non-blocking, top-right)
  const [registrationSuccess, setRegistrationSuccess] = useState<string | null>(null);

  // Email verification via query param (?verify=TOKEN)
  // Uses button safeguard to prevent email client link scanning from consuming tokens
  const verifyToken = searchParams.get("verify");
  const [verificationState, setVerificationState] = useState<VerificationState>(
    verifyToken ? "pending" : null
  );
  const [verificationMessage, setVerificationMessage] = useState("");
  const hasVerifiedRef = useRef(false);

  // Password reset via query param (?reset=KEY)
  const resetKey = searchParams.get("reset");
  const [passwordResetKey, setPasswordResetKey] = useState<string | null>(resetKey);

  // OAuth flow state and controls (extracted to dedicated hook)
  const {
    isLoading: isOAuthLoading,
    provider: oauthProvider,
    canNavigate: oauthCanNavigate,
    initializeOAuth,
  } = useOAuthFlow((error) => setGeneralError(error));

  // Redirect authenticated users away from login page
  // Gate navigation with oauthCanNavigate to enforce minimum spinner display for fast OAuth
  useEffect(() => {
    // Only redirect if:
    // 1. User is authenticated
    // 2. Not in active login process
    // 3. OAuth timing gate allows navigation (for fast OAuth UX)
    if (authContext?.isAuthenticated && !isLoggingIn && oauthCanNavigate) {
      console.log("User already authenticated, redirecting to home");
      // Use replace to avoid adding login page to history
      navigate(ROUTES.HOME, { replace: true });
    }
  }, [authContext?.isAuthenticated, navigate, isLoggingIn, oauthCanNavigate]);

  // Handle email verification when user clicks the button
  const handleVerifyEmail = async () => {
    if (!verifyToken || hasVerifiedRef.current) return;

    hasVerifiedRef.current = true;
    setVerificationState("verifying");

    try {
      const response = await authService.verifyEmail(verifyToken);
      setVerificationState("success");
      setVerificationMessage(response.message || "Email verified successfully!");

      // Clear the token from URL to prevent re-verification attempts
      window.history.replaceState({}, "", ROUTES.LOGIN);

      // Show success toast
      priorityToaster.success({
        title: "Email verified!",
        description: "You can now log in with your account.",
        duration: 6000,
      });

      // Clear verification UI after short delay to let user see success
      setTimeout(() => {
        setVerificationState(null);
      }, 1500);
    } catch (error: unknown) {
      console.error("Email verification error:", error);
      setVerificationState("error");
      hasVerifiedRef.current = false; // Allow retry

      // Extract error message
      let errorMessage = "Verification failed. The link may be expired or invalid.";
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as { response?: { status?: number; data?: { error?: string } } };
        if (axiosError.response?.data?.error) {
          errorMessage = axiosError.response.data.error;
        }
      }
      setVerificationMessage(errorMessage);

      // Clear the token from URL
      window.history.replaceState({}, "", ROUTES.LOGIN);
    }
  };

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
        const toastId = "login-toast";
        priorityToaster.loading({ id: toastId, title: "Logging in..." });

        const response = await login(
          username,
          password,
          formik.values.rememberMe
        );
        setIsLoggingIn(false);

        if (response.success) {
          // Clear any previous error state
          setGeneralError("");
          setEmailVerificationError(null);

          // Show success toast with user's display name (priority position)
          priorityToaster.dismiss(toastId);
          priorityToaster.success({
            title: `Welcome back, ${response.data.displayName}!`,
            duration: 4000,
          });

          navigate(ROUTES.HOME);
        } else {
          // Handle different error cases
          const { status, message, code } = response.error;

          // Check for email verification error (special case with action)
          const isEmailVerificationError =
            status === 400 &&
            (code === ERROR_CODES.EMAIL_NOT_VERIFIED ||
              message.toLowerCase().includes("verify your email") ||
              message.toLowerCase().includes("email verification") ||
              message.toLowerCase().includes("verify email"));

          if (isEmailVerificationError) {
            // Dismiss the loading toast
            priorityToaster.dismiss(toastId);

            // Get email from username if it contains @, otherwise can't offer resend
            const emailForResend = username.includes("@") ? username : "";

            // Use FloatingAlert for email verification (persistent with action)
            setEmailVerificationError({
              message: emailForResend
                ? "Please verify your email address before logging in."
                : "Please verify your email address. Log in with your email to resend verification.",
              email: emailForResend,
            });
            setGeneralError(""); // Clear any general error
          } else {
            // Generic auth error - use FloatingAlert (persistent, dismissible)
            priorityToaster.dismiss(toastId);
            setGeneralError(message);
          }
        }
      }
    },
  });

  // Check for success/error redirects and show appropriate feedback
  useEffect(() => {
    if (location.state?.emailVerified) {
      // Email verified - show success toast (priority position)
      priorityToaster.success({
        title: "Email verified!",
        description: location.state.message || "You can now log in.",
        duration: 6000,
      });
      // Clear the state to prevent showing the message again on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
    if (location.state?.registrationSuccess) {
      // Registration success - show persistent alert (non-blocking, top-right)
      // Uses alert instead of toast so message persists if user looks away
      setRegistrationSuccess(
        location.state.message ||
          "Account created! Please check your email to verify your account before logging in."
      );
      // Clear the state to prevent showing the message again on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
    if (location.state?.oauthError) {
      // OAuth error - set general error for FloatingAlert
      setGeneralError(
        location.state.message ||
          "OAuth authentication failed. Please try again."
      );
      // Clear the state to prevent showing the message again on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const handleResendVerification = async (email: string) => {
    try {
      await authService.resendVerificationEmail(email);
      priorityToaster.success({
        title: "Verification email sent!",
        description: "Check your inbox for the verification link.",
      });
    } catch (error: unknown) {
      console.error("Resend error:", error);
      if (error && typeof error === "object" && "response" in error) {
        console.error(
          "Error response:",
          (error as { response: unknown }).response
        );
      }
      priorityToaster.error({
        title: "Failed to send email",
        description: "Please try again later.",
      });
    }
  };

  const dismissGeneralError = () => {
    setGeneralError("");
  };

  const dismissEmailVerificationError = () => {
    setEmailVerificationError(null);
  };

  const handleGoogleLogin = () => initializeOAuth("google");
  const handleGithubLogin = () => initializeOAuth("github");

  // Show loading content when OAuth is in progress
  if (isOAuthLoading && oauthProvider) {
    return (
      <LoadingContent
        mode="content"
        message={`Logging in with ${
          oauthProvider === "google" ? "Google" : "GitHub"
        }...`}
        icon={
          oauthProvider === "google" ? (
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
      <AuthFormCard>
        <form onSubmit={formik.handleSubmit}>
          <VStack gap="24px" align="flex-start">
              <FormField
                name="username"
                label="Username or Email Address"
                value={formik.values.username}
                error={formik.errors.username}
                touched={formik.touched.username}
                onChange={(e) => {
                  formik.handleChange(e);
                  // Clear alerts when user starts typing
                  setGeneralError("");
                  setEmailVerificationError(null);
                  setRegistrationSuccess(null);
                }}
                onBlur={formik.handleBlur}
                autoFocus
              />
              <FormField
                name="password"
                label="Password"
                type="password"
                value={formik.values.password}
                error={formik.errors.password}
                touched={formik.touched.password}
                onChange={(e) => {
                  formik.handleChange(e);
                  // Clear alerts when user starts typing
                  setGeneralError("");
                  setEmailVerificationError(null);
                  setRegistrationSuccess(null);
                }}
                onBlur={formik.handleBlur}
                mt={3}
              >
                <TextLink to={ROUTES.FORGOT_PASSWORD} fontSize="14px">
                  Forgot password?
                </TextLink>
              </FormField>
              <Checkbox.Root
                mt={3}
                id="rememberMe"
                name="rememberMe"
                checked={formik.values.rememberMe}
                onCheckedChange={(details) => {
                  formik.setFieldValue("rememberMe", Boolean(details.checked));
                }}
                onBlur={() => {
                  formik.setFieldTouched("rememberMe", true);
                }}
              >
                <Checkbox.HiddenInput />
                <Checkbox.Control
                  borderWidth="2px"
                  borderColor="border-strong-01"
                  _hover={{ bg: "layer-hover-01" }}
                  _checked={{
                    bg: "primary",
                    borderColor: "primary"
                  }}
                >
                  <Checkbox.Indicator />
                </Checkbox.Control>
                <Checkbox.Label fontSize="16px">Remember Me</Checkbox.Label>
              </Checkbox.Root>
              <Button
                mt={3}
                type="submit"
                width="full"
                fontSize="16px"
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
                  bg="border"
                />
                <Text
                  position="relative"
                  textAlign="center"
                  bg="layer-01"
                  px={3}
                  mx="auto"
                  w="fit-content"
                  fontSize="14px"
                  color="on-muted"
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
                >
                  <FaGoogle size={18} style={{ marginRight: "8px" }} />
                  Google
                </Button>
                <Button
                  flex="1"
                  variant="outline"
                  fontSize="16px"
                  onClick={handleGithubLogin}
                >
                  <FaGithub size={18} style={{ marginRight: "8px" }} />
                  GitHub
                </Button>
              </HStack>

              <Text mt="4px" textAlign="center" w="100%" fontSize="16px" color="foreground">
                Don't have an account?{" "}
                <TextLink to={ROUTES.REGISTER}>Register</TextLink>
              </Text>
            </VStack>
          </form>
        </AuthFormCard>

      {/* Blocking alerts (center) - auth errors requiring immediate attention */}
      {(generalError || emailVerificationError) && (
        <FloatingAlertContainer>
          {emailVerificationError && (
            <FloatingAlert
              status="error"
              onDismiss={dismissEmailVerificationError}
              action={
                emailVerificationError.email
                  ? {
                      label: "Resend verification",
                      onClick: () =>
                        handleResendVerification(emailVerificationError.email),
                    }
                  : undefined
              }
            >
              {emailVerificationError.message}
            </FloatingAlert>
          )}
          {generalError && (
            <FloatingAlert status="error" onDismiss={dismissGeneralError}>
              {generalError}
            </FloatingAlert>
          )}
        </FloatingAlertContainer>
      )}

      {/* Non-blocking alerts (top-right) - success CTAs that persist but don't block */}
      {registrationSuccess && (
        <FloatingAlertContainer position="top-right">
          <FloatingAlert
            status="success"
            onDismiss={() => setRegistrationSuccess(null)}
          >
            {registrationSuccess}
          </FloatingAlert>
        </FloatingAlertContainer>
      )}

      {/* Email verification dialog - shown when ?verify=TOKEN in URL */}
      <EmailVerificationDialog
        verificationState={verificationState}
        verificationMessage={verificationMessage}
        onVerify={handleVerifyEmail}
        onDismiss={() => {
          setVerificationState(null);
          window.history.replaceState({}, "", ROUTES.LOGIN);
        }}
      />

      {/* Password reset dialog - shown when ?reset=KEY in URL */}
      <PasswordResetDialog
        resetKey={passwordResetKey}
        onSubmit={authService.resetPassword}
        onSuccess={(autoLoggedIn) => {
          setPasswordResetKey(null);
          window.history.replaceState({}, "", ROUTES.LOGIN);

          if (autoLoggedIn) {
            // User was auto-logged in, refresh auth state and redirect
            priorityToaster.success({
              title: "Password reset successfully!",
              description: "You are now logged in.",
              duration: 4000,
            });
            navigate(ROUTES.HOME);
          } else {
            // User needs to login with new password
            priorityToaster.success({
              title: "Password reset successfully!",
              description: "You can now log in with your new password.",
              duration: 6000,
            });
          }
        }}
        onDismiss={() => {
          setPasswordResetKey(null);
          window.history.replaceState({}, "", ROUTES.LOGIN);
        }}
      />
    </Box>
  );
};
export default Login;
