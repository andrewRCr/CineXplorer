import {
  Box,
  Heading,
  Text,
  Button,
  VStack,
  Container,
  Card,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/constants/routes";

const Featured = () => {
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
          Welcome to CineXplorer
        </Heading>

        <Text
          fontSize="xl"
          color="on-muted"
          textAlign="center"
          mb={12}
          maxW="600px"
        >
          Discover, track, and explore your favorite movies
        </Text>

        <Card.Root bg="layer-01" p={8} width="100%" maxW="500px">
          <Heading as="h2" size="xl" mb={6}>
            Films
          </Heading>

          <VStack gap={4}>
            <Button
              onClick={() => void navigate(ROUTES.BROWSE)}
              variant="subtle"
              size="lg"
              width="100%"
            >
              All films
            </Button>

            <Button
              onClick={() => void navigate(ROUTES.NOW_PLAYING)}
              variant="subtle"
              size="lg"
              width="100%"
            >
              In theaters
            </Button>

            <Button
              onClick={() => void navigate(ROUTES.UPCOMING)}
              variant="subtle"
              size="lg"
              width="100%"
            >
              Coming soon
            </Button>
          </VStack>
        </Card.Root>
      </Box>
    </Container>
  );
};

export default Featured;
