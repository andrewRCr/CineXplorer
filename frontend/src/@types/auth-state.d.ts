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
 * @template T - The success data type (displayName for login, void for register)
 */
export type AuthResult<T> =
    { success: true; data: T } | { success: false; error: AuthError };

/**
 * Login success data - returned by login() for component to use in success feedback
 */
export interface LoginSuccessData {
    displayName: string;
}

export interface AuthStateProps {
    login: (
        username: string,
        password: string,
        rememberMe?: boolean,
    ) => Promise<AuthResult<LoginSuccessData>>;
    isAuthenticated: boolean;
    user: User | null;
    logout: () => Promise<void>;
    register: (
        username: string,
        email: string,
        password: string,
    ) => Promise<AuthResult<void>>;
}
