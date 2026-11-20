import { isRecord } from "@/utilities/typeGuards";
import { ROUTES } from "@/constants/routes";
import {
  Box,
  VStack,
  Text,
  HStack,
  Checkbox,
  Button,
  VisuallyHidden,
} from "@chakra-ui/react";
import { TextLink, FloatingAlert } from "@/components/common";
import {
  AuthFormCard,
  FormField,
  EmailVerificationDialog,
  PasswordResetDialog,
} from "@/components/auth";
import type { VerificationState } from "@/components/auth";
import { useFormik } from "formik";
import { useNavigate, useLocation, useSearchParams } from "react-router";
import useAuthContext from "@/hooks/auth/useAuthContext";
import { useOAuthFlow } from "@/hooks/auth/useOAuthFlow";
import { useLoginAlerts } from "@/hooks/auth/useLoginAlerts";
import { useState, useEffect, useRef } from "react";
import { FaGoogle, FaGithub } from "react-icons/fa";
import { ERROR_CODES } from "@/constants/errors";
import * as authService from "@/services/authService";
import GoogleLogo from "@/assets/GoogleLogo";
import GitHubLogo from "@/assets/GitHubLogo";
import LoadingContent from "@/components/layout/LoadingContent";
import { priorityToaster } from "@/components/core/chakra/toaster";
import { isAxiosError } from "@/utilities/axiosErrorUtils";
import { returnPathFrom, safeReturnPath } from "@/utilities/returnPath";
import logger from "@/services/logger";

// ============================================================================
// Login Page
// ============================================================================
//
// This page handles multiple authentication flows:
//
// 1. FORM LOGIN - Username/email + password authentication
// 2. OAUTH LOGIN - Google/GitHub social authentication
// 3. EMAIL VERIFICATION - ?verify=TOKEN param triggers verification dialog
// 4. PASSWORD RESET - ?reset=KEY param triggers reset dialog
// 5. REDIRECT HANDLING - Messages from registration, OAuth callback, etc.
//
// ============================================================================

