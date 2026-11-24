import { SignUpNotice } from "@/components/auth/SignUpNotice";
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
import {
  matchPath,
  useNavigate,
  useLocation,
  useSearchParams,
} from "react-router";
import useAuthContext from "@/hooks/auth/useAuthContext";
import { useOAuthFlow } from "@/hooks/auth/useOAuthFlow";
import { useLoginAlerts } from "@/hooks/auth/useLoginAlerts";
import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { FaGoogle, FaGithub } from "react-icons/fa";
import { ERROR_CODES } from "@/constants/errors";
import * as authService from "@/services/authService";
import GoogleLogo from "@/assets/GoogleLogo";
import GitHubLogo from "@/assets/GitHubLogo";
import LoadingContent from "@/components/layout/LoadingContent";
import { priorityToaster } from "@/components/core/chakra/toaster";
import { isAxiosError } from "@/utilities/axiosErrorUtils";
import {
  isLegalDocumentPath,
  loginPathFor,
  returnPathFrom,
  safeReturnPath,
} from "@/utilities/returnPath";
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

function readEmailLink(params: URLSearchParams) {
  const verify = params.get("verify");
  if (verify) return { action: "verify", token: verify } as const;
  const reset = params.get("reset");
  return reset ? ({ action: "reset", token: reset } as const) : null;
}

function readLiveEmailLink() {
  return readEmailLink(new URLSearchParams(window.location.search));
}

function isLiveLogin(location: Pick<Location, "pathname" | "search" | "hash">) {
  const current = window.location;
  return (
    matchPath(ROUTES.LOGIN, current.pathname) !== null &&
    current.pathname === location.pathname &&
    current.search === location.search &&
    current.hash === location.hash
  );
}

