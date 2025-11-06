import React from "react";
import SidebarContent from "./SidebarContent";
import { Box } from "@chakra-ui/react";
import { NAVBAR_HEIGHT } from "./NavBar";

/**
 * Gap between navbar and sidebar (provides visual separation).
 *
 * Calculation breakdown:
 * - Navbar height: 92px
 * - Desired gap below navbar: 48px (3rem)
 * - Content should start at: 92px + 48px = 140px
 * - Internal padding in SidebarContent: 28px (pt={7})
 * - Container must stick at: 140px - 28px = 112px
 *
 * Formula: calc(92px + 3rem - 28px) = calc(92px + 48px - 28px) = 112px
 */
const SIDEBAR_TOP_GAP = "3rem"; // 48px spacing below navbar
const SIDEBAR_INTERNAL_PADDING = "28px"; // pt={7} in SidebarContent = 7 * 4px

// Static sidebar component for desktop use
const Sidebar: React.FC = () => {
  return (
    <Box
      as="aside"
      w="280px"
      bg="layer-01"
      borderRadius="md"
      borderWidth="1px"
      borderColor="border"
      boxShadow="sm"
      position="sticky"
      top={`calc(${NAVBAR_HEIGHT} + ${SIDEBAR_TOP_GAP} - ${SIDEBAR_INTERNAL_PADDING})`}
      alignSelf="flex-start"
      maxH={`calc(100vh - ${NAVBAR_HEIGHT})`}
      overflowY="auto"
      zIndex={1}
      style={{ willChange: 'transform' }}
    >
      <SidebarContent />
    </Box>
  );
};

export default Sidebar;
