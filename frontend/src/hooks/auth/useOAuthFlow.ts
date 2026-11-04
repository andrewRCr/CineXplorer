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
    /** Initialize OAuth flow with specified provider */
    initializeOAuth: (provider: string) => Promise<void>;
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

    // Timing gate: closed if OAuth in progress, opens after minimum display time
    const [minDisplayTimeElapsed, setMinDisplayTimeElapsed] = useState(() => {
        const oauthProvider = sessionStorage.getItem("oauth_in_progress");
        // If OAuth flow in progress, gate starts CLOSED (false)
        // Otherwise gate starts OPEN (true) - no delay needed
        return !oauthProvider;
    });

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

    // Check if returning from OAuth flow and set up timing gate
    useEffect(() => {
        const oauthProvider = sessionStorage.getItem("oauth_in_progress");
        const startTimeStr = sessionStorage.getItem("oauth_start_time");

        // Track timeout for cleanup and mounted state to avoid state updates after unmount
        let displayTimeoutId: ReturnType<typeof setTimeout> | null = null;
        let isMounted = true;

        if (oauthProvider && startTimeStr) {
            const startTime = parseInt(startTimeStr, 10);
            const elapsedTime = Date.now() - startTime;

            logger.debug(
                `[OAuth] Detected return from ${oauthProvider} OAuth flow after ${elapsedTime}ms`,
            );

            // For fast OAuth, enforce minimum display time before allowing navigation
            if (elapsedTime < FAST_OAUTH_THRESHOLD) {
                setMinDisplayTimeElapsed(false);

                // Display spinner for MINIMUM_DISPLAY_TIME from NOW
                // This ensures consistent visible duration regardless of OAuth speed
                logger.debug(
                    `[OAuth] Fast OAuth detected, enforcing ${MINIMUM_DISPLAY_TIME}ms minimum display time`,
                );

                displayTimeoutId = setTimeout(() => {
                    if (isMounted) {
                        logger.debug(
                            "[OAuth] Minimum display time elapsed, allowing navigation",
                        );
                        setMinDisplayTimeElapsed(true);
                    }
                }, MINIMUM_DISPLAY_TIME);
            } else {
                logger.debug(
                    "[OAuth] Slow OAuth detected, no minimum display time needed",
                );
                // Slow OAuth - user already waited, allow immediate navigation
                setMinDisplayTimeElapsed(true);
            }
        }

        // Cleanup function: Clear timeout and flags when component unmounts
        return () => {
            isMounted = false;
            if (displayTimeoutId) {
                clearTimeout(displayTimeoutId);
            }
            // Only clear OAuth flags if we were in an OAuth flow
            if (oauthProvider) {
                logger.debug(
                    "[OAuth] Component unmounting, clearing OAuth flags",
                );
                sessionStorage.removeItem("oauth_in_progress");
                sessionStorage.removeItem("oauth_start_time");
            }
        };
    }, []);

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
        async (provider: string): Promise<void> => {
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
                    callback_url: `${siteOrigin}/login`,
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
