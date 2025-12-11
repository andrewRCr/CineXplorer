import { useEffect, useRef, useCallback } from "react";
import { Text, Button, Box, Skeleton, Spinner } from "@chakra-ui/react";
import MovieCard from "../MovieCard";
import MovieCardContainer from "../MovieCardContainer";
import { useInfiniteMovies } from "@/hooks/useInfiniteMovies";
import { useMovieCollectionContext } from "@/hooks/useMovieCollectionContext";
import { type MovieListItem } from "@/types/movie";

// Placeholder movie for skeleton loading state.
// Uses MovieListItem shape (genre_ids, not genres) to match API response.
const placeholderMovie: MovieListItem = {
  tmdb_id: 0,
  title: "Loading Movie Title",
  release_date: "2000-01-01",
  poster_path: "",
  vote_average: 0,
  overview: "Loading overview...",
  genre_ids: [],
  runtime: 0,
};

/**
 * InfiniteMovieGrid
 *
 * Displays movies in a grid with infinite scroll loading.
 * Uses Intersection Observer to detect when user scrolls near bottom,
 * then fetches the next page of results.
 *
 * Features:
 * - Automatic loading when scroll sentinel enters viewport
 * - Skeleton loading state for initial load
 * - Loading indicator for subsequent page fetches
 * - Error handling with retry capability
 * - Empty state for no results
 * - End-of-results indicator
 */
const InfiniteMovieGrid = () => {
  const { source, query, finalFetcher, browseParams } = useMovieCollectionContext({});

  // Build stable query key from actual filter values, not function reference
  // This ensures cache invalidation when filters change
  // browseParams included so filter changes invalidate the cache
  const queryKey = ["movies", "infinite", source, query, browseParams];

  const {
    movies,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
    error,
    isError,
    refetch,
  } = useInfiniteMovies({
    queryKey,
    fetcher: ({ pageParam }) => {
      if (!finalFetcher) {
        return Promise.resolve({
          page: 1,
          results: [],
          total_pages: 0,
          total_results: 0,
        });
      }
      // finalFetcher expects (page, tmdb_page_start)
      // For infinite scroll, we ignore 'page' (it's for numbered pagination)
      // and pass pageParam as tmdb_page_start
      return finalFetcher(1, pageParam).request.then((res) => res.data);
    },
  });

  // Intersection Observer for infinite scroll
  const observerTarget = useRef<HTMLDivElement>(null);
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced fetch to prevent rapid-fire requests
  const debouncedFetchNextPage = useCallback(() => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    fetchTimeoutRef.current = setTimeout(() => {
      fetchNextPage();
    }, 150);
  }, [fetchNextPage]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          debouncedFetchNextPage();
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      observer.disconnect();
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [hasNextPage, isFetchingNextPage, debouncedFetchNextPage]);

  // Empty state check
  const isEmpty = !isLoading && movies.length === 0;

  return (
    <Box>
      {/* Error State */}
      {isError && (
        <Box textAlign="center" mb={4} p={4} bg="layer-01" borderRadius="md">
          <Text color="fg-error" mb={2}>
            {error?.message || "An error occurred while fetching movies."}
          </Text>
          <Button size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </Box>
      )}

      {/* Empty State */}
      {isEmpty && !isError && (
        <Box textAlign="center" py={12}>
          <Text fontSize="lg" color="fg-muted" mb={0}>
            No movies found matching your filters.
          </Text>
          <Text fontSize="sm" color="fg-muted">
            Try adjusting your search criteria or filters.
          </Text>
        </Box>
      )}

      {/* Movie Grid */}
      <Box
        display="grid"
        gridTemplateColumns="repeat(auto-fit, 194px)"
        gap="16px"
        mb={6}
        justifyContent="center"
      >
        {/* Render Movies */}
        {movies.map((movie: MovieListItem) => (
          <MovieCardContainer key={`${movie.tmdb_id}-${movie.title}`}>
            <MovieCard movie={movie} source={source} query={query} />
          </MovieCardContainer>
        ))}

        {/* Loading Skeletons (Initial Load) */}
        {isLoading &&
          Array.from({ length: 20 }, (_, i) => (
            <Skeleton
              key={`skeleton-${i}`}
              borderRadius="md"
              overflow="hidden"
              bg="layer-02"
              data-testid="skeleton-loader"
            >
              <MovieCardContainer>
                <MovieCard movie={placeholderMovie} />
              </MovieCardContainer>
            </Skeleton>
          ))}
      </Box>

      {/* Loading More Indicator & Scroll Sentinel */}
      <Box ref={observerTarget} h="20px" mt={4} textAlign="center">
        {isFetchingNextPage && (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            gap={2}
            data-testid="loading-more"
          >
            <Spinner size="sm" color="fg-muted" />
            <Text fontSize="sm" color="fg-muted">
              Loading more...
            </Text>
          </Box>
        )}

        {!hasNextPage && !isLoading && !isEmpty && (
          <Text fontSize="sm" color="fg-muted">
            No more results
          </Text>
        )}
      </Box>
    </Box>
  );
};

export default InfiniteMovieGrid;
