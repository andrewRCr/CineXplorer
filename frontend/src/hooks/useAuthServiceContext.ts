import { AuthServiceContext } from "@/contexts/AuthContext";
import { useContext } from "react";

// custom hook for accessing the AuthContext
const useAuthServiceContext = () => useContext(AuthServiceContext);

export default useAuthServiceContext;
