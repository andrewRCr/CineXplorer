import apiClient from "./apiClient";
import type { components } from "../types/api";
import { getCsrfToken, ensureCsrfTokenCookie } from "@/utilities/csrf";

const BASE_URL = import.meta.env.VITE_BASE_API_URL;

// Type aliases from generated API schema
type TokenObtainInput = components["schemas"]["TokenObtainInputSchema"];
type TokenResponse = components["schemas"]["TokenResponseSchema"];
type RegisterInput = components["schemas"]["RegisterInputSchema"];
type UserProfile = components["schemas"]["UserProfileSchema"];
type LogoutResponse = components["schemas"]["LogoutResponseSchema"];

/**
 * Authentication service for all auth-related API calls.
 * Uses generated types from Django Ninja OpenAPI schema.
 */

/**
 * Authenticate user and obtain JWT tokens.
 * Tokens are set as httponly cookies by the backend.
 *
 * @param username - Username or email (backend accepts both via 'login' field)
 * @param password - User's password
 * @returns Token response with access token, refresh token, user_id, and email_verified status
 */
export async function login(
    username: string,
    password: string
): Promise<TokenResponse> {
    await ensureCsrfTokenCookie(BASE_URL);
    const csrfToken = getCsrfToken();

    const payload: TokenObtainInput = {
        login: username, // Backend accepts username or email
        password,
    };

    const response = await apiClient.post<TokenResponse>(
        `/token/`,
        payload,
        {
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": csrfToken || "",
            },
        }
    );

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
 * @returns Token response with access token, refresh token, user_id, and email_verified status
 */
export async function register(
    username: string,
    email: string,
    password: string,
    firstName: string = "",
    lastName: string = ""
): Promise<TokenResponse> {
    await ensureCsrfTokenCookie(BASE_URL);
    const csrfToken = getCsrfToken();

    const payload: RegisterInput = {
        username,
        email,
        password,
        first_name: firstName,
        last_name: lastName,
    };

    const response = await apiClient.post<TokenResponse>(
        `/register/`,
        payload,
        {
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": csrfToken || "",
            },
        }
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
    const csrfToken = getCsrfToken();

    const response = await apiClient.post<LogoutResponse>(
        `/logout/`,
        {},
        {
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": csrfToken || "",
            },
        }
    );

    return response.data;
}

/**
 * Get the current user's profile information.
 * Includes email_verified status computed from allauth.
 *
 * @returns User profile with id, username, email, first_name, last_name, email_verified, full_name
 */
export async function getUserProfile(): Promise<UserProfile> {
    const response = await apiClient.get<UserProfile>(`/profile/`);
    return response.data;
}

/**
 * Verify user's email address using verification token.
 * Called when user clicks email verification link.
 *
 * @param token - Email verification token from URL
 * @returns Verification result with message
 */
export async function verifyEmail(token: string): Promise<{ message: string }> {
    await ensureCsrfTokenCookie(BASE_URL);
    const csrfToken = getCsrfToken();

    const response = await apiClient.post<{ message: string }>(
        `/verify-email/`,
        { key: token },
        {
            headers: {
                "X-CSRFToken": csrfToken || "",
            },
        }
    );

    return response.data;
}

/**
 * Resend email verification to user's email address.
 * Used when verification email was not received or expired.
 *
 * @param email - User's email address
 * @returns Confirmation message
 */
export async function resendVerificationEmail(
    email: string
): Promise<{ message: string }> {
    await ensureCsrfTokenCookie(BASE_URL);
    const csrfToken = getCsrfToken();

    const response = await apiClient.post<{ message: string }>(
        `/resend-verification/`,
        { email },
        {
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": csrfToken || "",
            },
        }
    );

    return response.data;
}
