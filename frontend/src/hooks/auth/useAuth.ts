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
    const navigate = useNavigate();
    const location = useLocation();
    const [firstRead] = useState(() => ({
        providerReturn:
            location.pathname === ROUTES.LOGIN &&
            (document.referrer.includes("google.com") ||
                document.referrer.includes("github.com") ||
                sessionStorage.getItem("oauth_in_progress") !== null),
        returnPath: returnPathFrom(location.search),
        locationKey: location.key,
    }));
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
        session.data === undefined
            ? initialStatus
            : session.data
              ? "authenticated"
              : "anonymous";
    const isAuthenticated = status === "authenticated";

    // Renew idle password sessions before considering them signed out.
    // Provider sessions have no access token and are managed by allauth.
    useEffect(() => {
        const checkTokenExpiration = async () => {
            const sessionVersion = getAuthSessionVersion();
            const change = getChangeCount();
            const { access_token } = getAuthTokens();
            if (isAuthenticated && access_token && areTokensExpired()) {
                try {
                    await refreshAccessToken();
                } catch (error) {
                    if (
                        isCancel(error) ||
                        sessionVersion !== getAuthSessionVersion() ||
                        change !== getChangeCount()
                    )
                        return;
                    await client.cancelQueries({ queryKey: sessionKey });
                    if (
                        sessionVersion !== getAuthSessionVersion() ||
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
        const oauthError = params.get("error");
        if (oauthError) {
            logger.error("OAuth authentication failed", { error: oauthError });
            void navigate(loginPathFor(safeReturnPath(params.get("next"))), {
                state: {
                    oauthError: true,
                    message: "OAuth authentication failed. Please try again.",
                },
            });
            return;
        }
        const clearProviderFlags = () => {
            sessionStorage.removeItem("oauth_in_progress");
            sessionStorage.removeItem("oauth_start_time");
        };
        if (firstRead.providerReturn && !hasHandledOAuthRef.current) {
            if (session.data === undefined) return;
            hasHandledOAuthRef.current = true;
            clearProviderFlags();
            if (session.data && !getAuthTokens().access_token) {
                const displayName =
                    session.data.first_name || session.data.username;
                priorityToaster.success({
                    title: `Welcome back, ${displayName}!`,
                });
                void navigate(firstRead.returnPath);
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
            window.location.href = `${ROUTES.LOGIN}?signed_out=true`;
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
                beginUserChange(client);
                await client.cancelQueries({ queryKey: sessionKey });
                await client.fetchQuery({ ...sessionQuery(), staleTime: 0 });
                void resetUserQueries(client);

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
