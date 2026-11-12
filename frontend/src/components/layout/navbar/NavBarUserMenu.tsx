import {
  Button,
  Text,
  Avatar,
  HStack,
  Box,
  VStack,
  Portal,
  useBreakpointValue,
} from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { useState, useRef, useEffect, useMemo } from "react";
import { BsFillPlusCircleFill } from "react-icons/bs";
import { ROUTES } from "@/constants/routes";
import { USER_NAVIGATION_ITEMS } from "@/constants/navigation";
import useAuthContext from "@/hooks/auth/useAuthContext";
import NavBarUserMenuItem from "./NavBarUserMenuItem";

// ============================================================================
// NavBarUserMenu Component
// ============================================================================
//
// User menu dropdown in the navbar showing:
// - User avatar and username (trigger button)
// - Mobile: LOG button + user navigation items
// - All: Profile, Settings, Logout
//
// ============================================================================

// Menu item type for precomputed menu items
type MenuItem = {
  key: string;
  type: "log" | "nav" | "profile" | "settings" | "logout";
  label: string;
  to?: string;
  icon?: React.ReactNode;
  position: "first" | "middle" | "last" | "only";
};

const NavBarUserMenu = () => {
  // ==========================================================================
  // State & Context
  // ==========================================================================

  const { status, isAuthenticated, logout, user } = useAuthContext() ?? {};
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // useBreakpointValue acceptable here: controls menu interaction behavior, not visibility.
  // See ADR-007 for CSS-vs-JS responsive patterns.
  const isMobile =
    useBreakpointValue({ base: true, lg: false }, { ssr: false }) ?? true;

  // ==========================================================================
  // Event Handlers
  // ==========================================================================

  const handleLogClick = () => {
    // TODO: Implement actual log action
    setIsOpen(false);
  };

  const closeMenu = () => setIsOpen(false);

  const handleLogout = () => {
    setIsOpen(false);
    void logout?.();
  };

  // ==========================================================================
  // Click Outside Handler
  // ==========================================================================

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        buttonRef.current &&
        dropdownRef.current &&
        !buttonRef.current.contains(event.target as Node) &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // ==========================================================================
  // Menu Items (must be before early return to satisfy hooks rules)
  // ==========================================================================

  // Precompute menu items with positions to avoid mutable counter during render
  const menuItems = useMemo(() => {
    const getPosition = (index: number, total: number) => {
      if (total === 1) return "only" as const;
      if (index === 0) return "first" as const;
      if (index === total - 1) return "last" as const;
      return "middle" as const;
    };

    const items: MenuItem[] = [];

    // Mobile-only items
    if (isMobile) {
      items.push({
        key: "log",
        type: "log",
        label: "LOG",
        icon: <BsFillPlusCircleFill size={14} />,
        position: "first", // Will be recalculated
      });

      // Filter inside useMemo to avoid new array reference each render
      const mobileNavItems = USER_NAVIGATION_ITEMS.filter(
        (item) => !item.isAction,
      );
      mobileNavItems.forEach((item) => {
        items.push({
          key: item.value,
          type: "nav",
          label: item.label,
          to: item.path,
          position: "middle", // Will be recalculated
        });
      });
    }

    // Always-visible items
    items.push(
      {
        key: "profile",
        type: "profile",
        label: "Profile",
        to: ROUTES.PROFILE,
        position: "middle",
      },
      {
        key: "settings",
        type: "settings",
        label: "Settings",
        to: ROUTES.SETTINGS,
        position: "middle",
      },
      { key: "logout", type: "logout", label: "Logout", position: "middle" },
    );

    // Recalculate positions based on final array
    return items.map((item, idx) => ({
      ...item,
      position: getPosition(idx, items.length),
    }));
  }, [isMobile]);

  // ==========================================================================
  // Render: Sign-in Check Pending
  // ==========================================================================

  // Hold the Login button's space until the check settles, so a signed-in user never sees it.
  if (status === "resolving") {
    return <Box h="8" w="16" aria-hidden="true" />;
  }

  // ==========================================================================
  // Render: Unauthenticated State
  // ==========================================================================

  if (!isAuthenticated) {
    return (
      <Link to={ROUTES.LOGIN}>
        <Button size="sm" variant="outline">
          Login
        </Button>
      </Link>
    );
  }

  // ==========================================================================
  // Render: Authenticated State
  // ==========================================================================

  return (
    <Box position="relative">
      {/* Trigger Button */}
      <Button
        ref={buttonRef}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setPosition({ top: rect.bottom, left: rect.right });
          setIsOpen(!isOpen);
        }}
        size="sm"
        bg="layer-01"
        color="foreground"
        _hover={{ bg: "layer-hover-01" }}
        _active={{ bg: "layer-active-01" }}
      >
        <HStack gap={2}>
          <Text fontWeight="bold">{user?.username}</Text>
          <Avatar.Root size="xs">
            <Avatar.Fallback>{user?.username?.charAt(0)}</Avatar.Fallback>
          </Avatar.Root>
        </HStack>
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <Portal>
          <Box
            ref={dropdownRef}
            position="fixed"
            top={`${position.top}px`}
            left={`${position.left}px`}
            transform="translateX(-100%)"
            minW="200px"
            boxShadow="shadow-md"
            border="1px solid"
            borderColor="border-strong-01"
            borderRadius="md"
            background="layer-02"
            zIndex="dropdown"
          >
            <VStack gap={0} align="stretch">
              {menuItems.map((item) => (
                <NavBarUserMenuItem
                  key={item.key}
                  icon={item.icon}
                  to={item.to}
                  onClick={
                    item.type === "logout"
                      ? handleLogout
                      : item.type === "log"
                        ? handleLogClick
                        : closeMenu
                  }
                  position={item.position}
                >
                  {item.label}
                </NavBarUserMenuItem>
              ))}
            </VStack>
          </Box>
        </Portal>
      )}
    </Box>
  );
};

export default NavBarUserMenu;
