import NavBar from "./navbar/NavBar";
import Footer from "./Footer";
import { SidebarDrawerViewport } from "./sidebar/SidebarDrawer";
import { Box } from "@chakra-ui/react";
import { type ReactNode } from "react";

interface BaseLayoutProps {
  children: ReactNode;
}

const BaseLayout = ({ children }: BaseLayoutProps) => {
  return (
    <Box
      minH="100vh"
      display="flex"
      flexDirection="column"
      bg="background"
    >
      {/* NavBar */}
      <NavBar />

      {/* Main Content Area - Customizable */}
      {children}

      {/* Footer */}
      <Footer />

      {/* Sidebar Drawer Viewport - Required for Chakra v3 overlay manager */}
      <SidebarDrawerViewport />
    </Box>
  );
};

export default BaseLayout;
