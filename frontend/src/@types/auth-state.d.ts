export interface AuthStateProps {
	login: (username: string, password: string) => Promise<void | number | Error>;
	isAuthenticated: boolean;
	user: User | null;
	logout: () => Promise<void>;
	register: (
		username: string,
		email: string,
		password: string
	) => Promise<number | Error>;
}
