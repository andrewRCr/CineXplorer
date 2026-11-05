import { isRecord } from "@/utilities/typeGuards";
import { apiBaseUrl as BASE_URL } from "@/config/baseUrls";
import axios, { CanceledError, type InternalAxiosRequestConfig } from "axios";
import {
    clearAuthTokens,
    getAuthTokens,
    getCurrentStorageType,
    getTokenExpiration,
    setAuthTokens,
} from "@/utilities/tokenUtils";
import {
    ensureCsrfTokenCookie,
    getCsrfToken,
} from "@/utilities/csrfTokenFetcher";
import logger from "./logger";
import { getPaginationContextId } from "./paginationContext";
import { toaster } from "@/components/core/chakra/toaster";

declare module "axios" {
    interface AxiosRequestConfig {
        /** The caller renders email-delivery 503s; other failures still use the global toast. */
        handlesEmailDeliveryFailure?: boolean;
    }
}

// Debug: Log the base URL being used
logger.debug("[apiClient] BASE_URL configured", { BASE_URL });

/**
 * Axios client configured for two-pattern authentication.
 *
 * Pattern 1 - Email/Password (JWT):
 * - Access tokens sent in Authorization header (from localStorage/sessionStorage)
 * - Refresh tokens sent as HTTP-only cookie (withCredentials: true)
 * - Automatic token refresh on 401 responses
 *
 * Pattern 2 - OAuth (Session):
 * - Session cookies sent automatically (withCredentials: true)
 * - No Authorization header (session-based authentication only)
 * - No token refresh needed (session managed by backend)
 *
 * Request queuing prevents concurrent refresh calls.
 */
const apiClient = axios.create({
    baseURL: BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
    // CRITICAL: Send cookies with every request
    // - OAuth: Session cookie (HTTP-only, manages authentication)
    // - Email/Password: Refresh token cookie (HTTP-only, for token refresh)
    withCredentials: true,
});

let pendingRefresh: Promise<string> | null = null;
let refreshController: AbortController | null = null;
let authSessionVersion = 0;

/** Identify asynchronous work belonging to the current sign-in. */
export const getAuthSessionVersion = () => authSessionVersion;

/** Retire old renewal work before clearing credentials or accepting a new sign-in. */
export function invalidateAuthSession(): void {
    authSessionVersion++;
    refreshController?.abort();
    refreshController = null;
    pendingRefresh = null;
}

/** Renew a password session once per tab, serializing rotating cookies across tabs. */
export function refreshAccessToken(): Promise<string> {
    if (pendingRefresh) return pendingRefresh;

    const { access_token: startingToken } = getAuthTokens();
    if (!startingToken)
        return Promise.reject(new Error("No password session to refresh"));
    const sessionVersion = getAuthSessionVersion();
    const controller = new AbortController();
    refreshController = controller;
    const assertCurrentSession = () => {
        if (
            sessionVersion !== getAuthSessionVersion() ||
            !getAuthTokens().access_token
        )
            throw new CanceledError("Authentication session changed");
    };
    const startingExpiry = getTokenExpiration(startingToken);
    const storage = getCurrentStorageType();

    const renew = async (): Promise<string> => {
        assertCurrentSession();
        const { access_token: currentToken } = getAuthTokens();
        const currentExpiry = currentToken
            ? getTokenExpiration(currentToken)
            : null;
        if (
            currentToken &&
            currentExpiry &&
            startingExpiry &&
            currentExpiry.getTime() > Date.now() &&
            currentExpiry.getTime() > startingExpiry.getTime()
        ) {
            return currentToken;
        }

        await ensureCsrfTokenCookie(BASE_URL);
        assertCurrentSession();
        const response = await axios.post<unknown>(
            `${BASE_URL}/auth/refresh`,
            {},
            {
                withCredentials: true,
                signal: controller.signal,
                headers: { "X-CSRFToken": getCsrfToken() || "" },
            },
        );
        assertCurrentSession();
        if (getAuthTokens().access_token !== currentToken)
            throw new CanceledError("Authentication credentials changed");
        const data = response.data;
        if (
            response.status !== 200 ||
            !isRecord(data) ||
            typeof data.access_token !== "string" ||
            !data.access_token
        ) {
            throw new Error(
                "Token refresh did not return a valid access token",
            );
        }
        setAuthTokens(data.access_token, undefined, storage);
        return data.access_token;
    };

    const renewal = navigator.locks
        ? navigator.locks.request("cinexplorer-auth-refresh", renew)
        : renew();
    const pending = renewal.finally(() => {
        // An obsolete completion must not erase a newer session's shared promise.
        if (pendingRefresh === pending) {
            pendingRefresh = null;
            refreshController = null;
        }
    });
    pendingRefresh = pending;
    return pending;
}

