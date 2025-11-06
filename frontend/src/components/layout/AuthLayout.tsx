import BaseLayout from "./BaseLayout";
import { Box } from "@chakra-ui/react";

interface AuthLayoutProps {
  children: React.ReactNode;
}

const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <BaseLayout>
      {/* Full viewport container for auth pages */}
      <Box
        position="relative"
        minH="calc(100vh - 144px)" // Account for NavBar (72px) + Footer (~72px)
        w="100%"
      >
        {children}
      </Box>
    </BaseLayout>
  );
};

export default AuthLayout;
