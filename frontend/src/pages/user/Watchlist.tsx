/** The first watchlist page, refreshed by successful movie saves. */
import { useQuery } from "@tanstack/react-query";
import { Box, Text, VStack } from "@chakra-ui/react";
import { libraryQuery } from "@/lib/queries";
import useAuthContext from "@/hooks/auth/useAuthContext";

const Watchlist = () => {
  const { status } = useAuthContext() ?? {};
  const { data, error, isLoading } = useQuery({
    ...libraryQuery({ watchlist: true, page_size: 100 }),
    enabled: status === "authenticated",
  });
  const movies = data?.results ?? [];

  if (isLoading) {
    return (
      <Box p={8}>
        <Text>Loading watchlist...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={8}>
        <Text color="on-destructive">Error: {error.message}</Text>
      </Box>
    );
  }

  if (movies.length === 0) {
    return (
      <Box p={8}>
        <Text>No movies on watchlist</Text>
      </Box>
    );
  }

  return (
    <Box p={8}>
      <Text fontSize="2xl" fontWeight="bold" mb={4}>
        My Watchlist
      </Text>
      <VStack align="stretch" gap={2}>
        {movies.map((movie) => (
          <Text key={movie.tmdb_id}>{movie.title}</Text>
        ))}
      </VStack>
    </Box>
  );
};

export default Watchlist;
