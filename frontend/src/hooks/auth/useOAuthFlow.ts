/**
 * useOAuthFlow
 *
 * Encapsulates OAuth flow initialization and loading state management.
 * Handles the complexity of OAuth redirects, timing gates for UX, and
 * sessionStorage coordination.
 *
 * This hook isolates OAuth-specific concerns that would otherwise clutter
 * login/register components with state management and timing logic.
 */
import { apiBaseUrl, siteOrigin } from "@/config/baseUrls";
import {
    ensureCsrfTokenCookie,
    getCsrfToken,
} from "@/utilities/csrfTokenFetcher";
import { useState, useEffect, useCallback } from "react";
import logger from "@/services/logger";
import { loginPathFor } from "@/utilities/returnPath";

// Constants for OAuth timing UX
const FAST_OAUTH_THRESHOLD = 3000; // 3 seconds
const MINIMUM_DISPLAY_TIME = 500; // 0.5 seconds minimum display

interface OAuthLoadingState {
    provider: string;
    loading: boolean;
}

interface UseOAuthFlowReturn {
    /** Whether OAuth flow is in progress (show loading UI) */
    isLoading: boolean;
    /** The OAuth provider being used (for display purposes) */
    provider: string | null;
    /** Whether minimum display time has elapsed (for navigation gating) */
    canNavigate: boolean;
    /** Start a provider sign-in; `returnTo` is the page to come back to afterwards. */
    initializeOAuth: (
        provider: string,
        returnTo?: string | null,
    ) => Promise<void>;
    /** Set error state (for error handling in parent component) */
    setError: (error: string) => void;
    /** Clear loading state (called when auth resolution completes) */
    clearLoading: () => void;
}

/**
 * Hook for managing OAuth flow state and initialization.
 *
 * @param onError - Callback to handle OAuth initialization errors
 * @returns OAuth flow state and controls
 */
