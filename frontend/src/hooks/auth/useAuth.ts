import { useQuery, useQueryClient } from "@tanstack/react-query";
import { sessionQuery } from "@/lib/queries";
import {
    sessionKey,
    ALLAUTH_SESSION_URL,
    checkOAuthSession,
} from "@/lib/session";
/**
 * useAuth
 *
 * Session state comes from the shared query; authentication commands write it after cancelling reads.
 * It is used by AuthContextProvider to provide state to the context.
 *
 * Supports hybrid authentication:
 * - Instant auth detection from localStorage (no network call needed)
 * - OAuth callbacks authenticated through their allauth session
 * - Shared token refresh on load, idle checks, profile loading and API refusals
 *
 * Relationship:
 * - Called by AuthContextProvider to get auth state and actions.
 * - State is shared via AuthContext.
 * - Components access state using useAuthContext.
 */
import { apiBaseUrl } from "@/config/baseUrls";
import {
    ensureCsrfTokenCookie,
    getCsrfToken,
} from "@/utilities/csrfTokenFetcher";
import { ROUTES } from "@/constants/routes";
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import type {
    AuthStateProps,
    AuthStatus,
    AuthResult,
    AuthError,
    LoginSuccessData,
} from "@/types/auth-state";
import {
    loginPathFor,
    returnPathFrom,
    safeReturnPath,
} from "@/utilities/returnPath";
import {
    getAuthSessionVersion,
    invalidateAuthSession,
    refreshAccessToken,
} from "@/services/apiClient";
import { isCancel } from "axios";
import logger from "@/services/logger";
import {
    getInitialAuthenticatedValue,
    getAuthTokens,
    setAuthTokens,
    clearAuthTokens,
    areTokensExpired,
    type TokenStorage,
} from "@/utilities/tokenUtils";
import { isAxiosError } from "@/utilities/axiosErrorUtils";
import * as authService from "@/services/authService";
import { priorityToaster } from "@/components/core/chakra/toaster";

