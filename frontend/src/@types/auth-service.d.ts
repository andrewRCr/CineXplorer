export interface AuthServiceProps {
	login: (username: string, password: string) => unknown;
	isLoggedIn: boolean;
	logout: () => void;
	register: (
		username: string,
		email: string,
		password: string
	) => Promise<unknown>;
}
