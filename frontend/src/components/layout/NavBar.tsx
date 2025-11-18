import {
  Box,
  HStack,
  Image,
  Container,
  Heading,
  Button,
  IconButton,
} from "@chakra-ui/react";
import { useLocation, Link } from "react-router-dom";
import { BsFillPlusCircleFill } from "react-icons/bs";
import logo from "../../assets/icons8-movie-64.webp";

import { ROUTES } from "@/constants/routes";
import { USER_NAVIGATION_ITEMS } from "@/constants/navigation";
import NavBarUserMenu from "./NavBarUserMenu";
import NavBarSearch from "./NavBarSearch";
import MobileMenuButton from "./MobileMenuButton";

// Reusable Logo and Title Component
const LogoAndTitle = () => (
  <Link to={ROUTES.HOME} style={{ textDecoration: "none", color: "inherit" }}>
    <HStack
      gap={3}
      alignItems="center"
      cursor="pointer"
      transition="all 0.2s"
      _hover={{
        "& > *": {
          filter: "brightness(1.1)",
        },
        "& h1": {
          _after: {
            width: "100%",
          },
        },
      }}
    >
      <Image
        src={logo}
        boxSize="48px"
        transition="all 0.2s"
        alt="CineXplorer Logo"
      />
      <Heading
        as="h1"
        size="4xl"
        color="foreground"
        transition="all 0.2s"
        position="relative"
        _after={{
          content: '""',
          position: "absolute",
          bottom: "-2px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "0%",
          height: "2px",
          backgroundColor: "tertiary",
          transition: "width 0.3s ease",
          borderRadius: "1px",
        }}
      >
        CineXplorer
      </Heading>
    </HStack>
  </Link>
);

const NavBar = () => {
  const location = useLocation();

  // Handle LOG button click
  const handleLogClick = () => {
    // TODO: Implement actual log action
    // console.log("Log action triggered");
  };

  // Check if a tab is active
  const isTabActive = (path: string) => location.pathname === path;

  return (
    <Box
      w="100%"
      bg="layer-01"
      position="sticky"
      top={0}
      zIndex="navbar"
      boxShadow="base"
      borderBottom="1px solid"
      borderColor="border-strong-01"
    >
      <Container maxW="container.xl" px={{ base: 2, md: 6, lg: 8 }} w="100%">
        <HStack
          justifyContent="space-between"
          pt={2}
          pb={{ base: 2, lg: 0 }}
          position="relative"
        >
          {/* Mobile Layout: Hamburger - Logo/Title - User Controls */}
          <HStack
            justifyContent="space-between"
            w="100%"
            display={{ base: 'flex', lg: 'none' }}
          >
            {/* Left - Hamburger Menu */}
            <Box>
              <MobileMenuButton size="sm" />
            </Box>

            {/* Center - Logo and Title */}
            <LogoAndTitle />

            {/* Right side - User controls */}
            <HStack gap={4} alignItems="center">
              <NavBarUserMenu />
            </HStack>
          </HStack>

          {/* Desktop Layout: Logo and title left-aligned, search and user controls on right */}
          <HStack
            justifyContent="space-between"
            w="100%"
            display={{ base: 'none', lg: 'flex' }}
          >
            {/* Left - Logo and Title together */}
            <LogoAndTitle />

            {/* Right side - Search and User controls */}
            <HStack gap={4} alignItems="center">
              <NavBarSearch />
              <NavBarUserMenu />
            </HStack>
          </HStack>
        </HStack>
      </Container>

      {/* Desktop User Navigation Tabs - Secondary Row */}
      <Box bg="layer-01" display={{ base: 'none', lg: 'block' }}>
        <Container
          maxW="container.xl"
          px={{ base: 2, md: 6, lg: 8 }}
          w="100%"
        >
          <HStack gap={1} pt={0} pb={0}>
            {/* LOG Button */}
            <IconButton
              p={2}
              size="sm"
              variant="ghost"
              aria-label="Log activity"
              onClick={handleLogClick}
              _hover={{ bg: "tertiary/8" }}
            >
              <BsFillPlusCircleFill size={14} />
              LOG
            </IconButton>

            {/* User Navigation Tabs */}
            {USER_NAVIGATION_ITEMS.filter((item) => !item.isAction).map(
              (item) => (
                <Link
                  key={item.value}
                  to={item.path}
                  style={{ textDecoration: "none" }}
                >
                  <Button
                    size="sm"
                    variant={isTabActive(item.path) ? "solid" : "ghost"}
                    bg={isTabActive(item.path) ? "tertiary" : undefined}
                    color={isTabActive(item.path) ? "on-tertiary" : undefined}
                    _hover={{
                      bg: isTabActive(item.path)
                        ? "tertiary"
                        : "tertiary/8",
                      opacity: isTabActive(item.path) ? 0.92 : 1,
                    }}
                    borderRadius="md"
                    px={3}
                    fontWeight={isTabActive(item.path) ? "medium" : "normal"}
                  >
                    {item.label}
                  </Button>
                </Link>
              )
            )}
          </HStack>
        </Container>
      </Box>
    </Box>
  );
};

export default NavBar;
