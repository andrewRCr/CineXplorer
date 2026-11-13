import BaseLayout from "./BaseLayout";
import { Container } from "@chakra-ui/react";
import { Outlet } from "react-router";

const AppLayout = () => {
  return (
    <BaseLayout>
      {/* Main Content Area */}
      <Container
        maxW="container.xl"
        px={{ base: 2, md: 6, lg: 8 }}
        w="100%"
        flex="1"
      >
        <Outlet />
      </Container>
    </BaseLayout>
  );
};

export default AppLayout;
