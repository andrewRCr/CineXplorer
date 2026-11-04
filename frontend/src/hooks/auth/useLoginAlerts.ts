import logger from "@/services/logger";
import { useState, useCallback } from "react";
import * as authService from "@/services/authService";
import { priorityToaster } from "@/components/core/chakra/toaster";
import { hasErrorStatus } from "@/utilities/axiosErrorUtils";

// ============================================================================
// Types
// ============================================================================

/**
 * Discriminated union for login page alert states.
 * Only one alert can be active at a time.
 */
export type LoginAlert =
    | { type: "general"; message: string }
    | { type: "emailVerification"; message: string; resendToken: string }
    | { type: "registrationSuccess"; message: string }
    | { type: "sessionExpired" };

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
        (message: string, resendToken: string) => {
            setAlert({ type: "emailVerification", message, resendToken });
        },
        [],
    );

    const showRegistrationSuccess = useCallback((message: string) => {
        setAlert({ type: "registrationSuccess", message });
    }, []);

    const showSessionExpired = useCallback(() => {
        setAlert({ type: "sessionExpired" });
    }, []);

    const clearAlert = useCallback(() => {
        setAlert(null);
    }, []);

    // ---------------------------------------------------------------------------
    // Actions
    // ---------------------------------------------------------------------------

    const handleResendVerification = useCallback(
        async (resendToken: string) => {
            try {
                await authService.resendVerificationEmail(resendToken);
                priorityToaster.success({
                    title: "Verification email sent!",
                    description: "Check your inbox for the verification link.",
                });
            } catch (error: unknown) {
                logger.error("Resend verification error:", {
                    errorType: error instanceof Error ? error.name : "unknown",
                });

                // Check for rate limiting (429)
                if (hasErrorStatus(error, 429)) {
                    priorityToaster.error({
                        title: "Too many requests",
                        description:
                            "Please wait a moment before trying again.",
                    });
                } else {
                    priorityToaster.error({
                        title: "Failed to send email",
                        description: "Please try again later.",
                    });
                }
            }
        },
        [],
    );

    return {
        alert,
        showGeneralError,
        showEmailVerificationError,
        showRegistrationSuccess,
        showSessionExpired,
        clearAlert,
        handleResendVerification,
    };
}
