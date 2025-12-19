/**
 * Watchlist Page Component
 *
 * Displays the user's watchlist movies using the userMovieService
 * (movie-first pattern with enrichment).
 *
 * Minimal implementation for OAuth validation - full features in API Layer P2.
 *
 * Architecture:
 * - Uses userMovieService.getUserMovies({ watchlist: true })
 * - Displays simple text list of movie titles
 * - Shows empty state when no movies
 * - Shows loading state while fetching
 */

import { useState, useEffect } from 'react';
import { Box, Text, VStack } from '@chakra-ui/react';
import { getUserMovies } from '../../services/userMovieService';
import type { MovieListItem } from '@/@types/movie.d';

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

        const { request } = getUserMovies({ watchlist: true });
        const response = await request;

        setMovies(response.data.results || []);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load watchlist';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchWatchlist();
  }, []);

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
        <Text color="on-destructive">Error: {error}</Text>
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
