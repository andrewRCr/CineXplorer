/**
 * Watchlist Page Component
 *
 * Displays the user's watchlist movies using the userMovieService
 * from stored movie cards.
 *
 * Architecture:
 * - Uses userMovieService.getUserMovies({ watchlist: true, page_size: 100 })
 * - Displays simple text list of movie titles
 * - Shows empty state when no movies
 * - Shows loading state while fetching
 */

import { useState, useEffect, type ReactNode } from "react";
import { Box, Text, VStack } from "@chakra-ui/react";
import { getUserMovies } from "@/services/userMovieService";
import type { MovieListItem } from "@/types/movie";

const Watchlist = () => {
  const [movies, setMovies] = useState<MovieListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch watchlist data on mount
    const fetchWatchlist = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { request } = getUserMovies({ watchlist: true, page_size: 100 });
        const response = await request;

        setMovies(response.data.results || []);
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load watchlist";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchWatchlist();
  }, []);

  let content: ReactNode;
  if (isLoading) content = <Text>Loading watchlist...</Text>;
  else if (error) content = <Text color="on-destructive">Error: {error}</Text>;
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
