import { Link as ChakraLink } from "@chakra-ui/react";
import {
  Link as RouterLink,
  type LinkProps as RouterLinkProps,
} from "react-router";
import type { ReactNode } from "react";

/**
 * Text Link Component
 *
 * Styled text link for inline navigation. Integrates React Router with Chakra UI
 * semantic tokens to provide consistent hyperlink appearance (underline, color, focus).
 *
 * **Use for:** Inline text links that should look like traditional hyperlinks
 * (navbar menus, footer links, content body links).
 *
 * **Do NOT use for:**
 * - Wrapping buttons (use Link directly: `<Link to={path} style={{ textDecoration: "none" }}>`)
 * - Block navigation (cards, posters - use Link with `display: "block"`)
 * - Inheriting parent styles (use Link with `color: "inherit"`)
 * - Logo/brand elements (use Link with no decoration)
 *
 * @example
 * ```tsx
 * // Navbar menu item
 * <TextLink to="/movies">Browse Movies</TextLink>
 *
 * // Footer link
 * <TextLink to="/about">About Us</TextLink>
 *
 * // Inline content link
 * <Text>See our <TextLink to="/guide">user guide</TextLink> for details.</Text>
 *
 * // With custom color override
 * <TextLink to="/profile" color="primary">My Profile</TextLink>
 *
 * // With additional Chakra props
 * <TextLink to="/settings" fontSize="lg" fontWeight="bold">Settings</TextLink>
 * ```
 *
 * Pattern: Uses Chakra Link's `asChild` composition to wrap React Router Link,
 * applying semantic tokens (tertiary color, hover states, underline, focus ring)
 * while maintaining React Router navigation functionality.
 */

// React Router's `mask` (a masked URL) would collide with Chakra's CSS `mask` style prop
interface TextLinkProps extends Omit<RouterLinkProps, "color" | "mask"> {
  children: ReactNode;
  // Allow Chakra color prop to override default
  color?: string;
  // Allow other Chakra Link style props
  [key: string]: unknown;
}

export const TextLink = ({
  to,
  children,
  color = "tertiary",
  ...props
}: TextLinkProps) => {
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
