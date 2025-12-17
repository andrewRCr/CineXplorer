/**
 * useAuthContext
 *
 * This custom React hook provides convenient access to auth state and actions from AuthContext.
 * It is used by components to consume auth state provided by AuthContextProvider.
 *
 * Relationship:
 * - Reads value from AuthContext.
 * - Used by components to access auth state and actions.
 * - AuthContext is provided by AuthContextProvider, which uses useAuth.
 */
import { AuthContext } from "@/contexts/AuthContext";
import { useContext } from "react";

// custom hook for accessing the AuthContext
const useAuthContext = () => useContext(AuthContext);

export default useAuthContext;
