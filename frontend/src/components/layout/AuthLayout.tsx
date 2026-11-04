import BaseLayout from "./BaseLayout";
import { Box } from "@chakra-ui/react";

interface AuthLayoutProps {
  children: React.ReactNode;
}

const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <BaseLayout>
      {/* Full viewport container for auth pages */}
      <Box position="relative" flex="1" w="100%">
        {children}
      </Box>
    </BaseLayout>
  );
};

export default AuthLayout;
