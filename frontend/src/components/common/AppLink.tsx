import { Link as ChakraLink } from "@chakra-ui/react";
import { Link as RouterLink, type LinkProps as RouterLinkProps } from "react-router-dom";
import type { ReactNode } from "react";

/**
 * Application Link Component
 *
 * Integrates React Router Link with Chakra UI semantic tokens for consistent
 * navigation styling across the application.
 *
 * Pattern: Uses Chakra Link's `asChild` composition to wrap React Router Link,
 * providing semantic token integration (tertiary color, proper hover states,
 * underline patterns) while maintaining React Router navigation functionality.
 *
 * @example
 * ```tsx
 * // Basic navigation link
 * <AppLink to="/movies">Browse Movies</AppLink>
 *
 * // With custom styling
 * <AppLink to="/profile" color="primary">My Profile</AppLink>
 *
 * // Inherits all Chakra Link props
 * <AppLink to="/settings" fontSize="lg" fontWeight="bold">Settings</AppLink>
 * ```
 *
 * Reference: strategy-semantic-tokens.md "Building Interactive Elements" section
 */

interface AppLinkProps extends Omit<RouterLinkProps, "color"> {
  children: ReactNode;
  // Allow Chakra color prop to override default
  color?: string;
  // Allow other Chakra Link style props
  [key: string]: unknown;
}

export const AppLink = ({ to, children, color = "tertiary", ...props }: AppLinkProps) => {
  return (
    <ChakraLink
      asChild
      color={color}
      textDecoration="underline"
      textUnderlineOffset="2px"
      textDecorationThickness="1px" // Browser default, explicit for consistency
      _hover={{ color: "tertiary-hover" }}
      _focus={{
        outline: "2px solid",
        outlineColor: "ring",
        outlineOffset: "2px",
      }}
      {...props}
    >
      <RouterLink to={to}>{children}</RouterLink>
    </ChakraLink>
  );
};