const Login = () => {
  // ==========================================================================
  // Core Hooks & Context
  // ==========================================================================

  const authContext = useAuthContext();
  const login = authContext?.login;
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Alert state (general errors, email verification, notices), shown in the card above the form
  const {
    alert,
    showGeneralError,
    showEmailVerificationError,
    showNotice,
    clearAlert,
    clearErrorAlert,
    handleResendVerification,
  } = useLoginAlerts();

  // OAuth flow (Google/GitHub)
  // Note: clearLoading is not destructured - automatic sync in useOAuthFlow handles it
  const {
    isLoading: isOAuthLoading,
    provider: oauthProvider,
    canNavigate: oauthCanNavigate,
    initializeOAuth,
  } = useOAuthFlow((error) => showGeneralError(error));

  // ==========================================================================
  // Form Login State
  // ==========================================================================

  const [isLoggingIn, setIsLoggingIn] = useState(false);

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
      // Field validation errors replace an alert error; a notice stays until the visitor types or dismisses it
      if (Object.keys(errors).length > 0) {
        clearErrorAlert();
      }
      return errors;
    },
    onSubmit: async (values) => {
      const { username, password } = values;
      if (!login) return;

      // The submit button shows the sign-in's progress (formik.isSubmitting)
      setIsLoggingIn(true);
      const response = await login(
        username,
        password,
        formik.values.rememberMe,
      );
      setIsLoggingIn(false);

      if (response.success) {
        clearAlert();
        void navigate(returnPathFrom(location.search));
      } else {
        handleLoginError(response.error);
      }
    },
  });

  const handleLoginError = (error: {
    status: number;
    message: string;
    code?: string;
    email?: string;
    resend_token?: string;
  }) => {
    const { status, message, code, email: maskedEmail, resend_token } = error;

    // Check for email verification error (special case with resend action)
    // Backend returns 403 for unverified email with resend_token
    const isEmailVerificationError =
      status === 403 &&
      (code === ERROR_CODES.EMAIL_NOT_VERIFIED ||
        message.toLowerCase().includes("verify your email") ||
        message.toLowerCase().includes("email verification") ||
        message.toLowerCase().includes("verify email"));

    if (isEmailVerificationError && resend_token) {
      // Token-based resend works for all login methods (email or username)
      const alertMessage = maskedEmail
        ? `We've sent a verification link to ${maskedEmail}. Please check your inbox.`
        : "Please check your inbox for a verification link.";
      showEmailVerificationError(alertMessage, resend_token);
    } else if (isEmailVerificationError) {
      // Fallback: no token (shouldn't happen with current backend)
      showGeneralError(message);
    } else {
      showGeneralError(message);
    }
  };

  // ==========================================================================
  // Email Verification Flow (?verify=TOKEN)
  // ==========================================================================

  const verifyToken = searchParams.get("verify");
  const [verificationState, setVerificationState] = useState<VerificationState>(
    verifyToken ? "pending" : null,
  );
  const [verificationMessage, setVerificationMessage] = useState("");
  const hasVerifiedRef = useRef(false);
  const verificationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // Cleanup verification timeout on unmount
  useEffect(() => {
    return () => {
      if (verificationTimeoutRef.current) {
        clearTimeout(verificationTimeoutRef.current);
      }
    };
  }, []);

  const handleVerifyEmail = async () => {
    if (!verifyToken || hasVerifiedRef.current) return;

    hasVerifiedRef.current = true;
    setVerificationState("verifying");

    try {
      const response = await authService.verifyEmail(verifyToken);
      setVerificationState("success");
      setVerificationMessage(
        response.message || "Email verified successfully!",
      );

      // Pre-fill the username field with verified email (reduces friction)
      if (response.email) {
        void formik.setFieldValue("username", response.email);
      }

      // Clear the token from URL to prevent re-verification attempts
      window.history.replaceState({}, "", ROUTES.LOGIN);

      showNotice("Email verified. You can now log in.");

      // Clear verification UI after short delay to let user see success
      verificationTimeoutRef.current = setTimeout(() => {
        setVerificationState(null);
      }, 1500);
    } catch (error: unknown) {
      logger.error("Email verification error:", error);
      setVerificationState("error");
      hasVerifiedRef.current = false; // Allow retry

      // Extract error message
      let errorMessage =
        "Verification failed. The link may be expired or invalid.";
      if (isAxiosError(error)) {
        const data = error.response?.data;
        if (data?.error) errorMessage = data.error;
      }
      setVerificationMessage(errorMessage);
      window.history.replaceState({}, "", ROUTES.LOGIN);
    }
  };

  // ==========================================================================
  // Password Reset Flow (?reset=KEY)
  // ==========================================================================

  const resetKey = searchParams.get("reset");
  const [passwordResetKey, setPasswordResetKey] = useState<string | null>(
    resetKey,
  );

  const handlePasswordResetSuccess = (autoLoggedIn: boolean) => {
    setPasswordResetKey(null);
    window.history.replaceState({}, "", ROUTES.LOGIN);

    if (autoLoggedIn) {
      // A toast fits here: the visitor lands on Home, where nothing else shows the reset happened
      priorityToaster.success({
        title: "Password reset successfully!",
        description: "You are now logged in.",
        duration: 4000,
      });
      void navigate(ROUTES.HOME);
    } else {
      showNotice("Password reset. You can now log in with your new password.");
    }
  };

  const handlePasswordResetDismiss = () => {
    setPasswordResetKey(null);
    window.history.replaceState({}, "", ROUTES.LOGIN);
  };

  // ==========================================================================
  // Redirect Handling (location.state from other pages)
  // ==========================================================================

  useEffect(() => {
    const state: unknown = location.state;
    if (!isRecord(state)) return;
    const message =
      typeof state.message === "string" && state.message
        ? state.message
        : undefined;

    // Email verified redirect (from verification link)
    if (state.emailVerified === true) {
      showNotice(message || "Email verified. You can now log in.");
      void navigate(location.pathname, { replace: true, state: {} });
    }

    // Registration success redirect
    if (state.registrationSuccess === true) {
      showNotice(
        message ||
          "Account created! Please check your email to verify your account before logging in.",
      );
      void navigate(location.pathname, { replace: true, state: {} });
    }

    // OAuth error redirect (keeps `next`, so a retry still returns to the requested page)
    if (state.oauthError === true) {
      showGeneralError(
        message || "OAuth authentication failed. Please try again.",
      );
      void navigate(`${location.pathname}${location.search}`, {
        replace: true,
        state: {},
      });
    }
  }, [location, navigate, showGeneralError, showNotice]);

  // Session expired redirect (from 401 interceptor)
  useEffect(() => {
    if (searchParams.get("session_expired") === "true") {
      showNotice("Session expired. Please log in again.", "info");
      // Clear the param from URL to prevent re-showing on refresh
      window.history.replaceState({}, "", ROUTES.LOGIN);
    }
  }, [searchParams, showNotice]);

  useEffect(() => {
    if (
      searchParams.get("signed_out") === "true" &&
      authContext?.status === "anonymous"
    ) {
      showNotice("You've been logged out.");
      window.history.replaceState({}, "", ROUTES.LOGIN);
    }
  }, [authContext?.status, searchParams, showNotice]);

  // ==========================================================================
  // Auth Redirect (already authenticated users)
  // ==========================================================================

  useEffect(() => {
    // Redirect if:
    // 1. User is authenticated
    // 2. Not in active login process
    // 3. OAuth timing gate allows navigation (for fast OAuth UX)
    if (authContext?.isAuthenticated && !isLoggingIn && oauthCanNavigate) {
      logger.debug("User already authenticated, redirecting");
      void navigate(returnPathFrom(location.search), { replace: true });
    }
  }, [
    authContext?.isAuthenticated,
    navigate,
    isLoggingIn,
    oauthCanNavigate,
    location.search,
  ]);

  // ==========================================================================
  // OAuth Handlers
  // ==========================================================================

  const returnTo = safeReturnPath(searchParams.get("next"));
  const handleGoogleLogin = () => initializeOAuth("google", returnTo);
  const handleGithubLogin = () => initializeOAuth("github", returnTo);

  // ==========================================================================
  // Render: OAuth Loading State
  // ==========================================================================

  if (isOAuthLoading && oauthProvider) {
    return (
      <LoadingContent
        mode="content"
        message={`Logging in with ${oauthProvider === "google" ? "Google" : "GitHub"}...`}
        icon={
          oauthProvider === "google" ? (
            <GoogleLogo size={64} />
          ) : (
            <Box color="foreground">
              <GitHubLogo size={64} />
            </Box>
          )
        }
      />
    );
  }

  // ==========================================================================
  // Render: Main Login Page
  // ==========================================================================

  return (
    <Box
      position="relative"
      minH="100%"
      display="flex"
      alignItems="center"
      justifyContent="center"
      paddingY="32px"
    >
      <VisuallyHidden asChild>
        <h1>Sign in</h1>
      </VisuallyHidden>
      <AuthFormCard>
        {/* Notices and the verification alert share a polite live region that's on the page from the first render,
            so screen readers announce what arrives in it; errors announce themselves (role="alert") */}
        <Box role="status" aria-live="polite">
          {alert && alert.type !== "general" && (
            <Box w="full" mb={6}>
              {alert.type === "emailVerification" && (
                <FloatingAlert
                  status={alert.failed ? "warning" : "info"}
                  onDismiss={clearAlert}
                  action={
                    alert.resendToken
                      ? {
                          label: "Resend verification",
                          onClick: () =>
                            void handleResendVerification(alert.resendToken),
                        }
                      : undefined
                  }
                >
                  {alert.message}
                </FloatingAlert>
              )}
              {alert.type === "notice" && (
                <FloatingAlert status={alert.status} onDismiss={clearAlert}>
                  {alert.message}
                </FloatingAlert>
              )}
            </Box>
          )}
        </Box>
        {alert?.type === "general" && (
          <Box w="full" mb={6}>
            <FloatingAlert status="error" onDismiss={clearAlert}>
              {alert.message}
            </FloatingAlert>
          </Box>
        )}

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
                clearAlert();
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
                clearAlert();
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
                void formik.setFieldValue(
                  "rememberMe",
                  Boolean(details.checked),
                );
              }}
              onBlur={() => {
                void formik.setFieldTouched("rememberMe", true);
              }}
            >
              <Checkbox.HiddenInput />
              <Checkbox.Control
                borderWidth="2px"
                borderColor="border-strong-01"
                _hover={{ bg: "layer-hover-01" }}
                _checked={{
                  bg: "primary",
                  borderColor: "primary",
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
                bg="border-subtle-01"
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
                onClick={() => void handleGoogleLogin()}
              >
                <FaGoogle size={18} style={{ marginRight: "8px" }} />
                Google
              </Button>
              <Button
                flex="1"
                variant="outline"
                fontSize="16px"
                onClick={() => void handleGithubLogin()}
              >
                <FaGithub size={18} style={{ marginRight: "8px" }} />
                GitHub
              </Button>
            </HStack>

            <Text
              mt="4px"
              textAlign="center"
              w="100%"
              fontSize="16px"
              color="foreground"
            >
              Don't have an account?{" "}
              <TextLink to={ROUTES.REGISTER}>Register</TextLink>
            </Text>
          </VStack>
        </form>
      </AuthFormCard>

      {/* ====================================================================
          Dialogs
          ==================================================================== */}

      {/* Email verification dialog - shown when ?verify=TOKEN in URL */}
      <EmailVerificationDialog
        verificationState={verificationState}
        verificationMessage={verificationMessage}
        onVerify={() => void handleVerifyEmail()}
        onDismiss={() => {
          setVerificationState(null);
          window.history.replaceState({}, "", ROUTES.LOGIN);
        }}
      />

      {/* Password reset dialog - shown when ?reset=KEY in URL */}
      <PasswordResetDialog
        resetKey={passwordResetKey}
        onSubmit={authService.resetPassword}
        onSuccess={handlePasswordResetSuccess}
        onDismiss={handlePasswordResetDismiss}
      />
    </Box>
  );
};

export default Login;
