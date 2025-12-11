import { useState, useCallback } from "react";
import { Text, Button, Box, Skeleton } from "@chakra-ui/react";
import MovieCard from "../MovieCard";
import MovieCardContainer from "../MovieCardContainer";
import { useInfiniteMovies } from "@/hooks/useInfiniteMovies";
import { useMovieCollectionContext } from "@/hooks/useMovieCollectionContext";
import { SequentialPaginationCtrl } from "./SequentialPaginationCtrl";
import { type MovieListItem } from "@/types/movie";

// Placeholder movie for skeleton loading state.
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
 * SequentialMovieGrid
 *
 * Displays movies in a grid with sequential (prev/next) pagination.
 * Uses the same useInfiniteMovies hook as InfiniteMovieGrid but displays
 * discrete pages rather than accumulating all results.
 *
 * Key difference from InfiniteMovieGrid:
 * - Shows one "page" of results at a time (pages[currentPageIndex])
 * - Uses SequentialPaginationCtrl for navigation
 * - "Next" prefetches via fetchNextPage() if needed, then advances index
 * - "Prev" simply decrements index (data already cached by TanStack Query)
 *
 * This component exists for A/B comparison with InfiniteMovieGrid.
 */
const SequentialMovieGrid = () => {
  const { source, query, finalFetcher, browseParams } = useMovieCollectionContext({});
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  // Build stable query key (same as InfiniteMovieGrid for cache sharing)
  const queryKey = ["movies", "infinite", source, query, browseParams];

  const {
    pages,
    pageCount,
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
      return finalFetcher(1, pageParam).request.then((res) => res.data);
    },
  });

  // Get current page's movies (discrete, not accumulated)
  const currentPageMovies = pages[currentPageIndex]?.results ?? [];

  // Navigation handlers
  const handlePrev = useCallback(() => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex((idx) => idx - 1);
    }
  }, [currentPageIndex]);

  const handleNext = useCallback(async () => {
    const nextIndex = currentPageIndex + 1;

    // If we need to fetch the next page first
    if (nextIndex >= pageCount && hasNextPage) {
      await fetchNextPage();
    }

    // Advance to next page (whether it was cached or just fetched)
    if (nextIndex < pageCount || hasNextPage) {
      setCurrentPageIndex(nextIndex);
    }
  }, [currentPageIndex, pageCount, hasNextPage, fetchNextPage]);

  // Determine navigation state
  const hasPrev = currentPageIndex > 0;
  // Can go next if there are more cached pages OR more pages to fetch
  const hasNext = currentPageIndex < pageCount - 1 || hasNextPage;

  // Empty state check
  const isEmpty = !isLoading && currentPageMovies.length === 0 && pageCount === 0;

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
        {/* Render Current Page Movies */}
        {!isLoading &&
          currentPageMovies.map((movie: MovieListItem) => (
            <MovieCardContainer key={`${movie.tmdb_id}-${movie.title}`}>
              <MovieCard movie={movie} source={source} query={query} />
            </MovieCardContainer>
          ))}

        {/* Loading Skeletons (Initial Load or Page Transition) */}
        {(isLoading || (isFetchingNextPage && currentPageIndex >= pageCount)) &&
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

      {/* Pagination Controls */}
      {!isEmpty && !isError && (
        <Box display="flex" justifyContent="center" mt={4}>
          <SequentialPaginationCtrl
            hasPrev={hasPrev}
            hasNext={hasNext}
            onPrev={handlePrev}
            onNext={handleNext}
            isLoading={isFetchingNextPage}
          />
        </Box>
      )}

      {/* Page indicator (helpful for A/B testing) */}
      {!isEmpty && !isError && pageCount > 0 && (
        <Box textAlign="center" mt={2}>
          <Text fontSize="sm" color="fg-muted">
            Page {currentPageIndex + 1} of {hasNextPage ? `${pageCount}+` : pageCount}
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default SequentialMovieGrid;
