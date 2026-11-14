import { pageContainerProps } from "./pageContainer";
import BaseLayout from "./BaseLayout";
import { Container } from "@chakra-ui/react";
import { Outlet } from "react-router";

const AppLayout = () => {
  return (
    <BaseLayout>
      {/* Main Content Area */}
      <Container
        {...pageContainerProps}
        flex="1"
      >
        <Outlet />
      </Container>
    </BaseLayout>
  );
};

export default AppLayout;
