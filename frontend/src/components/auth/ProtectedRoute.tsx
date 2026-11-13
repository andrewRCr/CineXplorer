/**
 * ProtectedRoute
 *
 * A layout route for pages that need a signed-in user. It waits while the sign-in check is in
 * flight, sends a signed-out visitor to sign in with the requested page as `next`, and otherwise
 * renders the matched page.
 */
import { Navigate, Outlet, useLocation } from "react-router";
import LoadingContent from "@/components/layout/LoadingContent";
import useAuthContext from "@/hooks/auth/useAuthContext";
import { loginPathFor } from "@/utilities/returnPath";

const ProtectedRoute = () => {
  const status = useAuthContext()?.status ?? "anonymous";
  const location = useLocation();

  if (status === "resolving") {
    return <LoadingContent mode="content" message="Checking your sign-in..." />;
  }

  if (status === "anonymous") {
    return (
      <Navigate
        to={loginPathFor(`${location.pathname}${location.search}`)}
        replace={true}
      />
    );
  }

  return <Outlet />;
};

export default ProtectedRoute;
