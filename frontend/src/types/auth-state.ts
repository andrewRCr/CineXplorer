import type { components } from "./api";

type UserProfile = components["schemas"]["UserProfileSchema"];

/**
 * Auth Error - structured error type for authentication failures
 */
export interface AuthError {
    status: number;
    message: string;
    code?: string;
    /** Masked email from backend (e.g., "t***@example.com") for email verification errors */
    email?: string;
    /** Opaque token for resending verification email (works with any login method) */
    resend_token?: string;
}

/**
 * Auth Result - discriminated union for consistent auth operation outcomes
 * @template T - The operation’s success data type
 */
export type AuthResult<T> =
    { success: true; data: T } | { success: false; error: AuthError };

/**
 * Sign-in status: `resolving` while a sign-in check is in flight, so a signed-in user never
 * renders as signed out, then `authenticated` or `anonymous`.
 */
export type AuthStatus = "resolving" | "authenticated" | "anonymous";

export interface AuthStateProps {
    login: (
        username: string,
        password: string,
        rememberMe?: boolean,
    ) => Promise<AuthResult<void>>;
    status: AuthStatus;
    /** True only when `status` is `authenticated`. */
    isAuthenticated: boolean;
    user: UserProfile | null;
    logout: () => Promise<void>;
    register: (
        username: string,
        email: string,
        password: string,
    ) => Promise<AuthResult<void>>;
}