const Login = () => {
  // ==========================================================================
  // Core Hooks & Context
  // ==========================================================================

  const authContext = useAuthContext();
  const isAuthenticated = authContext?.isAuthenticated;
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
        if (
          visitMounted.current &&
          !isLegalDocumentPath(window.location.pathname) &&
          !latest.current.emailDialogOpen &&
          !readLiveEmailLink()
        ) {
          void navigate(returnPathFrom(location.search));
        }
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
  // Email Links (?verify=TOKEN or ?reset=KEY)
  // ==========================================================================

  const urlLink = readEmailLink(searchParams);
  const hasUrlLink = urlLink !== null;
  const returnTo = safeReturnPath(searchParams.get("next"));
  const [emailLink, setEmailLink] = useState(
    () => urlLink && { ...urlLink, returnPath: returnTo },
  );
  const [emailDialogOpen, setEmailDialogOpen] = useState(emailLink !== null);
  const [verification, setVerification] = useState<{
    state: NonNullable<VerificationState>;
    message?: string;
  }>({ state: "pending" });

  // Only a new link replaces the dialog. Clearing the URL leaves its result visible.
  if (
    urlLink &&
    (emailLink?.action !== urlLink.action || emailLink.token !== urlLink.token)
  ) {
    setEmailLink({ ...urlLink, returnPath: returnTo });
    setEmailDialogOpen(true);
    setVerification({ state: "pending" });
  }

  const latest = useRef({
    location,
    emailLink,
    emailDialogOpen,
    isAuthenticated,
  });
  useLayoutEffect(() => {
    latest.current = { location, emailLink, emailDialogOpen, isAuthenticated };
  }, [location, emailLink, emailDialogOpen, isAuthenticated]);

  const visitMounted = useRef(false);
  useLayoutEffect(() => {
    visitMounted.current = true;
    return () => {
      visitMounted.current = false;
    };
  }, []);

  const isCurrentEmailLink = () => {
    if (!emailLink || latest.current.emailLink !== emailLink) return false;
    if (!matchPath(ROUTES.LOGIN, window.location.pathname)) return true;
    const liveLink = readLiveEmailLink();
    return (
      !liveLink ||
      (liveLink.action === emailLink.action &&
        liveLink.token === emailLink.token)
    );
  };

  const ownsEmailLink = () => visitMounted.current && isCurrentEmailLink();

  const clearEmailLink = () => {
    if (!isLiveLogin(latest.current.location)) return false;
    const liveLink = readLiveEmailLink();
    if (
      !liveLink ||
      liveLink.action !== emailLink?.action ||
      liveLink.token !== emailLink.token
    )
      return false;
    void navigate(loginPathFor(emailLink.returnPath), {
      replace: true,
      state: {},
    });
    return true;
  };

  const dismissEmailLink = () => {
    if (!ownsEmailLink()) return;
    setEmailDialogOpen(false);
    clearEmailLink();
  };

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
    if (emailLink?.action !== "verify" || verification.state !== "pending")
      return;

    setVerification({ state: "verifying" });

    try {
      const response = await authService.verifyEmail(emailLink.token);
      const notice = "Email verified. You can now log in.";
      if (isLegalDocumentPath(window.location.pathname)) {
        priorityToaster.success({ title: notice });
        return;
      }
      if (!ownsEmailLink()) return;
      setVerification({
        state: "success",
        message: response.message || "Email verified successfully!",
      });

      // Pre-fill the username field with verified email (reduces friction)
      if (response.email) {
        void formik.setFieldValue("username", response.email);
      }

      clearEmailLink();
      if (latest.current.isAuthenticated) {
        priorityToaster.success({ title: "Email verified." });
      } else {
        setEmailDialogOpen(true);
        showNotice(notice);
      }

      // Clear verification UI after short delay to let user see success
      verificationTimeoutRef.current = setTimeout(() => {
        if (ownsEmailLink()) setEmailDialogOpen(false);
      }, 1500);
    } catch (error: unknown) {
      const legalPageOpen = isLegalDocumentPath(window.location.pathname);
      if (!legalPageOpen && !ownsEmailLink()) return;
      logger.error("Email verification error:", error);

      // Extract error message
      let errorMessage =
        "Verification failed. The link may be expired or invalid.";
      if (isAxiosError(error)) {
        const data = error.response?.data;
        if (data?.error) errorMessage = data.error;
      }
      if (legalPageOpen) {
        priorityToaster.error({ title: errorMessage });
        return;
      }
      if (!latest.current.isAuthenticated) setEmailDialogOpen(true);
      setVerification({ state: "error", message: errorMessage });
      clearEmailLink();
    }
  };

  // ==========================================================================
  // Password Reset Flow (?reset=KEY)
  // ==========================================================================

  const handlePasswordResetSuccess = (autoLoggedIn: boolean) => {
    const legalPageOpen = isLegalDocumentPath(window.location.pathname);
    if (!legalPageOpen && !isCurrentEmailLink()) return;
    const showedSignedInToast =
      !autoLoggedIn &&
      !legalPageOpen &&
      visitMounted.current &&
      latest.current.isAuthenticated;
    if (showedSignedInToast) {
      priorityToaster.success({ title: "Password reset." });
    }

    setTimeout(() => {
      const legalPageOpen = isLegalDocumentPath(window.location.pathname);
      if (!legalPageOpen && !isCurrentEmailLink()) return;
      const ownsLink = !legalPageOpen && visitMounted.current;
      const dismissed =
        ownsLink &&
        !latest.current.emailDialogOpen &&
        isLiveLogin(latest.current.location);
      if (ownsLink) setEmailDialogOpen(false);
      const clearedLink = ownsLink && clearEmailLink();

      const notice =
        "Password reset. You can now log in with your new password.";
      if (autoLoggedIn) {
        priorityToaster.success({
          title: "Password reset successfully!",
          description: "You are now logged in.",
          duration: 4000,
        });
        if (clearedLink || dismissed) void navigate(ROUTES.HOME);
      } else if (!showedSignedInToast) {
        if (legalPageOpen) {
          priorityToaster.success({ title: notice });
        } else if (ownsLink && latest.current.isAuthenticated) {
          priorityToaster.success({ title: "Password reset." });
        } else if (ownsLink) {
          showNotice(notice);
        }
      }
    }, 1500);
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
    const current = window.location;
    if (
      searchParams.get("signed_out") === "true" &&
      authContext?.status === "anonymous" &&
      current.pathname === location.pathname &&
      current.search === location.search &&
      current.hash === location.hash
    ) {
      showNotice("You've been logged out.");
      window.history.replaceState(window.history.state, "", ROUTES.LOGIN);
    }
  }, [authContext?.status, location, searchParams, showNotice]);

  // ==========================================================================
  // Auth Redirect (already authenticated users)
  // ==========================================================================

  useEffect(() => {
    if (
      isAuthenticated &&
      !isLoggingIn &&
      oauthCanNavigate &&
      !isLegalDocumentPath(window.location.pathname) &&
      (!emailLink || isLiveLogin(location)) &&
      !hasUrlLink &&
      !readLiveEmailLink() &&
      !emailDialogOpen
    ) {
      logger.debug("User already authenticated, redirecting");
      void navigate(returnPathFrom(location.search), { replace: true });
    }
  }, [
    isAuthenticated,
    navigate,
    isLoggingIn,
    oauthCanNavigate,
    location,
    hasUrlLink,
    emailDialogOpen,
    emailLink,
  ]);

  // ==========================================================================
  // OAuth Handlers
  // ==========================================================================

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
        {/* The card's one alert. Screen readers hear notices through the app's live region (useLoginAlerts) and errors
            through their own role="alert" */}
        {alert && (
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
            {alert.type === "general" && (
              <FloatingAlert status="error" onDismiss={clearAlert}>
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

            <SignUpNotice />

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
        verificationState={
          emailDialogOpen && emailLink?.action === "verify"
            ? verification.state
            : null
        }
        verificationMessage={verification.message ?? ""}
        onVerify={() => void handleVerifyEmail()}
        onDismiss={dismissEmailLink}
      />

      {/* Password reset dialog - shown when ?reset=KEY in URL */}
      <PasswordResetDialog
        key={emailLink?.action === "reset" ? emailLink.token : undefined}
        resetKey={
          emailDialogOpen && emailLink?.action === "reset"
            ? emailLink.token
            : null
        }
        isSignedIn={isAuthenticated ?? false}
        onSubmit={authService.resetPassword}
        onSuccess={handlePasswordResetSuccess}
        onDismiss={dismissEmailLink}
      />
    </Box>
  );
};

export default Login;
