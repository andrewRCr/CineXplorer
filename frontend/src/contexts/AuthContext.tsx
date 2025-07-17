import { createContext } from "react";
import type { AuthServiceProps } from "../@types/auth-service";
// import { useAuthService } from "../services/authService";

export const AuthServiceContext = createContext<AuthServiceProps | null>(null);

// export function AuthServiceProvider(props: React.PropsWithChildren<unknown>) {
// 	const authService = useAuthService();
// 	return (
// 		<AuthServiceContext.Provider value={authService}>
// 			{props.children}
// 		</AuthServiceContext.Provider>
// 	);
// }

// export function useAuthServiceContext(): AuthServiceProps {
// 	const context = useContext(AuthServiceContext);
// 	if (!context) {
// 		throw new Error(
// 			"useAuthServiceContext must be used within an AuthServiceProvider"
// 		);
// 	}
// 	return context;
// }

//export default AuthServiceProvider;
//export default AuthServiceContext;
