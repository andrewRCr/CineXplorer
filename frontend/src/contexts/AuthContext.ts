/**
 * AuthContext
 *
 * This React context object holds the authentication state and actions for the application.
 * It is provided by AuthContextProvider and consumed via useAuthContext.
 *
 * Relationship:
 * - Value is set by AuthContextProvider using useAuth.
 * - Accessed by components using useAuthContext.
 */
import { createContext } from "react";
import type { AuthStateProps } from "../@types/auth-state";

export const AuthContext = createContext<AuthStateProps | null>(null);
