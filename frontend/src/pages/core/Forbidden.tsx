import {
  Box,
  Heading,
  Text,
  Button,
  VStack,
  Container,
} from "@chakra-ui/react";
import { useNavigate } from "react-router";
import { ROUTES } from "@/constants/routes";

const Forbidden = () => {
  const navigate = useNavigate();

  return (
    <Container maxW="container.lg">
      <Box
        minH="60vh"
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        py={8}
      >
        <Heading as="h1" size="4xl" textAlign="center" mb={2}>
          403
        </Heading>

        <Heading as="h2" size="xl" textAlign="center" mb={4}>
          Access Denied
        </Heading>

        <Text
          fontSize="lg"
          color="on-muted"
          textAlign="center"
          mb={8}
          maxW="500px"
        >
          You don't have permission to access this page. Please sign in with an
          account that has the required permissions.
        </Text>

        <VStack gap={4}>
          <Button onClick={() => void navigate(ROUTES.HOME)} size="lg">
            Go to Home
          </Button>

          <Button
            onClick={() => void navigate(ROUTES.LOGIN)}
            variant="ghost"
            size="md"
          >
            Sign In
          </Button>
        </VStack>
      </Box>
    </Container>
  );
};

export default Forbidden;
