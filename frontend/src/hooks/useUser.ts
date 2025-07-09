import { useEffect, useState } from "react";
import userService, { type User } from "../services/userService";
import { CanceledError } from "../services/apiClient";

const useUser = () => {
	const [user, setUser] = useState<User | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const { request, cancel } = userService.get<User>();
		request
			.then((res) => {
				setUser(res.data);
			})
			.catch((err) => {
				if (err instanceof CanceledError) return;
				setError(err.message);
			});

		return () => cancel();
	}, []);

	return { user, error, setUser, setError };
};

export default useUser;
