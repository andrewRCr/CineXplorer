import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import useAuthServiceContext from "@/hooks/useAuthServiceContext";

type ProtectedRouteProps = {
	children: ReactNode;
};

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
	const authServiceContext = useAuthServiceContext();

	if (!authServiceContext || !authServiceContext.isLoggedIn) {
		return <Navigate to="/login" replace={true} />;
	}

	return <>{children}</>;
};

export default ProtectedRoute;
