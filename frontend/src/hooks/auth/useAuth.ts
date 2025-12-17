/**
 * useAuth
 *
 * This custom React hook manages authentication state and actions (login, logout, register, user info).
 * It is used by AuthContextProvider to provide state to the context.
 *
 * Supports hybrid authentication:
 * - Instant auth detection from localStorage (no network call needed)
 * - OAuth callback handling with access token storage
 * - Automatic token refresh via axios interceptor
 *
 * Relationship:
 * - Called by AuthContextProvider to get auth state and actions.
 * - State is shared via AuthContext.
 * - Components access state using useAuthContext.
 */
import { ROUTES } from "@/constants/routes";
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import type { AuthStateProps, AuthResult, AuthError } from "@/@types/auth-state";
import logger from "@/services/logger";
import {
    getInitialAuthenticatedValue,
    getAuthTokens,
    setAuthTokens,
    clearAuthTokens,
    areTokensExpired,
    type TokenStorage,
} from "@/utilities/token";
import type { components } from "@/types/api";
import * as authService from "@/services/authService";

// Type alias for user profile from generated API types
type UserProfile = components["schemas"]["UserProfileSchema"];

// Derive base URL for allauth endpoints (not under /api/)
const BASE_URL = import.meta.env.VITE_BASE_URL || 'https://localhost:8444';
const ALLAUTH_SESSION_URL = `${BASE_URL}/_allauth/browser/v1/auth/session`;

// Helper type for allauth session response
interface AllauthSessionResponse {
    meta?: { is_authenticated?: boolean };
    data?: { user?: UserProfile };
}

/**
 * Check OAuth session status via allauth session endpoint.
 * Used for both initial mount detection and OAuth callback handling.
 * @returns User profile if authenticated, null otherwise
 */
async function checkOAuthSession(): Promise<UserProfile | null> {
    try {
        const response = await fetch(ALLAUTH_SESSION_URL, {
            method: 'GET',
            credentials: 'include',
        });

        if (response.ok) {
            const data: AllauthSessionResponse = await response.json();
            if (data?.meta?.is_authenticated && data?.data?.user) {
                return data.data.user;
            }
        }
        return null;
    } catch {
        return null;
    }
}

