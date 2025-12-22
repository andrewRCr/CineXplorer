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
import { useNavigate, Link } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
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

const NavBarUserMenu = () => {
  // ==========================================================================
  // State & Context
  // ==========================================================================

  const { isAuthenticated, logout, user } = useAuthContext() ?? {};
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
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
    logout?.();
    navigate(ROUTES.HOME);
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
  // Render: Unauthenticated State
  // ==========================================================================

  if (!isAuthenticated) {
    return (
      <Link to={ROUTES.LOGIN} style={{ textDecoration: "none" }}>
        <Button size="sm" variant="outline">
          Login
        </Button>
      </Link>
    );
  }

  // ==========================================================================
  // Render: Authenticated State
  // ==========================================================================

  // Build menu items list for position calculation
  const mobileNavItems = USER_NAVIGATION_ITEMS.filter((item) => !item.isAction);
  const staticItems = ["Profile", "Settings", "Logout"];
  const allItems = isMobile
    ? ["LOG", ...mobileNavItems.map((i) => i.label), ...staticItems]
    : staticItems;

  const getPosition = (index: number, total: number) => {
    if (total === 1) return "only" as const;
    if (index === 0) return "first" as const;
    if (index === total - 1) return "last" as const;
    return "middle" as const;
  };

  let itemIndex = 0;

  return (
    <Box position="relative">
      {/* Trigger Button */}
      <Button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
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
            top={`${buttonRef.current?.getBoundingClientRect().bottom ?? 0}px`}
            left={`${buttonRef.current?.getBoundingClientRect().right ?? 0}px`}
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
              {/* Mobile-only items */}
              {isMobile && (
                <>
                  {/* LOG Button */}
                  <NavBarUserMenuItem
                    icon={<BsFillPlusCircleFill size={14} />}
                    onClick={handleLogClick}
                    position={getPosition(itemIndex++, allItems.length)}
                  >
                    LOG
                  </NavBarUserMenuItem>

                  {/* User Navigation Items */}
                  {mobileNavItems.map((item) => (
                    <NavBarUserMenuItem
                      key={item.value}
                      to={item.path}
                      onClick={closeMenu}
                      position={getPosition(itemIndex++, allItems.length)}
                    >
                      {item.label}
                    </NavBarUserMenuItem>
                  ))}
                </>
              )}

              {/* Always-visible items */}
              <NavBarUserMenuItem
                to={ROUTES.PROFILE}
                onClick={closeMenu}
                position={getPosition(isMobile ? itemIndex++ : 0, allItems.length)}
              >
                Profile
              </NavBarUserMenuItem>

              <NavBarUserMenuItem
                to={ROUTES.SETTINGS}
                onClick={closeMenu}
                position={getPosition(isMobile ? itemIndex++ : 1, allItems.length)}
              >
                Settings
              </NavBarUserMenuItem>

              <NavBarUserMenuItem
                onClick={handleLogout}
                position={getPosition(isMobile ? itemIndex : 2, allItems.length)}
              >
                Logout
              </NavBarUserMenuItem>
            </VStack>
          </Box>
        </Portal>
      )}
    </Box>
  );
};

export default NavBarUserMenu;
