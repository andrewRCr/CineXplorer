/** The first watchlist page, refreshed by successful movie saves. */
import type { ReactNode } from "react";
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

  let content: ReactNode;
  if (isLoading) content = <Text>Loading watchlist...</Text>;
  else if (error)
    content = <Text color="on-destructive">Error: {error.message}</Text>;
  else if (movies.length === 0) content = <Text>No movies on watchlist</Text>;
  else
    content = (
      <VStack align="stretch" gap={2}>
        {movies.map((movie) => (
          <Text key={movie.tmdb_id}>{movie.title}</Text>
        ))}
      </VStack>
    );

  return (
    <Box p={8}>
      <Text as="h1" fontSize="2xl" fontWeight="bold" mb={4}>
        My Watchlist
      </Text>
      {content}
    </Box>
  );
};

export default Watchlist;
