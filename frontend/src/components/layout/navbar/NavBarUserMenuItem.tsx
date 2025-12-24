import { Box, Text, HStack } from "@chakra-ui/react";
import { Link } from "react-router-dom";
import type { ReactNode, KeyboardEvent } from "react";

// ============================================================================
// NavBarUserMenuItem
// ============================================================================
//
// Menu item for the NavBar user dropdown with:
// - Tertiary accent bar on hover (left edge)
// - Layer-based hover state
// - Support for both Link navigation and onClick actions
//
// ============================================================================

type MenuItemPosition = "first" | "middle" | "last" | "only";

interface NavBarUserMenuItemProps {
  /** Text label or custom content */
  children: ReactNode;
  /** Icon to display before the label */
  icon?: ReactNode;
  /** Route to navigate to (renders as Link) */
  to?: string;
  /** Click handler (renders as clickable Box) */
  onClick?: () => void;
  /** Position in menu for border radius handling */
  position?: MenuItemPosition;
}

/**
 * Get border radius props based on item position in the menu.
 */
const getPositionStyles = (position: MenuItemPosition) => {
  switch (position) {
    case "first":
      return { borderRadius: "md", borderBottomRadius: 0 };
    case "last":
      return { borderRadius: "md", borderTopRadius: 0 };
    case "only":
      return { borderRadius: "md" };
    case "middle":
    default:
      return {};
  }
};

const NavBarUserMenuItem = ({
  children,
  icon,
  to,
  onClick,
  position = "middle",
}: NavBarUserMenuItemProps) => {
  const positionStyles = getPositionStyles(position);

  // Keyboard handler for accessibility when acting as a button (no `to` prop)
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      if (e.key === " ") {
        e.preventDefault(); // Prevent page scroll on Space
      }
      onClick?.();
    }
  };

  // Accessibility props only needed when not wrapped in Link
  const a11yProps = !to
    ? {
        tabIndex: 0,
        role: "button" as const,
        onKeyDown: handleKeyDown,
      }
    : {};

  const content = (
    <Box
      position="relative"
      px={4}
      py={3}
      cursor="pointer"
      transition="all 0.2s ease-in-out"
      _hover={{
        background: "layer-hover-02",
        "& > [data-accent-bar]": { opacity: 1 },
        "& [data-menu-text]": { color: "tertiary" },
      }}
      onClick={onClick}
      {...a11yProps}
      {...positionStyles}
    >
      {/* Accent bar - visible on hover */}
      <Box
        data-accent-bar
        position="absolute"
        left={0}
        top={0}
        bottom={0}
        w="3px"
        background="tertiary"
        opacity={0}
        transition="opacity 0.2s ease-in-out"
        {...positionStyles}
      />

      {/* Content */}
      {icon ? (
        <HStack gap={2} ml={2}>
          {icon}
          <Text
            data-menu-text
            color="on-popover"
            transition="color 0.2s ease-in-out"
          >
            {children}
          </Text>
        </HStack>
      ) : (
        <Text
          data-menu-text
          color="on-popover"
          transition="color 0.2s ease-in-out"
          ml={2}
        >
          {children}
        </Text>
      )}
    </Box>
  );

  // Wrap in Link if `to` prop is provided
  if (to) {
    return (
      <Link
        to={to}
        style={{ textDecoration: "none", width: "100%" }}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
      >
        {content}
      </Link>
    );
  }

  return content;
};

export default NavBarUserMenuItem;
