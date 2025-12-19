/**
 * Auth Error - structured error type for authentication failures
 */
export interface AuthError {
    status: number;
    message: string;
    code?: string;
}

/**
 * Auth Result - discriminated union for consistent auth operation outcomes
 * @template T - The success data type (void for login/register)
 */
export type AuthResult<T> =
    | { success: true; data: T }
    | { success: false; error: AuthError };

export interface AuthStateProps {
    login: (
        username: string,
        password: string,
        rememberMe?: boolean
    ) => Promise<AuthResult<void>>;
    isAuthenticated: boolean;
    user: User | null;
    logout: () => Promise<void>;
    register: (
        username: string,
        email: string,
        password: string
    ) => Promise<AuthResult<void>>;
}
