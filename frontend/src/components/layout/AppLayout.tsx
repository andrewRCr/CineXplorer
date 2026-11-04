import BaseLayout from "./BaseLayout";
import Sidebar from "./sidebar/Sidebar";
import { Box, Container } from "@chakra-ui/react";
import { Outlet } from "react-router-dom";

const AppLayout = () => {
  return (
    <BaseLayout>
      {/* Main Content Area */}
      <Container
        maxW="container.xl"
        px={{ base: 2, md: 6, lg: 8 }}
        w="100%"
        flex="1"
        display="flex"
      >
        {/* Static Sidebar - Desktop only (hidden on mobile via CSS) */}
        <Box
          width="layout-sidebar"
          flexShrink={0}
          mr={6}
          display={{ base: "none", lg: "block" }}
        >
          <Sidebar />
        </Box>

        {/* Main Content */}
        <Box flex="1">
          <Outlet />
        </Box>
      </Container>
    </BaseLayout>
  );
};

export default AppLayout;