// Request interceptor: Attach JWT access token (email/password), CSRF token, and pagination context
apiClient.interceptors.request.use(async (config) => {
    // Attach JWT access token from storage (email/password authentication only)
    // OAuth users authenticate via session cookie automatically (no Authorization header needed)
    const { access_token } = getAuthTokens();
    if (access_token) {
        config.headers.Authorization = `Bearer ${access_token}`;
    }

    // Attach CSRF token from cookie for unsafe methods (required for both auth patterns)
    const unsafeMethods = ["post", "put", "patch", "delete"];
    if (config.method && unsafeMethods.includes(config.method.toLowerCase())) {
        await ensureCsrfTokenCookie(BASE_URL);
        const csrfToken = getCsrfToken();
        if (csrfToken) {
            config.headers["X-CSRFToken"] = csrfToken;
        }
    }

    // Attach pagination context ID for movie endpoints (multi-tab isolation)
    // This ID is unique per page load and helps the backend track which movies
    // have been returned in this tab's pagination session
    const movieEndpoints = [
        "/movies/browse",
        "/movies/now-playing",
        "/movies/upcoming",
        "/movies/search",
    ];
    const url = config.url ?? "";
    if (movieEndpoints.some((endpoint) => url.includes(endpoint))) {
        config.headers["X-Pagination-Context"] = getPaginationContextId();
    }

    return config;
});

// Response interceptor: Handle token refresh (JWT only) and authentication errors
apiClient.interceptors.response.use(
    (response) => response,
    async (error: unknown) => {
        // If the error is a cancellation, we don't need to do anything.
        if (axios.isCancel(error)) {
            throw error;
        }

        if (!axios.isAxiosError<unknown>(error)) throw error;

        // Check for server errors (5xx) and show toast notification
        // This provides consistent user feedback for infrastructure/backend failures
        const handledEmailFailure =
            error.response?.status === 503 &&
            error.config?.handlesEmailDeliveryFailure;
        if (
            error.response &&
            error.response.status >= 500 &&
            !handledEmailFailure
        ) {
            toaster.error({
                title: "Server error",
                description: "Please try again later.",
                closable: true,
            });
            // Continue to reject the error so callers can still handle it
        }

        if (!error.config) throw error;
        const originalRequest: InternalAxiosRequestConfig & {
            _retry?: boolean;
        } = error.config;

        // Check for authentication error (401 only - 403 is authorization, not authentication)
        // Note: This refresh flow only applies to email/password (JWT) authentication
        // OAuth users have session cookies managed by backend (no client-side refresh needed)
        if (
            error.response &&
            error.response.status === 401 &&
            !originalRequest._retry
        ) {
            // Check if user has JWT tokens (email/password authentication)
            const { access_token } = getAuthTokens();

            // OAuth users won't have JWT tokens - let them handle 401 via session endpoint
            if (!access_token) {
                throw error;
            }

            originalRequest._retry = true;
            const sessionVersion = getAuthSessionVersion();
            let renewedToken: string;
            try {
                renewedToken = await refreshAccessToken();
            } catch (refreshError) {
                if (
                    axios.isCancel(refreshError) ||
                    sessionVersion !== getAuthSessionVersion()
                )
                    throw refreshError;
                clearAuthTokens();
                window.location.href = "/login?session_expired=true";
                throw refreshError;
            }
            if (sessionVersion !== getAuthSessionVersion())
                throw new CanceledError("Authentication session changed");
            // Retry failures must not clear a successfully renewed session.
            originalRequest.headers.Authorization = `Bearer ${renewedToken}`;
            return apiClient(originalRequest);
        }

        // For all other errors, just pass them along
        throw error;
    },
);

export default apiClient;
export { CanceledError };
