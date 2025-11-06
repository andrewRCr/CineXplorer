export interface AuthStateProps {
    login: (
        username: string,
        password: string,
        rememberMe?: boolean
    ) => Promise<
    void | number | Error | { status: number; data: unknown; message: string }
    >;
    isAuthenticated: boolean;
    user: User | null;
    logout: () => Promise<void>;
    register: (
        username: string,
        email: string,
        password: string
    ) => Promise<number | Error>;
}
