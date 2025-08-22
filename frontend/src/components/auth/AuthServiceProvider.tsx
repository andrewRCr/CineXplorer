import { AuthServiceContext } from "@/contexts/AuthContext";
import { useAuthService } from "@/services/authService";

export function AuthServiceProvider(props: React.PropsWithChildren<unknown>) {
	const authService = useAuthService();
	return (
		<AuthServiceContext.Provider value={authService}>
			{props.children}
		</AuthServiceContext.Provider>
	);
}

export default AuthServiceProvider;
