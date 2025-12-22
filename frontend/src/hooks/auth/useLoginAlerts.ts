import { useState, useCallback } from "react";
import * as authService from "@/services/authService";
import { priorityToaster } from "@/components/core/chakra/toaster";

// ============================================================================
// Types
// ============================================================================

/**
 * Discriminated union for login page alert states.
 * Only one alert can be active at a time.
 */
export type LoginAlert =
  | { type: "general"; message: string }
  | { type: "emailVerification"; message: string; email: string }
  | { type: "registrationSuccess"; message: string };

// ============================================================================
// Hook
// ============================================================================

/**
 * Manages alert state for the Login page.
 *
 * Consolidates three alert types into a single discriminated union:
 * - general: Auth errors (wrong password, etc.)
 * - emailVerification: Email not verified (with optional resend action)
 * - registrationSuccess: Post-registration CTA
 */
export function useLoginAlerts() {
  const [alert, setAlert] = useState<LoginAlert | null>(null);

  // ---------------------------------------------------------------------------
  // Alert Setters
  // ---------------------------------------------------------------------------

  const showGeneralError = useCallback((message: string) => {
    setAlert({ type: "general", message });
  }, []);

  const showEmailVerificationError = useCallback(
    (message: string, email: string) => {
      setAlert({ type: "emailVerification", message, email });
    },
    []
  );

  const showRegistrationSuccess = useCallback((message: string) => {
    setAlert({ type: "registrationSuccess", message });
  }, []);

  const clearAlert = useCallback(() => {
    setAlert(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const handleResendVerification = useCallback(async (email: string) => {
    try {
      await authService.resendVerificationEmail(email);
      priorityToaster.success({
        title: "Verification email sent!",
        description: "Check your inbox for the verification link.",
      });
    } catch (error: unknown) {
      console.error("Resend verification error:", error);
      priorityToaster.error({
        title: "Failed to send email",
        description: "Please try again later.",
      });
    }
  }, []);

  return {
    alert,
    showGeneralError,
    showEmailVerificationError,
    showRegistrationSuccess,
    clearAlert,
    handleResendVerification,
  };
}
