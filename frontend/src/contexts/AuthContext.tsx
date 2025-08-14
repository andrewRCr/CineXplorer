import { createContext } from "react";
import type { AuthServiceProps } from "../@types/auth-service";

export const AuthServiceContext = createContext<AuthServiceProps | null>(null);