export function useAuth(): AuthStateProps & { user: UserProfile | null } {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
        // Hybrid auth: Instant authentication detection from localStorage/cookie
        // Priority: cookie → localStorage → sessionStorage (handled by getAuthTokens)
        const { access_token } = getAuthTokens();
        const isExpired = areTokensExpired();
        const hasAuthFlag = getInitialAuthenticatedValue();

        logger.debug('[useAuth] Initial state calculation', {
            has_access_token: access_token !== null,
            is_expired: isExpired,
            has_auth_flag: hasAuthFlag,
            result: access_token !== null && !isExpired && hasAuthFlag
        });

        // Three conditions must be met:
        // 1. Access token exists (in cookie, localStorage, or sessionStorage)
        // 2. Token is not expired (checked via JWT exp claim or localStorage timestamp)
        // 3. isAuthenticated flag is set (fast boolean check without JWT parsing)
        return access_token !== null && !isExpired && hasAuthFlag;
    });
    const [user, setUser] = useState<UserProfile | null>(null);
    const navigate = useNavigate();
    const location = useLocation();

    // Refs to hold latest callback versions - breaks circular dependency in effects
    // Effects can call ref.current() without needing the callback in dependency array
    const logoutRef = useRef<() => Promise<void>>(() => Promise.resolve());
    const getUserDetailsRef = useRef<() => Promise<unknown>>(() => Promise.resolve());

    // On initial mount, check for existing authentication (JWT or session)
    // This runs ONCE on mount to detect existing sessions
    useEffect(() => {
        const checkExistingAuth = async () => {
            // Skip if already authenticated (initial state calculation succeeded)
            if (isAuthenticated) {
                const { access_token } = getAuthTokens();
                // Only call getUserDetails if user has JWT tokens (email/password flow)
                if (access_token) {
                    getUserDetailsRef.current?.();
                }
                return;
            }

            // Check for JWT tokens in cookie/localStorage (email/password flow)
            const { access_token, storage } = getAuthTokens();
            if (access_token && !areTokensExpired()) {
                logger.debug(`[useAuth] Initial mount: JWT session detected in ${storage}`);

                // If token came from cookie, store it in localStorage for future use
                if (storage === "cookie") {
                    setAuthTokens(access_token);
                }

                setIsAuthenticated(true);
                // getUserDetails will be called on next render when isAuthenticated changes
                return;
            }

            // No JWT tokens found - check for OAuth session cookie
            // This handles page refreshes for OAuth users (Google/GitHub login)
            logger.debug('[useAuth] No JWT tokens found, checking for OAuth session...');
            const oauthUser = await checkOAuthSession();
            if (oauthUser) {
                logger.debug('[useAuth] OAuth session detected, user authenticated');
                setUser(oauthUser);
                setIsAuthenticated(true);
            } else {
                logger.debug('[useAuth] No active session found');
            }
        };

        checkExistingAuth();
        // Intentional: must run exactly once on mount to check for existing session.
        // Adding isAuthenticated would cause infinite loops.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // When authentication state changes, fetch user details (JWT users only)
    useEffect(() => {
        if (isAuthenticated) {
            const { access_token } = getAuthTokens();
            // Only call getUserDetails if user has JWT tokens (email/password flow)
            // OAuth users have session cookies only, user data already set from session endpoint
            if (access_token) {
                getUserDetailsRef.current?.();
            }
        }
    }, [isAuthenticated]);

    // Check for token expiration every minute (JWT-only)
    // Note: Token refresh is handled automatically by axios interceptor (apiClient.ts)
    // This is just for proactive logout if token expires while idle
    // OAuth users (session-only) are skipped - their sessions managed by backend
    useEffect(() => {
        const checkTokenExpiration = () => {
            const { access_token } = getAuthTokens();
            // Only check expiration for JWT users (email/password flow)
            // OAuth users have session cookies only, no JWT tokens
            if (isAuthenticated && access_token && areTokensExpired()) {
                logger.debug("Tokens expired during session, logging out...");
                logoutRef.current?.();
            }
        };

        const interval = setInterval(checkTokenExpiration, 60000); // Check every minute
        return () => clearInterval(interval);
    }, [isAuthenticated]);

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
            const params = new URLSearchParams(location.search);
            const oauthError = params.get('error');

            // OAuth error handling (check first)
            if (oauthError) {
                logger.error("OAuth authentication failed", { error: oauthError });
                navigate(ROUTES.LOGIN, {
                    state: {
                        oauthError: true,
                        message: "OAuth authentication failed. Please try again."
                    }
                });
                return;
            }

            // Check if we just came from an OAuth redirect
            // Only check session if we have a referrer or state indicating OAuth flow
            // This prevents auto-login on every /login page visit
            const isFromOAuthRedirect =
                document.referrer.includes('google.com') ||
                document.referrer.includes('github.com') ||
                sessionStorage.getItem('oauth_in_progress') === 'true';

            // ONLY run callback handling for:
            // 1. OAuth redirects (from Google/GitHub with oauth_in_progress flag)
            // 2. OAuth error callbacks (handled above)
            // Do NOT run on every navigation when not authenticated
            if (!isFromOAuthRedirect && !oauthError) {
                return; // Skip callback handling for normal navigation
            }

            logger.debug('[useAuth] Callback handler running', {
                pathname: location.pathname,
                search: location.search,
                isFromOAuthRedirect,
                oauthError
            });

            // Check if we're on the OAuth callback path (e.g., /login after OAuth redirect)
            // OAuth authentication uses session cookies (NO tokens in URL)
            if (location.pathname === ROUTES.LOGIN && isFromOAuthRedirect) {
                logger.debug('[useAuth] OAuth redirect detected, checking session...');
                // Clear the OAuth in-progress flag
                sessionStorage.removeItem('oauth_in_progress');

                const oauthUser = await checkOAuthSession();
                if (oauthUser) {
                    logger.debug('[useAuth] OAuth callback - authenticated via session cookie');
                    setUser(oauthUser);
                    setIsAuthenticated(true);
                    navigate(ROUTES.HOME);
                    return;
                } else {
                    logger.debug('[useAuth] Session response shows not authenticated');
                }
            }
        };

        handleOAuthCallback();
        // Intentional: only re-run when URL changes, not when auth state changes.
        // Adding isAuthenticated/navigate would cause loops during OAuth redirect handling.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname, location.search]);

    const logout = useCallback(async () => {
        // Check authentication pattern BEFORE clearing tokens
        const { access_token } = getAuthTokens();
        const isJWTUser = access_token !== null;

        // Clear local state and tokens
        setIsAuthenticated(false);
        setUser(null);
        clearAuthTokens();
        navigate(ROUTES.LOGIN);

        try {
            if (isJWTUser) {
                // JWT user - logout via custom endpoint
                logger.debug('[useAuth] Logging out JWT user via /api/logout/');
                await authService.logout();
            } else {
                // OAuth user - logout via session endpoint
                logger.debug('[useAuth] Logging out OAuth user via session endpoint');
                const response = await fetch(ALLAUTH_SESSION_URL, {
                    method: 'DELETE',
                    credentials: 'include', // Send session cookie
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                // 401 is acceptable - means session already expired/cleared
                // We've already cleared local state, so logout succeeded from UX perspective
                if (!response.ok && response.status !== 401) {
                    logger.warn(`[useAuth] Session DELETE returned ${response.status}, but local state already cleared`);
                }
            }
        } catch (error) {
            logger.error("Logout failed", { error });
            // Don't reject - we've already cleared local state, user is logged out from UX perspective
        }
    }, [navigate]);

    const getUserDetails = useCallback(async () => {
        try {
            // Check if tokens are expired before making the request (JWT users only)
            // OAuth users have session cookies only, skip JWT expiration check
            const { access_token } = getAuthTokens();
            if (access_token && areTokensExpired()) {
                logger.debug("Tokens expired, logging out...");
                await logout();
                return;
            }

            const userDetails = await authService.getUserProfile();
            setUser(userDetails);
            // Ensure isAuthenticated is true when user details are successfully fetched
            setIsAuthenticated(true);
        } catch (error) {
            logger.error("Error fetching user details", { error });
            setUser(null);
            setIsAuthenticated(false);
            clearAuthTokens();
            return error;
        }
    }, [logout]);

    // Update refs to latest callback versions - enables effects to use stable refs
    // while still calling the latest callback implementation
    logoutRef.current = logout;
    getUserDetailsRef.current = getUserDetails;

    const login = async (
        username: string,
        password: string,
        rememberMe: boolean = false
    ): Promise<AuthResult<void>> => {
        try {
            logger.debug('[useAuth] login() called, attempting authentication...');
            const response = await authService.login(username, password);

            const user_id = response.user_id;
            const accessToken = response.access_token;
            const refreshToken = response.refresh_token;

            if (user_id && accessToken && refreshToken) {
                // Choose storage based on remember me setting
                const storage: TokenStorage = rememberMe
                    ? "localStorage"
                    : "sessionStorage";

                // Store tokens in the appropriate storage
                setAuthTokens(accessToken, refreshToken, storage);
                setIsAuthenticated(true);
                await getUserDetails();
                return { success: true, data: undefined };
            }

            // Login response missing required tokens
            logger.error('[useAuth] login() response missing tokens', {
                hasUserId: !!user_id,
                hasAccessToken: !!accessToken,
                hasRefreshToken: !!refreshToken,
            });
            return {
                success: false,
                error: {
                    status: 500,
                    message: 'Login failed: invalid server response',
                },
            };
        } catch (error: unknown) {
            logger.error('[useAuth] login() error', { error });
            const authError: AuthError = {
                status: 500,
                message: 'Login failed',
            };

            if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as { response?: { status?: number; data?: { detail?: string; error?: string; code?: string } } };
                if (axiosError.response) {
                    authError.status = axiosError.response.status || 500;
                    authError.message =
                        axiosError.response.data?.detail ||
                        axiosError.response.data?.error ||
                        'Login failed';
                    if (axiosError.response.data?.code) {
                        authError.code = axiosError.response.data.code;
                    }
                }
            } else if (error instanceof Error) {
                authError.message = error.message;
            }

            return { success: false, error: authError };
        }
    };


    const register = async (
        username: string,
        email: string,
        password: string
    ): Promise<AuthResult<void>> => {
        try {
            await authService.register(username, email, password);
            return { success: true, data: undefined };
        } catch (error: unknown) {
            const authError: AuthError = {
                status: 500,
                message: 'Registration failed',
            };

            if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as { response?: { status?: number; data?: { detail?: string; error?: string; code?: string } } };
                if (axiosError.response) {
                    authError.status = axiosError.response.status || 500;
                    authError.message =
                        axiosError.response.data?.detail ||
                        axiosError.response.data?.error ||
                        'Registration failed';
                    if (axiosError.response.data?.code) {
                        authError.code = axiosError.response.data.code;
                    }
                }
            } else if (error instanceof Error) {
                authError.message = error.message;
            }

            return { success: false, error: authError };
        }
    };

    return { login, isAuthenticated, logout, register, user };
}
