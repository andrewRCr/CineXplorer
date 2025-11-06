import BaseLayout from "./BaseLayout";
import Sidebar from "./Sidebar";
import {
  Box,
  Container,
  useBreakpointValue,
} from "@chakra-ui/react";
import { Outlet } from "react-router-dom";

const AppLayout = () => {
  // Show static sidebar on desktop, drawer on mobile
  const showStaticSidebar = useBreakpointValue({
    base: false,
    lg: true,
  }, { ssr: false }) ?? false;

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
        {/* Static Sidebar - Desktop only */}
        {showStaticSidebar && (
          <Box width="layout-sidebar" flexShrink={0} mr={6}>
            <Sidebar />
          </Box>
        )}

        {/* Main Content */}
        <Box flex="1">
          <Outlet />
        </Box>
      </Container>
    </BaseLayout>
  );
};

export default AppLayout;
