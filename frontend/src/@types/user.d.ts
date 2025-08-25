export interface User {
	id?: number;
	username: string;
	email: string;
	first_name: string;
	last_name: string;
	// TODO: not yet in Serializer output; will be added later when email verification made functional
	// email_verified?: boolean;
}
