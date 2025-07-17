export interface AuthServiceProps {
	login: (username: string, password: string) => unknown;
	// logout: () => Promise<void>;
	// isAuthenticated: () => boolean;
	// getCurrentUser: () => Promise<{ username: string; email: string } | null
}
