import { isRecord } from "@/utilities/typeGuards";
import { apiBaseUrl as BASE_URL, siteOrigin } from "@/config/baseUrls";
import apiClient from "./apiClient";
import type { components } from "@/types/api";
import {
    getCsrfToken,
    ensureCsrfTokenCookie,
} from "@/utilities/csrfTokenFetcher";
import logger from "./logger";

// Type aliases from generated API schema
type TokenObtainInput = components["schemas"]["TokenObtainInputSchema"];
type TokenResponse = components["schemas"]["TokenResponseSchema"];
type RegisterInput = components["schemas"]["RegisterInputSchema"];
type RegisterResponse = components["schemas"]["RegisterResponseSchema"];
type UserProfile = components["schemas"]["UserProfileSchema"];
type LogoutResponse = components["schemas"]["LogoutResponseSchema"];

/**
 * Authentication service for all auth-related API calls.
 * Uses generated types from Django Ninja OpenAPI schema.
 */

/**
 * Authenticate user and obtain JWT tokens.
 * The backend returns the access token and sets the HttpOnly refresh cookie.
 *
 * @param username - Username or email (backend accepts both via 'login' field)
 * @param password - User's password
 * @param rememberMe - Keep the refresh cookie between browser sessions
 * @returns Access token and user details; the refresh token is delivered in its HttpOnly cookie
 */
export async function login(
    username: string,
    password: string,
    rememberMe: boolean = false,
): Promise<TokenResponse> {
    await ensureCsrfTokenCookie(BASE_URL);
    const csrfToken = getCsrfToken();

    if (!csrfToken) {
        logger.warn("CSRF token not available for login request");
    }

    const payload: TokenObtainInput = {
        login: username, // Backend accepts username or email
        password,
        remember_me: rememberMe,
    };

    const response = await apiClient.post<TokenResponse>(`/token/`, payload, {
        skipAuthRefresh: true,
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken || "",
        },
    });

    return response.data;
}

/**
 * Register a new user account.
 * Triggers email verification via allauth CustomAccountAdapter.
 *
 * @param username - Unique username
 * @param email - User's email address
 * @param password - Account password
 * @param firstName - User's first name
 * @param lastName - User's last name
 * @returns Registration confirmation with user_id, email, email_sent
 * and verification instructions
 */
export async function register(
    username: string,
    email: string,
    password: string,
    firstName: string = "",
    lastName: string = "",
): Promise<RegisterResponse> {
    await ensureCsrfTokenCookie(BASE_URL);
    const csrfToken = getCsrfToken();

    if (!csrfToken) {
        logger.warn("CSRF token not available for register request");
    }

    const payload: RegisterInput = {
        username,
        email,
        password,
        first_name: firstName,
        last_name: lastName,
    };

    const response = await apiClient.post<RegisterResponse>(
        `/register/`,
        payload,
        {
            skipAuthRefresh: true,
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": csrfToken || "",
            },
        },
    );

    return response.data;
}

/**
 * Log out the current user.
 * Clears JWT cookies and blacklists tokens.
 *
 * @returns Logout confirmation message
 */
export async function logout(): Promise<LogoutResponse> {
    await ensureCsrfTokenCookie(BASE_URL);
    const csrfToken = getCsrfToken();

    if (!csrfToken) {
        logger.warn("CSRF token not available for logout request");
    }

    const response = await apiClient.post<LogoutResponse>(
        `/logout/`,
        {},
        {
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": csrfToken || "",
            },
        },
    );

    return response.data;
}

/**
 * Get the current user's profile information.
 * Includes email_verified status computed from allauth.
 *
 * @returns User profile with id, username, email, first_name, last_name, email_verified, full_name
 */
export async function getUserProfile(
    signal?: AbortSignal,
): Promise<UserProfile> {
    const response = await apiClient.get<UserProfile>(`/profile/`, { signal });
    return response.data;
}

