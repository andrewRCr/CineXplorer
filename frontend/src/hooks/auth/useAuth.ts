import { useQuery, useQueryClient } from "@tanstack/react-query";
import { sessionQuery } from "@/lib/queries";
import {
    sessionKey,
    ALLAUTH_SESSION_URL,
    beginUserChange,
    resetUserQueries,
    changeOfUser,
    getChangeCount,
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
import { matchPath, useNavigate, useLocation } from "react-router";
import type {
    AuthStateProps,
    AuthStatus,
    AuthResult,
    AuthError,
} from "@/types/auth-state";
import {
    isLegalDocumentPath,
    loginPathFor,
    returnPathFrom,
    safeReturnPath,
} from "@/utilities/returnPath";
import {
    getAuthSessionVersion,
    isSessionResolving,
    canHandlePasswordFailure,
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

const OAUTH_SIGNUP_CLOSED = {
    code: "signup_closed",
    message:
        "GitHub didn't share a verified primary email address, so we couldn't create your account. Verify one in your GitHub email settings and try again, or sign up with email.",
};

function blocksOAuthNavigation(pathname: string, search: string): boolean {
    if (isLegalDocumentPath(pathname)) return true;
    if (!matchPath(ROUTES.LOGIN, pathname)) return false;
    const params = new URLSearchParams(search);
    return params.has("verify") || params.has("reset");
}

export function useAuth(): AuthStateProps {
    const navigate = useNavigate();
    const location = useLocation();
    const [firstRead] = useState(() => {
        const onLogin = location.pathname === ROUTES.LOGIN;
        const provider = sessionStorage.getItem("oauth_in_progress");
        const fromGoogle = document.referrer.includes("google.com");
        const params = new URLSearchParams(location.search);
        return {
            providerReturn:
                onLogin &&
                (fromGoogle ||
                    document.referrer.includes("github.com") ||
                    provider !== null),
            hasEmailLink:
                onLogin && Boolean(params.get("verify") || params.get("reset")),
            requireConfirmedProviderSignOut:
                onLogin &&
                provider === "google" &&
                !params.has("error") &&
                !blocksOAuthNavigation(location.pathname, location.search),
            returnPath: returnPathFrom(location.search),
            locationKey: location.key,
        };
    });
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
    const session = useQuery(sessionQuery(firstRead));
    const user = session.data ?? null;
    const status: AuthStatus =
        session.data === undefined && !session.isError
            ? initialStatus
            : session.data
              ? "authenticated"
              : "anonymous";
    const isAuthenticated = status === "authenticated";

    // Renew idle password sessions before considering them signed out.
    // Provider sessions have no access token and are managed by allauth.
    useEffect(() => {
        const checkTokenExpiration = async () => {
            if (isSessionResolving()) return;
            const sessionVersion = getAuthSessionVersion();
            const change = getChangeCount();
            const { access_token } = getAuthTokens();
            if (isAuthenticated && access_token && areTokensExpired()) {
                try {
                    await refreshAccessToken();
                } catch (error) {
                    if (
                        isCancel(error) ||
                        !canHandlePasswordFailure(sessionVersion) ||
                        change !== getChangeCount()
                    )
                        return;
                    await client.cancelQueries({ queryKey: sessionKey });
                    if (
                        !canHandlePasswordFailure(sessionVersion) ||
                        change !== getChangeCount()
                    )
                        return;
                    clearAuthTokens();
                    client.setQueryData(sessionQuery().queryKey, null);
                    void changeOfUser(client);
                }
            }
        };
        const interval = setInterval(() => {
            void checkTokenExpiration();
        }, 60000);
        return () => clearInterval(interval);
    }, [client, isAuthenticated]);

    const hasHandledOAuthRef = useRef(false);
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const errorCode = params.get("error");
        // Browser history can change before React Router commits the location.
        const canNavigate =
            !blocksOAuthNavigation(location.pathname, location.search) &&
            !blocksOAuthNavigation(
                window.location.pathname,
                window.location.search,
            );
        if (errorCode && canNavigate) {
            // Use the fixed failure code in reports because the URL is user-controlled.
            logger.error("OAuth authentication failed", { error: "oauth" });
            void navigate(loginPathFor(safeReturnPath(params.get("next"))), {
                state: {
                    oauthError: true,
                    message:
                        errorCode === OAUTH_SIGNUP_CLOSED.code
                            ? OAUTH_SIGNUP_CLOSED.message
                            : "Sign-in failed. Try again in a few minutes or choose Forgot password.",
                },
            });
            return;
        }
        const clearProviderFlags = () => {
            sessionStorage.removeItem("oauth_in_progress");
            sessionStorage.removeItem("oauth_start_time");
        };
        if (firstRead.providerReturn && !hasHandledOAuthRef.current) {
            if (session.data === undefined && !session.isError) return;
            hasHandledOAuthRef.current = true;
            clearProviderFlags();
            if (!canNavigate || firstRead.hasEmailLink) return;
            if (session.data && !getAuthTokens().access_token) {
                void navigate(firstRead.returnPath);
            } else if (
                session.data === null &&
                !session.isError &&
                firstRead.requireConfirmedProviderSignOut &&
                location.key === firstRead.locationKey &&
                location.pathname === ROUTES.LOGIN &&
                window.location.pathname === ROUTES.LOGIN
            ) {
                void navigate(loginPathFor(firstRead.returnPath), {
                    replace: true,
                    state: {
                        oauthError: true,
                        message:
                            "You're still signed out. Try again in a few minutes or choose Forgot password.",
                    },
                });
            }
        } else if (
            location.pathname === ROUTES.LOGIN &&
            location.key !== firstRead.locationKey
        ) {
            clearProviderFlags();
        }
    }, [
        firstRead,
        location.key,
        location.pathname,
        location.search,
        navigate,
        session.data,
        session.isError,
    ]);

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
        void changeOfUser(client);
        void navigate(ROUTES.LOGIN);

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
            // The local session is already anonymous; always finish with a fresh read.
        } finally {
            if (isLegalDocumentPath(window.location.pathname)) {
                window.location.reload();
            } else {
                window.location.href = `${ROUTES.LOGIN}?signed_out=true`;
            }
        }
    }, [client, navigate]);

    const login = async (
        username: string,
        password: string,
        rememberMe: boolean = false,
    ): Promise<AuthResult<void>> => {
        try {
            logger.debug(
                "[useAuth] login() called, attempting authentication...",
            );
            const response = await authService.login(
                username,
                password,
                rememberMe,
            );

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
                beginUserChange(client);
                await client.cancelQueries({ queryKey: sessionKey });
                await client.fetchQuery({ ...sessionQuery(), staleTime: 0 });
                void resetUserQueries(client);

                return { success: true, data: undefined };
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
