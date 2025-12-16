import { useEffect, useRef, useCallback } from "react";
import { Text, Box, Spinner } from "@chakra-ui/react";
import MovieCard from "../MovieCard";
import MovieCardContainer from "../MovieCardContainer";
import { GridHeader } from "./GridHeader";
import {
  CARD_WIDTH,
  GAP,
  GridErrorState,
  GridEmptyState,
  GridSkeletonLoader,
} from "./shared";
import { useInfiniteMovies } from "@/hooks/movie/useInfiniteMovies";
import { useMovieCollectionContext } from "@/hooks/movie/useMovieCollectionContext";
import { useInfiniteResultsText } from "@/hooks/movie/useResultsText";
import { type MovieListItem } from "@/types/movie";

/**
 * InfiniteMovieGrid
 *
 * **Status:** Reference implementation - fully functional but not currently
 * wired to routes. VirtualizedMovieGrid is the active implementation.
 * Retained as a simpler alternative without virtualization overhead.
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
  const { source, query, finalFetcher, browseParams, title, renderPageHeader } =
    useMovieCollectionContext({});

  // Build stable query key from actual filter values, not function reference
  // This ensures cache invalidation when filters change
  // browseParams included so filter changes invalidate the cache
  const queryKey = ["movies", "infinite", source, query, browseParams];

  const {
    movies,
    totalResults,
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

  // Generate results text for header
  const resultText = useInfiniteResultsText(totalResults, isLoading);
  const showHeader = movies.length > 0 || isLoading;

  return (
    <Box>
      {/* Grid Header - includes title when PageHeader is not rendered */}
      <GridHeader
        title={!renderPageHeader ? title : undefined}
        resultText={resultText}
        isLoading={isLoading}
        visible={showHeader}
      />

      {/* Error State */}
      {isError && <GridErrorState error={error} onRetry={() => refetch()} />}

      {/* Empty State */}
      {isEmpty && !isError && <GridEmptyState />}

      {/* Loading Skeletons (Initial Load) */}
      {isLoading && <GridSkeletonLoader />}

      {/* Movie Grid */}
      {!isLoading && movies.length > 0 && (
        <Box
          display="grid"
          gridTemplateColumns={`repeat(auto-fit, ${CARD_WIDTH}px)`}
          gap={`${GAP}px`}
          mb={6}
          justifyContent="center"
        >
          {movies.map((movie: MovieListItem) => (
            <MovieCardContainer key={`${movie.tmdb_id}-${movie.title}`}>
              <MovieCard movie={movie} source={source} query={query} />
            </MovieCardContainer>
          ))}
        </Box>
      )}

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
