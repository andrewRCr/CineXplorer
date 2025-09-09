export interface AuthStateProps {
	login: (
		username: string,
		password: string,
		rememberMe?: boolean
	) => Promise<
		void | number | Error | { status: number; data: any; message: string }
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
