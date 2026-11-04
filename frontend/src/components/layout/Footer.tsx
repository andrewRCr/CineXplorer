import tmdbLogo from "../../assets/tmdb_logo_alt_short.svg";
import { Box, HStack, Text, VStack } from "@chakra-ui/react";
import { TextLink, ThemeSelector } from "@/components/common";
import { ColorModeButton } from "../core/chakra/color-mode";

const Footer = () => {
  return (
    <Box
      as="footer"
      w="100%"
      bg="layer-01"
      py={2}
      textAlign="center"
      borderTop="1px solid"
      borderColor="border-strong-01"
      aria-label="Application footer with TMDB attribution and theme controls"
      position="relative"
      zIndex="footer"
    >
      <VStack gap={1} alignItems="center">
        {/* Theme Controls Row */}
        <HStack gap={2} justifyContent="center">
          <ThemeSelector />
          <ColorModeButton />
        </HStack>

        {/* Debug Links Row (dev mode only) */}
        {import.meta.env.DEV && (
          <HStack gap={3} fontSize="xs" color="on-muted">
            <Text fontWeight="medium">Debug:</Text>
            <TextLink to="/dev/theme-debug" fontSize="xs">
              Theme
            </TextLink>
            <TextLink to="/dev/layout-debug" fontSize="xs">
              Layout
            </TextLink>
            <TextLink to="/dev/typography-debug" fontSize="xs">
              Typography
            </TextLink>
          </HStack>
        )}

        {/* Copyright Row */}
        <Box display="inline-flex" alignItems="center" gap={2}>
          <Text fontSize="sm" color="on-muted" fontWeight="light">
            © 2025 CineXplorer. All rights reserved.
          </Text>
        </Box>

        {/* TMDB Attribution Row */}
        <Box display="inline-flex" alignItems="center" gap={2}>
          <a
            href="https://www.themoviedb.org/documentation/api"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="TMDB API Documentation"
          >
            <img
              src={tmdbLogo}
              alt="TMDB Logo"
              // EXCEPTION: External TMDB logo requires fixed height for brand compliance
              style={{ height: "18px", opacity: 0.7 }}
            />
          </a>
          <Text fontSize="sm" color="on-muted" fontWeight="light">
            This product uses the TMDB API but is not endorsed or certified by
            TMDB.
          </Text>
        </Box>
      </VStack>
    </Box>
  );
};

export default Footer;