export function useOAuthFlow(
    onError?: (error: string) => void,
): UseOAuthFlowReturn {
    // Initialize OAuth loading state from sessionStorage (prevents form flash on return)
    // State can be cleared when auth resolution completes (success or failure)
    const [oauthLoading, setOauthLoading] = useState<OAuthLoadingState | null>(
        () => {
            const oauthProvider = sessionStorage.getItem("oauth_in_progress");
            if (oauthProvider) {
                logger.debug(
                    `[OAuth] Component initializing with OAuth flow in progress: ${oauthProvider}`,
                );
                return { provider: oauthProvider, loading: true };
            }
            return null;
        },
    );

    const [returnFlow] = useState(() => {
        const provider = sessionStorage.getItem("oauth_in_progress");
        const start = sessionStorage.getItem("oauth_start_time");
        const fast = Boolean(
            provider &&
            start &&
            Date.now() - parseInt(start, 10) < FAST_OAUTH_THRESHOLD,
        );
        return { provider, fast };
    });
    // Only a fast return holds navigation for the minimum display time. Any other return,
    // including one whose start time is missing, can navigate at once.
    const [minDisplayTimeElapsed, setMinDisplayTimeElapsed] = useState(
        !returnFlow.fast,
    );

    // Error callback wrapper
    const setError = useCallback(
        (error: string) => {
            onError?.(error);
        },
        [onError],
    );

    // Clear loading state (called when auth resolution completes - success or failure)
    const clearLoading = useCallback(() => {
        logger.debug("[OAuth] Clearing loading state (auth resolved)");
        setOauthLoading(null);
        sessionStorage.removeItem("oauth_in_progress");
        sessionStorage.removeItem("oauth_start_time");
    }, []);

    // Sync loading state with sessionStorage flag
    // Handles case where OAuth fails (useAuth clears flag but user is not authenticated)
    // For success case, component unmounts during navigation and cleanup handles it
    useEffect(() => {
        if (!oauthLoading) return; // Not in loading state, nothing to sync

        let interval: ReturnType<typeof setInterval> | null = null;

        const checkFlag = () => {
            const flag = sessionStorage.getItem("oauth_in_progress");
            if (!flag) {
                logger.debug(
                    "[OAuth] Flag cleared externally after delay, stopping loading state",
                );
                setOauthLoading(null);
                if (interval) clearInterval(interval);
            }
        };

        // Delay before checking - gives successful OAuth time to complete navigation
        // If flag is gone after delay AND we're still mounted, OAuth likely failed
        const timeout = setTimeout(() => {
            checkFlag();
            // Continue checking in case of slow networks
            interval = setInterval(checkFlag, 200);
        }, 500); // 500ms delay - enough for navigation to complete on success

        return () => {
            clearTimeout(timeout);
            if (interval) clearInterval(interval);
        };
    }, [oauthLoading]);

    useEffect(() => {
        const displayTimeout = returnFlow.fast
            ? setTimeout(
                  () => setMinDisplayTimeElapsed(true),
                  MINIMUM_DISPLAY_TIME,
              )
            : undefined;
        return () => {
            clearTimeout(displayTimeout);
            if (returnFlow.provider) {
                sessionStorage.removeItem("oauth_in_progress");
                sessionStorage.removeItem("oauth_start_time");
            }
        };
    }, [returnFlow]);

    /**
     * Initialize OAuth login using django-allauth headless mode.
     *
     * Django requires the csrftoken cookie and matching csrfmiddlewaretoken form field.
     * If the cookie is missing, initialize it before constructing the form.
     * The provider callback separately validates the session-bound OAuth state.
     * Form submission navigates to the provider, whose callback creates the session;
     * useAuth then detects that session when the browser returns.
     *
     * Note: Uses HTML form submission (not fetch) so browser follows OAuth redirect.
     */
    const initializeOAuth = useCallback(
        async (
            provider: string,
            returnTo: string | null = null,
        ): Promise<void> => {
            try {
                logger.debug(`[OAuth] Initializing ${provider} OAuth login`);

                if (!getCsrfToken()) await ensureCsrfTokenCookie(apiBaseUrl);
                const csrfToken = getCsrfToken();

                // Create form and submit through Caddy proxy
                // Use absolute URL with protocol to force full page navigation
                const form = document.createElement("form");
                form.method = "POST";
                form.action = `${siteOrigin}/_allauth/browser/v1/auth/provider/redirect`;
                // CRITICAL: Force full page reload, prevent React Router interception
                form.target = "_self";

                // Add form fields
                const fields: Record<string, string> = {
                    provider: provider,
                    // allauth returns to this URL as given, so `next` survives the provider round trip.
                    callback_url: `${siteOrigin}${loginPathFor(returnTo)}`,
                    process: "login",
                    ...(csrfToken ? { csrfmiddlewaretoken: csrfToken } : {}),
                };

                Object.entries(fields).forEach(([key, value]) => {
                    const input = document.createElement("input");
                    input.type = "hidden";
                    input.name = key;
                    input.value = value;
                    form.appendChild(input);
                });

                // Set flag to indicate OAuth flow is in progress
                // Store provider name and timestamp for UX timing decisions on return
                sessionStorage.setItem("oauth_in_progress", provider);
                sessionStorage.setItem(
                    "oauth_start_time",
                    Date.now().toString(),
                );

                // Submit form immediately - don't show overlay before navigation
                // The white flash during navigation is browser behavior we can't control
                // The overlay is used on RETURN from OAuth (handled in index.html)
                document.body.appendChild(form);
                form.submit();
            } catch (error) {
                logger.error("OAuth initialization error:", {
                    errorType: error instanceof Error ? error.name : "unknown",
                });
                setError("Failed to initiate OAuth login. Please try again.");
            }
        },
        [setError],
    );

    return {
        isLoading: oauthLoading?.loading ?? false,
        provider: oauthLoading?.provider ?? null,
        canNavigate: minDisplayTimeElapsed,
        initializeOAuth,
        setError,
        clearLoading,
    };
}
