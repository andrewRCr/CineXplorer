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
		// 3. isAuthenticated flag is set (for backward compatibility)
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
			try {
				console.log('[useAuth] No JWT tokens found, checking for OAuth session...');
				const response = await fetch(
					'https://localhost:8444/_allauth/browser/v1/auth/session',
					{
						method: 'GET',
						credentials: 'include', // Send session cookie if present
					}
				);

				if (response.ok) {
					const data = await response.json();

					// Session endpoint returns: {status: 200, data: {user, methods}, meta: {is_authenticated}}
					if (data?.meta?.is_authenticated && data?.data?.user) {
						console.log('[useAuth] OAuth session detected, user authenticated');
						// Set user data from session response
						setUser(data.data.user);
						// Set authenticated state (session cookie handles auth automatically)
						setIsAuthenticated(true);
					} else {
						console.log('[useAuth] No active session found');
					}
				}
			} catch (error) {
				console.log('[useAuth] Session check failed (user not logged in):', error);
				// Silently fail - user is not authenticated, which is fine
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

				try {
					// Check session endpoint to see if OAuth completed successfully
					console.log('[useAuth] Fetching session endpoint...');
					const response = await fetch(
						'https://localhost:8444/_allauth/browser/v1/auth/session',
						{
							method: 'GET',
							credentials: 'include', // CRITICAL: sends HTTP-only session cookie
						}
					);

					console.log('[useAuth] Session response status:', response.status);

					if (response.ok) {
						const data = await response.json();
						console.log('[useAuth] Session data:', data);

						// Session endpoint returns: {status: 200, data: {user, methods}, meta: {is_authenticated}}
						if (data?.meta?.is_authenticated && data?.data?.user) {
							console.log('OAuth callback detected - authenticated via session cookie');
							console.log('[useAuth] User:', data.data.user);

							// Set user data from session response (no need to call getUserProfile)
							setUser(data.data.user);
							// Set authenticated state (session cookie handles auth automatically)
							setIsAuthenticated(true);
							navigate(ROUTES.HOME);
							return;
						} else {
							console.log('[useAuth] Session response shows not authenticated');
						}
					}
				} catch (error) {
					console.error('Error checking session endpoint:', error);
					// Fall through - user will remain on login page
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
				await fetch('https://localhost:8444/_allauth/browser/v1/auth/session', {
					method: 'DELETE',
					credentials: 'include', // Send session cookie
					headers: {
						'Content-Type': 'application/json',
					},
				});
			}
		} catch (error) {
			console.error("Logout failed:", error);
			return Promise.reject(error);
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
			console.log('[useAuth] login() response received:', {
				has_user_id: !!response.user_id,
				has_access_token: !!response.access_token,
				has_refresh_token: !!response.refresh_token
			});

			const user_id = response.user_id;
			const accessToken = response.access_token;
			const refreshToken = response.refresh_token;

			if (user_id && accessToken && refreshToken) {
				// Choose storage based on remember me setting
				const storage: TokenStorage = rememberMe
					? "localStorage"
					: "sessionStorage";

				console.log('[useAuth] Storing tokens in:', storage);
				// Store tokens in the appropriate storage
				setAuthTokens(accessToken, refreshToken, storage);

				console.log('[useAuth] Setting isAuthenticated to true');
				setIsAuthenticated(true);

				console.log('[useAuth] Calling getUserDetails()...');
				await getUserDetails();
				console.log('[useAuth] Login complete!');
				return;
			}
			console.log('[useAuth] Missing tokens, calling getUserDetails() anyway...');
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
			// TODO: Update Register.tsx UI to collect first_name and last_name (Task 5.4-5.5)
			await authService.register(username, email, password, "", "");
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
