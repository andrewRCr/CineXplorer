/**
 * AuthContextProvider
 *
 * This component wraps the application and provides auth state and actions to all child components via React context.
 * It uses the AuthContext to share the state returned by useAuth.
 *
 * Relationship:
 * - Uses useAuth to manage authentication state and actions.
 * - Provides AuthContext to descendants.
 * - Components can access auth state using useAuthContext.
 */
import { AuthContext } from "@/contexts/AuthContext";
import { useAuth } from "@/hooks/useAuth";

export function AuthContextProvider(props: React.PropsWithChildren<unknown>) {
	const authState = useAuth();
	return (
		<AuthContext.Provider value={authState}>
			{props.children}
		</AuthContext.Provider>
	);
}

export default AuthContextProvider;