export function useAuth(): AuthStateProps {
    const [initialStatus] = useState<AuthStatus>(() => {
        // Detect access tokens in localStorage, then sessionStorage.
        const { access_token } = getAuthTokens();
        const isExpired = areTokensExpired();
        const hasAuthFlag = getInitialAuthenticatedValue();
        const signedIn = access_token !== null && !isExpired && hasAuthFlag;

        logger.debug("[useAuth] Initial state calculation", {
            has_access_token: access_token !== null,
            is_expired: isExpired,
            has_auth_flag: hasAuthFlag,
            result: signedIn,
        });

        // Preserve immediate sign-in for a current stored token and flag until the
        // session query lands. Other visitors stay resolving during its first read.
        return signedIn ? "authenticated" : "resolving";
    });
    const client = useQueryClient();
    const session = useQuery(sessionQuery());
    const user = session.data ?? null;
    const status: AuthStatus =
        session.data === undefined
            ? initialStatus
            : session.data
              ? "authenticated"
              : "anonymous";
    const isAuthenticated = status === "authenticated";
    const navigate = useNavigate();
    const location = useLocation();

    // Renew idle password sessions before considering them signed out.
    // Provider sessions have no access token and are managed by allauth.
    useEffect(() => {
        const checkTokenExpiration = async () => {
            const sessionVersion = getAuthSessionVersion();
            const { access_token } = getAuthTokens();
            if (isAuthenticated && access_token && areTokensExpired()) {
                try {
                    await refreshAccessToken();
                } catch (error) {
                    if (
                        isCancel(error) ||
                        sessionVersion !== getAuthSessionVersion()
                    )
                        return;
                    await client.cancelQueries({ queryKey: sessionKey });
                    if (sessionVersion !== getAuthSessionVersion()) return;
                    clearAuthTokens();
                    client.setQueryData(sessionQuery().queryKey, null);
                }
            }
        };
        const interval = setInterval(() => {
            void checkTokenExpiration();
        }, 60000);
        return () => clearInterval(interval);
    }, [client, isAuthenticated]);

    // Ref to prevent duplicate OAuth callback handling (StrictMode double-invokes effects)
    const hasHandledOAuthRef = useRef(false);

    // Handle OAuth callback (when redirected back from Google/GitHub)
    // Supports two authentication patterns:
    // 1. OAuth: Session cookies only (HTTP-only, managed by django-allauth)
    // 2. Email/Password: JWT tokens (checked via localStorage/sessionStorage)
    useEffect(() => {
        // Skip if already authenticated to prevent loops
        if (isAuthenticated) {
            return;
        }

        const handleOAuthCallback = async () => {
            // Guard against double-invocation (StrictMode, fast re-renders)
            if (hasHandledOAuthRef.current) {
                logger.debug(
                    "[useAuth] OAuth callback already handled, skipping",
                );
                return;
            }
            const params = new URLSearchParams(location.search);
            const oauthError = params.get("error");

            // OAuth error handling (check first)
            if (oauthError) {
                logger.error("OAuth authentication failed", {
                    error: oauthError,
                });
                // Keep the page the visitor asked for, so a retry still returns there.
                void navigate(
                    loginPathFor(safeReturnPath(params.get("next"))),
                    {
                        state: {
                            oauthError: true,
                            message:
                                "OAuth authentication failed. Please try again.",
                        },
                    },
                );
                return;
            }

            // Check if we just came from an OAuth redirect
            // Only check session if we have a referrer or state indicating OAuth flow
            // This prevents auto-login on every /login page visit
            const oauthInProgress = sessionStorage.getItem("oauth_in_progress");
            const isFromOAuthRedirect =
                document.referrer.includes("google.com") ||
                document.referrer.includes("github.com") ||
                oauthInProgress !== null; // Check for existence, not 'true' (value is provider name)

            // ONLY run callback handling for:
            // 1. OAuth redirects (from Google/GitHub with oauth_in_progress flag)
            // 2. OAuth error callbacks (handled above)
            // Do NOT run on every navigation when not authenticated
            if (!isFromOAuthRedirect && !oauthError) {
                return; // Skip callback handling for normal navigation
            }

            logger.debug("[useAuth] Callback handler running", {
                pathname: location.pathname,
                search: location.search,
                isFromOAuthRedirect,
                oauthError,
            });

            // Check if we're on the OAuth callback path (e.g., /login after OAuth redirect)
            // OAuth authentication uses session cookies (NO tokens in URL)
            if (location.pathname === ROUTES.LOGIN && isFromOAuthRedirect) {
                logger.debug(
                    "[useAuth] OAuth redirect detected, checking session...",
                );

                // Mark as handled BEFORE async operation to prevent race conditions
                hasHandledOAuthRef.current = true;

                const oauthUser = await checkOAuthSession();

                // Clear OAuth flags AFTER session check completes
                // useOAuthFlow monitors this and will clear its loading state
                sessionStorage.removeItem("oauth_in_progress");
                sessionStorage.removeItem("oauth_start_time");

                if (oauthUser) {
                    logger.debug(
                        "[useAuth] OAuth callback - authenticated via session cookie",
                    );
                    await client.cancelQueries({ queryKey: sessionKey });
                    client.setQueryData(sessionQuery().queryKey, oauthUser);

                    // Show welcome toast for OAuth login (priority position)
                    const displayName =
                        oauthUser.first_name || oauthUser.username;
                    priorityToaster.success({
                        title: `Welcome back, ${displayName}!`,
                    });

                    void navigate(returnPathFrom(location.search));
                    return;
                } else {
                    logger.debug(
                        "[useAuth] Session response shows not authenticated",
                    );
                    // OAuth failed - flags already cleared above
                    // useOAuthFlow will detect this and show login form
                    // Reset ref so user can retry OAuth
                    hasHandledOAuthRef.current = false;
                }
            }
        };

        void handleOAuthCallback();
        // Intentional: only re-run when URL changes, not when auth state changes.
        // Adding isAuthenticated/navigate would cause loops during OAuth redirect handling.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname, location.search]);

    const logout = useCallback(async () => {
        // Check authentication pattern BEFORE clearing tokens
        const { access_token } = getAuthTokens();
        const isJWTUser = access_token !== null;

        // Invalidate queued and in-flight renewal before clearing the session.
        invalidateAuthSession();
        // Clear local state and tokens
        clearAuthTokens();
        // Cancellation retires the read synchronously before this write and navigation.
        void client.cancelQueries({ queryKey: sessionKey });
        client.setQueryData(sessionQuery().queryKey, null);
        void navigate(ROUTES.LOGIN);

        // Show logout success toast (appears on login page after redirect)
        // Uses priorityToaster for auth flow consistency (top-right, same as login)
        priorityToaster.success({ title: "You've been logged out" });

        try {
            if (isJWTUser) {
                // JWT user - logout via custom endpoint
                logger.debug("[useAuth] Logging out JWT user via /api/logout/");
                await authService.logout();
            } else {
                // OAuth user - logout via session endpoint
                logger.debug(
                    "[useAuth] Logging out OAuth user via session endpoint",
                );
                await ensureCsrfTokenCookie(apiBaseUrl);
                const response = await fetch(ALLAUTH_SESSION_URL, {
                    method: "DELETE",
                    credentials: "include", // Send session cookie
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRFToken": getCsrfToken() || "",
                    },
                });

                // 401 is acceptable - means session already expired/cleared
                // We've already cleared local state, so logout succeeded from UX perspective
                if (!response.ok && response.status !== 401) {
                    logger.warn(
                        `[useAuth] Session DELETE returned ${response.status}, but local state already cleared`,
                    );
                }
            }
        } catch (error) {
            logger.error("Logout failed", { error });
            // Don't reject - we've already cleared local state, user is logged out from UX perspective
        }
    }, [client, navigate]);

    const login = async (
        username: string,
        password: string,
        rememberMe: boolean = false,
    ): Promise<AuthResult<LoginSuccessData>> => {
        try {
            logger.debug(
                "[useAuth] login() called, attempting authentication...",
            );
            const response = await authService.login(username, password);

            const user_id = response.user_id;
            const accessToken = response.access_token;

            if (user_id && accessToken) {
                // Choose storage based on remember me setting
                const storage: TokenStorage = rememberMe
                    ? "localStorage"
                    : "sessionStorage";

                // A new sign-in owns storage and supersedes any previous renewal.
                invalidateAuthSession();
                clearAuthTokens();
                setAuthTokens(accessToken, storage);
                await client.cancelQueries({ queryKey: sessionKey });
                await client.fetchQuery({ ...sessionQuery(), staleTime: 0 });

                // Return display name for component to use in success feedback
                const displayName = response.first_name || response.username;
                return { success: true, data: { displayName } };
            }

            // Login response missing required credentials
            logger.error("[useAuth] login() response missing tokens", {
                hasUserId: !!user_id,
                hasAccessToken: !!accessToken,
            });

            return {
                success: false,
                error: {
                    status: 500,
                    message: "Login failed: invalid server response",
                },
            };
        } catch (error: unknown) {
            logger.error("[useAuth] login() error", { error });
            const authError: AuthError = {
                status: 500,
                message: "Login failed",
            };

            if (isAxiosError(error) && error.response) {
                const { status, data } = error.response;
                const responseData = data;
                authError.status = status || 500;
                authError.message =
                    responseData?.detail ||
                    responseData?.error ||
                    "Login failed";
                if (responseData?.code) authError.code = responseData.code;
                if (responseData?.email) authError.email = responseData.email;
                if (responseData?.resend_token)
                    authError.resend_token = responseData.resend_token;
            } else if (error instanceof Error) {
                authError.message = error.message;
            }

            return { success: false, error: authError };
        }
    };

    const register = async (
        username: string,
        email: string,
        password: string,
    ): Promise<AuthResult<void>> => {
        try {
            await authService.register(username, email, password);
            return { success: true, data: undefined };
        } catch (error: unknown) {
            const authError: AuthError = {
                status: 500,
                message: "Registration failed",
            };

            if (isAxiosError(error) && error.response) {
                const { status, data } = error.response;
                const responseData = data;
                authError.status = status || 500;
                authError.message =
                    responseData?.detail ||
                    responseData?.error ||
                    "Registration failed";
                if (responseData?.code) authError.code = responseData.code;
            } else if (error instanceof Error) {
                authError.message = error.message;
            }

            return { success: false, error: authError };
        }
    };

    return { login, status, isAuthenticated, logout, register, user };
}
