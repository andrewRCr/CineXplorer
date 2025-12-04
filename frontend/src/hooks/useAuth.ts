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
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import type { AuthStateProps } from "@/@types/auth-state";
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
const BASE_URL = import.meta.env.VITE_BASE_API_URL?.replace(/\/api$/, '') || 'https://localhost:8444';
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

        console.log('[useAuth] Initial state calculation:', {
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

    // On initial mount, check for existing authentication (JWT or session)
    // This runs ONCE on mount to detect existing sessions
    useEffect(() => {
        const checkExistingAuth = async () => {
            // Skip if already authenticated (initial state calculation succeeded)
            if (isAuthenticated) {
                const { access_token } = getAuthTokens();
                // Only call getUserDetails if user has JWT tokens (email/password flow)
                if (access_token) {
                    getUserDetails();
                }
                return;
            }

            // Check for JWT tokens in cookie/localStorage (email/password flow)
            const { access_token, storage } = getAuthTokens();
            if (access_token && !areTokensExpired()) {
                console.log(`[useAuth] Initial mount: JWT session detected in ${storage}`);

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
            console.log('[useAuth] No JWT tokens found, checking for OAuth session...');
            const oauthUser = await checkOAuthSession();
            if (oauthUser) {
                console.log('[useAuth] OAuth session detected, user authenticated');
                setUser(oauthUser);
                setIsAuthenticated(true);
            } else {
                console.log('[useAuth] No active session found');
            }
        };

        checkExistingAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run ONCE on mount

    // When authentication state changes, fetch user details (JWT users only)
    useEffect(() => {
        if (isAuthenticated) {
            const { access_token } = getAuthTokens();
            // Only call getUserDetails if user has JWT tokens (email/password flow)
            // OAuth users have session cookies only, user data already set from session endpoint
            if (access_token) {
                getUserDetails();
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated]); // getUserDetails is stable but creates circular dependency

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
                console.log("Tokens expired during session, logging out...");
                logout();
            }
        };

        const interval = setInterval(checkTokenExpiration, 60000); // Check every minute
        return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated]); // logout is stable but creates circular dependency

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
                console.error("OAuth authentication failed:", oauthError);
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

            console.log('[useAuth] Callback handler running', {
                pathname: location.pathname,
                search: location.search,
                isFromOAuthRedirect,
                oauthError
            });

            // Check if we're on the OAuth callback path (e.g., /login after OAuth redirect)
            // OAuth authentication uses session cookies (NO tokens in URL)
            if (location.pathname === ROUTES.LOGIN && isFromOAuthRedirect) {
                console.log('[useAuth] OAuth redirect detected, checking session...');
                // Clear the OAuth in-progress flag
                sessionStorage.removeItem('oauth_in_progress');

                const oauthUser = await checkOAuthSession();
                if (oauthUser) {
                    console.log('[useAuth] OAuth callback - authenticated via session cookie');
                    setUser(oauthUser);
                    setIsAuthenticated(true);
                    navigate(ROUTES.HOME);
                    return;
                } else {
                    console.log('[useAuth] Session response shows not authenticated');
                }
            }
        };

        handleOAuthCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname, location.search]); // Only re-run when URL changes, not when isAuthenticated changes

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
                console.log('[useAuth] Logging out JWT user via /api/logout/');
                await authService.logout();
            } else {
                // OAuth user - logout via session endpoint
                console.log('[useAuth] Logging out OAuth user via session endpoint');
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
                    console.warn(`[useAuth] Session DELETE returned ${response.status}, but local state already cleared`);
                }
            }
        } catch (error) {
            console.error("Logout failed:", error);
            // Don't reject - we've already cleared local state, user is logged out from UX perspective
        }
    }, [navigate]);

    const getUserDetails = useCallback(async () => {
        try {
            // Check if tokens are expired before making the request (JWT users only)
            // OAuth users have session cookies only, skip JWT expiration check
            const { access_token } = getAuthTokens();
            if (access_token && areTokensExpired()) {
                console.log("Tokens expired, logging out...");
                await logout();
                return;
            }

            const userDetails = await authService.getUserProfile();
            setUser(userDetails);
            // Ensure isAuthenticated is true when user details are successfully fetched
            setIsAuthenticated(true);
        } catch (error) {
            console.error("Error fetching user details:", error);
            setUser(null);
            setIsAuthenticated(false);
            clearAuthTokens();
            return error;
        }
    }, [logout]);

    const login = async (
        username: string,
        password: string,
        rememberMe: boolean = false
    ): Promise<
    void | number | Error | { status: number; data: unknown; message: string }
    > => {
        try {
            console.log('[useAuth] login() called, attempting authentication...');
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
                return;
            }
            await getUserDetails();
            return;
        } catch (error: unknown) {
            console.error('[useAuth] login() error:', error);
            if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as { response?: { status?: number; data?: { detail?: string; error?: string }; message?: string } };
                if (axiosError.response) {
                    return {
                        status: axiosError.response.status || 500,
                        data: axiosError.response.data || {},
                        message:
                            axiosError.response.data?.detail ||
                            axiosError.response.data?.error ||
                            'Login failed',
                    };
                }
            }
            return error as Error;
        }
    };


    const register = async (
        username: string,
        email: string,
        password: string
    ): Promise<number | Error> => {
        try {
            await authService.register(username, email, password);
            return 201; // Registration successful
        } catch (error: unknown) {
            if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as { response?: { status?: number } };
                if (axiosError.response?.status) {
                    return axiosError.response.status;
                }
            }
            return error as Error;
        }
    };

    return { login, isAuthenticated, logout, register, user };
}
