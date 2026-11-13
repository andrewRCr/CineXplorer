import {
  Box,
  Heading,
  Text,
  Button,
  VStack,
  Container,
} from "@chakra-ui/react";
import { useNavigate, useLocation } from "react-router";
import { ROUTES } from "@/constants/routes";

const NotFound = () => {
  const navigate = useNavigate();
  const location = useLocation();

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
          404
        </Heading>

        <Heading as="h2" size="xl" textAlign="center" mb={4}>
          Page Not Found
        </Heading>

        <Text
          fontSize="lg"
          color="on-muted"
          textAlign="center"
          mb={8}
          maxW="500px"
        >
          The page{" "}
          <Text as="span" fontWeight="semibold" color="foreground">
            {location.pathname}
          </Text>{" "}
          doesn't exist or has been moved.
        </Text>

        <VStack gap={4}>
          <Button onClick={() => void navigate(ROUTES.HOME)} size="lg">
            Go to Home
          </Button>

          <Button onClick={() => void navigate(-1)} variant="ghost" size="md">
            Go Back
          </Button>
        </VStack>
      </Box>
    </Container>
  );
};

export default NotFound;
