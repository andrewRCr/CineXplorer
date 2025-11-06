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
      top="calc(var(--chakra-sizes-layout-navbar) + 3rem - 28px)"
      alignSelf="flex-start"
      maxH="calc(100vh - var(--chakra-sizes-layout-navbar))"
      overflowY="auto"
      zIndex="sidebar"
      style={{ willChange: 'transform' }}
    >
      <SidebarContent />
    </Box>
  );
};

export default Sidebar;
