import BaseLayout from "./BaseLayout";
import { pageContainerProps } from "./pageContainer";
import { Container } from "@chakra-ui/react";
import { Outlet, useMatch } from "react-router";
import { ROUTES } from "@/constants/routes";

const AppLayout = () => {
  const home = useMatch(ROUTES.HOME);
  return (
    <BaseLayout>
      {home ? (
        <Outlet />
      ) : (
        <Container {...pageContainerProps} flex="1">
          <Outlet />
        </Container>
      )}
    </BaseLayout>
  );
};
export default AppLayout;