/**
 * Verify user's email address using verification token.
 * Called when user clicks email verification link.
 *
 * @param token - Email verification token from URL
 * @returns Verification result with message and email (for pre-filling login form)
 */
export async function verifyEmail(
    token: string,
): Promise<{ message: string; email: string }> {
    await ensureCsrfTokenCookie(BASE_URL);
    const csrfToken = getCsrfToken();

    if (!csrfToken) {
        logger.warn("CSRF token not available for verify-email request");
    }

    const response = await apiClient.post<{ message: string; email: string }>(
        `/verify-email/`,
        { key: token },
        {
            skipAuthRefresh: true,
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": csrfToken || "",
            },
        },
    );

    return response.data;
}

/**
 * Resend email verification using opaque token from login error.
 * Token-based approach works for all login methods (email or username).
 *
 * @param resendToken - Opaque token from login error response
 * @returns Confirmation message
 */
export async function resendVerificationEmail(
    resendToken: string,
): Promise<{ message: string }> {
    await ensureCsrfTokenCookie(BASE_URL);
    const csrfToken = getCsrfToken();

    if (!csrfToken) {
        logger.warn("CSRF token not available for resend-verification request");
    }

    const response = await apiClient.post<{ message: string }>(
        `/resend-verification/`,
        { resend_token: resendToken },
        {
            skipAuthRefresh: true,
            handlesEmailDeliveryFailure: true,
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": csrfToken || "",
            },
        },
    );

    return response.data;
}

/**
 * Request password reset email.
 * Uses allauth headless API for password reset flow.
 *
 * @param email - User's email address
 * @returns Success status (allauth returns 200 OK on success)
 */
export async function requestPasswordReset(email: string): Promise<void> {
    await ensureCsrfTokenCookie(BASE_URL);
    const csrfToken = getCsrfToken();

    if (!csrfToken) {
        logger.warn("CSRF token not available for password reset request");
    }

    await apiClient.post(
        `${siteOrigin}/_allauth/browser/v1/auth/password/request`,
        { email },
        {
            skipAuthRefresh: true,
            handlesEmailDeliveryFailure: true,
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": csrfToken || "",
            },
        },
    );
}

/**
 * Complete password reset with new password.
 * Uses allauth headless API to submit the new password with the reset key.
 *
 * IMPORTANT: A 401 response means SUCCESS (password changed, user must login).
 * A 200 response means SUCCESS + user was auto-logged in.
 * This is allauth's non-standard behavior documented in their API.
 *
 * @param key - Password reset key from email link
 * @param password - New password
 * @returns Object with success status and whether user was auto-logged in
 */
export async function resetPassword(
    key: string,
    password: string,
): Promise<{ success: boolean; autoLoggedIn: boolean }> {
    await ensureCsrfTokenCookie(BASE_URL);
    const csrfToken = getCsrfToken();

    const response = await fetch(
        `${siteOrigin}/_allauth/browser/v1/auth/password/reset`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(csrfToken && { "X-CSRFToken": csrfToken }),
            },
            credentials: "include",
            body: JSON.stringify({ key, password }),
        },
    );

    // 200 = success + auto-logged in
    if (response.status === 200) {
        return { success: true, autoLoggedIn: true };
    }

    // 401 = success but user needs to login (non-standard but documented allauth behavior)
    if (response.status === 401) {
        return { success: true, autoLoggedIn: false };
    }

    // 400 or other = error (invalid/expired key, password validation failed)
    const errorData: unknown = await response.json().catch(() => null);
    let errorMessage =
        "Password reset failed. The link may be expired or invalid.";
    if (isRecord(errorData)) {
        const firstError: unknown = Array.isArray(errorData.errors)
            ? errorData.errors[0]
            : undefined;
        const message = isRecord(firstError) ? firstError.message : undefined;
        if (typeof message === "string" && message) {
            errorMessage = message;
        } else if (typeof errorData.detail === "string" && errorData.detail) {
            errorMessage = errorData.detail;
        }
    }
    throw new Error(errorMessage);
}
