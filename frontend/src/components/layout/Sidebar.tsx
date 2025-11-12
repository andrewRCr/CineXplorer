import React from "react";
import SidebarContent from "./SidebarContent";
import { Box } from "@chakra-ui/react";

// Static sidebar component for desktop use
const Sidebar: React.FC = () => {
  return (
    <Box
      as="aside"
      w="layout-sidebar"
      bg="layer-01"
      borderRadius="md"
      borderWidth="1px"
      borderColor="border"
      boxShadow="sm"
      position="sticky"
      // Sticky offset accounts for navbar height + container padding - visual alignment
      top="calc(var(--chakra-sizes-layout-navbar) + 3rem - 28px)"
      alignSelf="flex-start"
      maxH="calc(100vh - var(--chakra-sizes-layout-navbar))"
      overflowY="auto"
      zIndex="sidebar"
      style={{ willChange: 'transform' }}
    >
      <SidebarContent layer="02" listboxBg="layer-02" listboxProps={{ borderRadius: "md", my: 3 }} />
    </Box>
  );
};

export default Sidebar;
