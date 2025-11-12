import { Box, Heading, Text, Button, VStack, Container, Card } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';

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
        <Heading
          as="h1"
          size="4xl"
          textAlign="center"
          mb={2}
        >
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

        <Card.Root
          bg="layer-01"
          p={8}
          width="100%"
          maxW="500px"
        >
          <Heading
            as="h2"
            size="xl"
            mb={6}
          >
            Browse Movies
          </Heading>

          <VStack gap={4}>
            <Button
              onClick={() => navigate(ROUTES.POPULAR)}
              bg="button-subtle"
              color="on-button-subtle"
              _hover={{ bg: "button-subtle/90" }}
              _active={{ bg: "button-subtle/80" }}
              size="lg"
              width="100%"
            >
              Browse Popular Movies
            </Button>

            <Button
              onClick={() => navigate(ROUTES.NOW_PLAYING)}
              bg="button-subtle"
              color="on-button-subtle"
              _hover={{ bg: "button-subtle/90" }}
              _active={{ bg: "button-subtle/80" }}
              size="lg"
              width="100%"
            >
              Now Playing in Theaters
            </Button>

            <Button
              onClick={() => navigate(ROUTES.UPCOMING)}
              bg="button-subtle"
              color="on-button-subtle"
              _hover={{ bg: "button-subtle/90" }}
              _active={{ bg: "button-subtle/80" }}
              size="lg"
              width="100%"
            >
              Upcoming Releases
            </Button>
          </VStack>
        </Card.Root>
      </Box>
    </Container>
  );
};

export default Featured;
