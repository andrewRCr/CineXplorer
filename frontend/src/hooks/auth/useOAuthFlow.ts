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
import { useState, useEffect, useCallback } from "react";

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
}

/**
 * Hook for managing OAuth flow state and initialization.
 *
 * @param onError - Callback to handle OAuth initialization errors
 * @returns OAuth flow state and controls
 */
export function useOAuthFlow(onError?: (error: string) => void): UseOAuthFlowReturn {
  // Initialize OAuth loading state from sessionStorage (prevents form flash on return)
  // Note: State is initialized once - component unmounts during OAuth navigation
  const [oauthLoading] = useState<OAuthLoadingState | null>(() => {
    const oauthProvider = sessionStorage.getItem("oauth_in_progress");
    if (oauthProvider) {
      console.log(
        `[OAuth] Component initializing with OAuth flow in progress: ${oauthProvider}`
      );
      return { provider: oauthProvider, loading: true };
    }
    return null;
  });

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
    [onError]
  );

  // Check if returning from OAuth flow and set up timing gate
  useEffect(() => {
    const oauthProvider = sessionStorage.getItem("oauth_in_progress");
    const startTimeStr = sessionStorage.getItem("oauth_start_time");

    if (oauthProvider && startTimeStr) {
      const startTime = parseInt(startTimeStr, 10);
      const elapsedTime = Date.now() - startTime;

      console.log(
        `[OAuth] Detected return from ${oauthProvider} OAuth flow after ${elapsedTime}ms`
      );

      // For fast OAuth, enforce minimum display time before allowing navigation
      if (elapsedTime < FAST_OAUTH_THRESHOLD) {
        setMinDisplayTimeElapsed(false);

        // Display spinner for MINIMUM_DISPLAY_TIME from NOW
        // This ensures consistent visible duration regardless of OAuth speed
        console.log(
          `[OAuth] Fast OAuth detected, enforcing ${MINIMUM_DISPLAY_TIME}ms minimum display time`
        );

        setTimeout(() => {
          console.log("[OAuth] Minimum display time elapsed, allowing navigation");
          setMinDisplayTimeElapsed(true);
        }, MINIMUM_DISPLAY_TIME);
      } else {
        console.log("[OAuth] Slow OAuth detected, no minimum display time needed");
        // Slow OAuth - user already waited, allow immediate navigation
        setMinDisplayTimeElapsed(true);
      }

      // Cleanup function: Clear flags when component unmounts (during navigation)
      return () => {
        console.log("[OAuth] Component unmounting, clearing OAuth flags");
        sessionStorage.removeItem("oauth_in_progress");
        sessionStorage.removeItem("oauth_start_time");
      };
    }
  }, []);

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
   * 1. Get CSRF token from existing cookie (may not exist, that's OK)
   * 2. Create form and submit through Caddy proxy
   * 3. Browser follows OAuth redirect to provider
   * 4. User authorizes on provider site (Google/GitHub)
   * 5. Provider redirects to backend callback with OAuth code
   * 6. Backend validates state, exchanges code, creates session
   * 7. Backend redirects to frontend, useAuth detects session, logs in
   *
   * Note: Uses HTML form submission (not fetch) so browser follows OAuth redirect.
   */
  const initializeOAuth = useCallback(
    async (provider: string): Promise<void> => {
      try {
        console.log(`[OAuth] Initializing ${provider} OAuth login`);

        // Get CSRF token from cookie (if available)
        const csrfToken = document.cookie
          .split("; ")
          .find((row) => row.startsWith("csrftoken="))
          ?.split("=")[1];

        // Create form and submit through Caddy proxy
        // Use absolute URL with protocol to force full page navigation
        const baseUrl = import.meta.env.VITE_BASE_URL || "https://localhost:8444";
        const form = document.createElement("form");
        form.method = "POST";
        form.action = `${baseUrl}/_allauth/browser/v1/auth/provider/redirect`;
        // CRITICAL: Force full page reload, prevent React Router interception
        form.target = "_self";

        // Add form fields
        const fields: Record<string, string> = {
          provider: provider,
          callback_url: `${baseUrl}/login`,
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
        sessionStorage.setItem("oauth_start_time", Date.now().toString());

        // Submit form immediately (browser will perform full page navigation)
        // No artificial delay - user will see Google/GitHub login form immediately
        // Loading spinner will show when returning FROM OAuth (not when going TO OAuth)
        document.body.appendChild(form);
        form.submit();
      } catch (error) {
        console.error("OAuth initialization error:", error);
        setError("Failed to initiate OAuth login. Please try again.");
      }
    },
    [setError]
  );

  return {
    isLoading: oauthLoading?.loading ?? false,
    provider: oauthLoading?.provider ?? null,
    canNavigate: minDisplayTimeElapsed,
    initializeOAuth,
    setError,
  };
}
