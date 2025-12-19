import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import useAuthContext from "@/hooks/auth/useAuthContext";

type ProtectedRouteProps = {
  children: ReactNode;
};

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const authContext = useAuthContext();

  if (!authContext || !authContext.isAuthenticated) {
    return <Navigate to="/login" replace={true} />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
