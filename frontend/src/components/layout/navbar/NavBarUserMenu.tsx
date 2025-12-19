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

const NavBarUserMenu = () => {
  const { isAuthenticated, logout, user } = useAuthContext() ?? {};
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // useBreakpointValue acceptable here: controls menu interaction behavior, not visibility.
  // See ADR-007 for CSS-vs-JS responsive patterns.
  const isMobile =
    useBreakpointValue({ base: true, lg: false }, { ssr: false }) ?? true;

  // Handle LOG button click
  const handleLogClick = () => {
    // TODO: Implement actual log action
    // console.log("Log action triggered");
    setIsOpen(false);
  };

  // Handle click outside to close dropdown
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

  // Close dropdown when clicking menu items
  const handleMenuItemClick = (callback?: () => void) => {
    setIsOpen(false);
    if (callback) callback();
  };

  if (!isAuthenticated) {
    return (
      <Link to={ROUTES.LOGIN} style={{ textDecoration: "none" }}>
        <Button
          size="sm"
          variant="outline"
        >
          Login
        </Button>
      </Link>
    );
  }

  return (
    <Box position="relative">
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
            {/* <Avatar.Image src={user?.avatarUrl} alt={user?.username} /> */}
            <Avatar.Fallback>{user?.username?.charAt(0)}</Avatar.Fallback>
          </Avatar.Root>
        </HStack>
      </Button>

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
              {/* Mobile: Add LOG button and user navigation items */}
              {isMobile && (
                <>
                  {/* LOG Button */}
                  <Box
                    position="relative"
                    px={4}
                    py={3}
                    _hover={{
                      background: "layer-hover-02",
                      "& > div": { opacity: 1 },
                    }}
                    cursor="pointer"
                    borderRadius="md"
                    borderBottomRadius={0}
                    transition="all 0.2s ease-in-out"
                    onClick={handleLogClick}
                  >
                    <Box
                      position="absolute"
                      left={0}
                      top={0}
                      bottom={0}
                      w="3px"
                      background="tertiary"
                      opacity={0}
                      transition="opacity 0.2s ease-in-out"
                      borderRadius="md"
                      borderBottomRadius={0}
                    />
                    <HStack gap={2} ml={2}>
                      <BsFillPlusCircleFill size={14} />
                      <Text
                        color="on-popover"
                        _hover={{ color: "tertiary" }}
                        transition="color 0.2s ease-in-out"
                      >
                        LOG
                      </Text>
                    </HStack>
                  </Box>

                  {/* User Navigation Items */}
                  {USER_NAVIGATION_ITEMS.filter((item) => !item.isAction).map(
                    (item) => (
                      <Link
                        key={item.value}
                        to={item.path}
                        style={{ textDecoration: "none", width: "100%" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMenuItemClick();
                        }}
                      >
                        <Box
                          position="relative"
                          px={4}
                          py={3}
                          _hover={{
                            background: "layer-hover-02",
                            "& > div": { opacity: 1 },
                          }}
                          cursor="pointer"
                          borderRadius="md"
                          borderBottomRadius={0}
                          transition="all 0.2s ease-in-out"
                        >
                          <Box
                            position="absolute"
                            left={0}
                            top={0}
                            bottom={0}
                            w="3px"
                            background="tertiary"
                            opacity={0}
                            transition="opacity 0.2s ease-in-out"
                            borderRadius="md"
                            borderBottomRadius={0}
                          />
                          <Text
                            color="on-popover"
                            _hover={{ color: "tertiary" }}
                            transition="color 0.2s ease-in-out"
                            ml={2}
                          >
                            {item.label}
                          </Text>
                        </Box>
                      </Link>
                    )
                  )}
                </>
              )}

              {/* Existing Profile, Settings, Logout */}
              <Link
                to={ROUTES.PROFILE}
                style={{ textDecoration: "none", width: "100%" }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleMenuItemClick();
                }}
              >
                <Box
                  position="relative"
                  px={4}
                  py={3}
                  _hover={{
                    background: "layer-hover-02",
                    "& > div": { opacity: 1 },
                  }}
                  cursor="pointer"
                  borderRadius="md"
                  borderBottomRadius={0}
                  transition="all 0.2s ease-in-out"
                >
                  <Box
                    position="absolute"
                    left={0}
                    top={0}
                    bottom={0}
                    w="3px"
                    background="tertiary"
                    opacity={0}
                    transition="opacity 0.2s ease-in-out"
                    borderRadius="md"
                    borderBottomRadius={0}
                  />
                  <Text
                    color="on-popover"
                    _hover={{ color: "tertiary" }}
                    transition="color 0.2s ease-in-out"
                    ml={2}
                  >
                    Profile
                  </Text>
                </Box>
              </Link>
              <Link
                to={ROUTES.SETTINGS}
                style={{ textDecoration: "none", width: "100%" }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleMenuItemClick();
                }}
              >
                <Box
                  position="relative"
                  px={4}
                  py={3}
                  _hover={{
                    background: "layer-hover-02",
                    "& > div": { opacity: 1 },
                  }}
                  cursor="pointer"
                  transition="all 0.2s ease-in-out"
                >
                  <Box
                    position="absolute"
                    left={0}
                    top={0}
                    bottom={0}
                    w="3px"
                    background="tertiary"
                    opacity={0}
                    transition="opacity 0.2s ease-in-out"
                  />
                  <Text
                    color="on-popover"
                    _hover={{ color: "tertiary" }}
                    transition="color 0.2s ease-in-out"
                    ml={2}
                  >
                    Settings
                  </Text>
                </Box>
              </Link>
              <Box
                position="relative"
                px={4}
                py={3}
                _hover={{
                  background: "layer-hover-02",
                  "& > div": { opacity: 1 },
                }}
                cursor="pointer"
                borderRadius="md"
                borderTopRadius={0}
                transition="all 0.2s ease-in-out"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMenuItemClick(() => {
                    if (logout) {
                      logout();
                    }
                    navigate(ROUTES.HOME);
                  });
                }}
              >
                <Box
                  position="absolute"
                  left={0}
                  top={0}
                  bottom={0}
                  w="3px"
                  background="tertiary"
                  opacity={0}
                  transition="opacity 0.2s ease-in-out"
                  borderRadius="md"
                  borderTopRadius={0}
                />
                <Text
                  color="on-popover"
                  _hover={{ color: "tertiary" }}
                  transition="color 0.2s ease-in-out"
                  ml={2}
                >
                  Logout
                </Text>
              </Box>
            </VStack>
          </Box>
        </Portal>
      )}
    </Box>
  );
};

export default NavBarUserMenu;
