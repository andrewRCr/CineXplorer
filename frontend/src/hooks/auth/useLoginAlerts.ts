import logger from "@/services/logger";
import { useState, useCallback } from "react";
import * as authService from "@/services/authService";
import { getErrorMessage, hasErrorStatus } from "@/utilities/axiosErrorUtils";

// ============================================================================
// Types
// ============================================================================

/**
 * Discriminated union for the login page's alert, shown in the sign-in card above the form.
 * Only one alert can be active at a time.
 */
export type LoginAlert =
    | { type: "general"; message: string }
    | {
          type: "emailVerification";
          message: string;
          resendToken: string;
          /** The last resend failed; the alert keeps its resend action so the visitor can retry. */
          failed?: boolean;
      }
    | { type: "notice"; status: "success" | "info"; message: string };

// ============================================================================
// Hook
// ============================================================================

/**
 * Manages alert state for the Login page.
 *
 * Consolidates the page's messages into a single discriminated union:
 * - general: Auth errors (wrong password, etc.)
 * - emailVerification: Email not verified, with a resend action that reports its result in place
 * - notice: A confirmation or state the visitor arrives with (account created, email verified, signed out, session
 *   expired, password reset)
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

    const showNotice = useCallback(
        (message: string, status: "success" | "info" = "success") => {
            setAlert({ type: "notice", status, message });
        },
        [],
    );

    const clearAlert = useCallback(() => {
        setAlert(null);
    }, []);

    /** Clears an error, keeping a notice: notices clear only when the visitor types or dismisses them. */
    const clearErrorAlert = useCallback(() => {
        setAlert((current) => (current?.type === "notice" ? current : null));
    }, []);

    // ---------------------------------------------------------------------------
    // Actions
    // ---------------------------------------------------------------------------

    const handleResendVerification = useCallback(
        async (resendToken: string) => {
            // A result lands only while its verification alert still shows: the visitor may have dismissed it, typed or
            // signed in again while the request ran.
            const replace = (next: LoginAlert) =>
                setAlert((current) =>
                    current?.type === "emailVerification" &&
                    current.resendToken === resendToken
                        ? next
                        : current,
                );
            const report = (message: string, failed = false) =>
                replace({
                    type: "emailVerification",
                    message,
                    resendToken,
                    failed,
                });
            try {
                await authService.resendVerificationEmail(resendToken);
                report(
                    "Verification email sent. Check your inbox for the link.",
                );
            } catch (error: unknown) {
                // The resend link has expired or was already used, and only signing in again
                // issues a new one, so the alert gives up its resend action.
                if (hasErrorStatus(error, 400)) {
                    replace({
                        type: "general",
                        message:
                            getErrorMessage(error) ||
                            "This resend link has expired. Sign in again to get a new one.",
                    });
                    return;
                }

                logger.error("Resend verification error:", {
                    errorType: error instanceof Error ? error.name : "unknown",
                });

                if (hasErrorStatus(error, 429)) {
                    report(
                        "Too many requests. Please wait a moment before trying again.",
                        true,
                    );
                } else if (hasErrorStatus(error, 503)) {
                    report(
                        getErrorMessage(error) ||
                            "Failed to send the email. Please try again later.",
                        true,
                    );
                } else {
                    report(
                        "Failed to send the email. Please try again later.",
                        true,
                    );
                }
            }
        },
        [],
    );

    return {
        alert,
        showGeneralError,
        showEmailVerificationError,
        showNotice,
        clearAlert,
        clearErrorAlert,
        handleResendVerification,
    };
}
