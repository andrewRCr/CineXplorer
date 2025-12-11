import { forwardRef, useImperativeHandle, useMemo, useRef, useEffect } from "react";
import { Text, Button, Box, Skeleton } from "@chakra-ui/react";
import MovieCard from "../MovieCard";
import MovieCardContainer from "../MovieCardContainer";
import { MoviePaginationCtrl } from "./MoviePaginationCtrl";
import { usePaginatedMovies } from "@/hooks/usePaginatedMovies";
import { useMovieCollectionContext } from "@/hooks/useMovieCollectionContext";
import { usePageChangeHandler } from "@/hooks/usePageChangeHandler";
import { usePaginationDisplay } from "@/hooks/usePaginationDisplay";
import { type MovieListItem, type PaginatedMoviesResponse } from "@/types/movie";

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

export interface MovieGridRef {
  resetToPageOne: () => void;
}

// Props interface for when used without Outlet context
interface MovieCollectionGridProps {
  fetcher?: (page: number, tmdb_page_start?: number) => {
    request: Promise<{ data: PaginatedMoviesResponse }>;
    cancel: () => void;
  };
  source?: string;
  query?: string;
  initialCurrentPage?: number;
  initialTmdbPageStart?: number;
  onPageChange?: (page: number, tmdb_page_start?: number) => void;
  enhancedFetcher?: (page: number, tmdb_page_start?: number) => {
    request: Promise<{ data: PaginatedMoviesResponse }>;
    cancel: () => void;
  };
}

const MovieCollectionGrid = forwardRef<MovieGridRef, MovieCollectionGridProps>(
  (props, ref) => {
    // Use custom hooks to extract complex logic
    const { source, query, currentPage, initialTmdbPageStart, onPageChange, finalFetcher } =
      useMovieCollectionContext(props);

    const pageSize = 20;

    // Track smart buffer pagination metadata using ref to avoid triggering re-renders
    // Initialize from URL metadata if page > 1 (allows correct pagination after refresh/navigation)
    const nextTmdbPageStartRef = useRef<number | undefined>(
      currentPage > 1 ? initialTmdbPageStart : undefined
    );
    const prevFetcherRef = useRef(finalFetcher);
    const prevNextTmdbPageStartRef = useRef<number | undefined>(
      currentPage > 1 ? initialTmdbPageStart : undefined
    );
    const prevPageRef = useRef(currentPage);

    // Reset metadata synchronously when fetcher changes (filter/route change)
    if (prevFetcherRef.current !== finalFetcher) {
      nextTmdbPageStartRef.current = undefined;
      prevNextTmdbPageStartRef.current = undefined;
      prevFetcherRef.current = finalFetcher;
    }

    // Reset metadata on backward navigation to prevent stale tmdb_page_start
    // Bug: Without this, going page 1→2→1 would send stale metadata causing wrong results
    if (currentPage < prevPageRef.current || currentPage === 1) {
      nextTmdbPageStartRef.current = undefined;
      prevNextTmdbPageStartRef.current = undefined;
    }
    prevPageRef.current = currentPage;

    /**
     * Adapter: Convert page-based fetcher to parameterless fetcher for usePaginatedMovies.
     *
     * usePaginatedMovies expects: () => { request, cancel }
     * finalFetcher provides: (page: number, tmdb_page_start?: number) => { request, cancel }
     *
     * This adapter closes over currentPage and nextTmdbPageStartRef to satisfy the expected signature.
     * Memoized to prevent unnecessary re-fetches when other state changes.
     */
    const fetcherForMoviesArray = useMemo(() => {
      if (!finalFetcher) {
        return () => ({
          request: Promise.resolve({
            data: { page: 1, results: [], total_pages: 1, total_results: 0 },
          }),
          cancel: () => {},
        });
      }
      return () => finalFetcher(currentPage, nextTmdbPageStartRef.current);
    }, [finalFetcher, currentPage]);

    const { total_pages, total_results, movies, error, setError, isLoading, next_tmdb_page_start } =
      usePaginatedMovies(fetcherForMoviesArray);

    // Update metadata ref when API returns new value (doesn't trigger re-render)
    // Only update if the value actually changed to avoid re-applying stale values
    useEffect(() => {
      const newValue = next_tmdb_page_start ?? undefined;
      if (prevNextTmdbPageStartRef.current !== newValue) {
        nextTmdbPageStartRef.current = newValue;
        prevNextTmdbPageStartRef.current = newValue;
      }
    }, [next_tmdb_page_start]);

    // Handle page changes using custom hook
    // Pass getter for metadata so URL updates include tmdb_page_start for back navigation
    const { handlePageChange } = usePageChangeHandler(
      onPageChange,
      () => nextTmdbPageStartRef.current
    );

    // Expose methods through ref
    useImperativeHandle(ref, () => ({
      resetToPageOne: () => {
        handlePageChange(1);
      }
    }), [handlePageChange]);

    // Use display hook for pagination UI logic
    const { shouldShowEmptyState, shouldShowPagination, resultText } =
      usePaginationDisplay(
        currentPage,
        total_pages,
        total_results,
        movies.length,
        isLoading,
        pageSize
      );

    return (
      <>
        {/* Existing content */}
        {error && (
          <Box textAlign="center" mb={4}>
            <Text color="on-destructive" mb={2}>
              {error}
            </Text>
            <Button size="sm" onClick={() => setError("")}>
              Dismiss
            </Button>
          </Box>
        )}

        {/* Top Pagination and Results Count - Always render to prevent layout shift */}
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="flex-end"
          mt={1}
          mb={6}
          flexWrap="wrap"
          gap={2}
          minHeight="40px" // Prevent layout shift
          paddingBottom={4}
          borderBottom="1px solid"
          borderBottomColor="border-subtle-00"
          opacity={shouldShowPagination ? 1 : 0}
          pointerEvents={shouldShowPagination ? "auto" : "none"}
          transition="opacity 0.2s ease"
        >
          <Box minWidth="150px" display="flex" alignItems="flex-end">
            <Text
              fontSize="sm"
              fontFamily={"inter"}
              color="on-muted"
              fontWeight="medium"
              opacity={isLoading ? 0.6 : 1}
              transition="opacity 0.2s ease"
            >
              {resultText}
            </Text>
          </Box>
          <Box minWidth="200px" display="flex" justifyContent="flex-end">
            {shouldShowPagination && (
              <MoviePaginationCtrl
                currentPage={currentPage}
                onGoToPage={handlePageChange}
                totalMovieCount={total_results}
                totalPages={total_pages}
              />
            )}
          </Box>
        </Box>

        {/* Movie Grid */}
        {shouldShowEmptyState ? (
          <Box textAlign="center" py={12}>
            <Text fontSize="lg" color="on-muted" mb={0}>
              No movies found matching your filters.
            </Text>
            <Text fontSize="sm" color="on-muted">
              Try adjusting your search criteria or filters.
            </Text>
          </Box>
        ) : (
          <Box
            minHeight="1200px" // Prevent layout shift by maintaining minimum height
            opacity={isLoading ? 0.7 : 1}
            transition="opacity 0.3s ease-in-out"
          >
            <Box
              display="grid"
              gridTemplateColumns="repeat(auto-fit, 194px)"
              gap="16px"
              mb={6}
              justifyContent="center"
            >
              {isLoading
                ? // Show skeletons whenever loading (initial, pagination, filtering)
                  Array.from({ length: 20 }, (_, i) => (
                    <Skeleton
                      key={i}
                      borderRadius="md"
                      overflow="hidden"
                      bg="muted"
                    >
                      <MovieCardContainer>
                        <MovieCard movie={placeholderMovie} />
                      </MovieCardContainer>
                    </Skeleton>
                  ))
                : // Otherwise, show the movies
                  movies.map((movie: MovieListItem) => (
                    <MovieCardContainer key={movie.tmdb_id}>
                      <MovieCard
                        movie={movie}
                        currentPage={currentPage}
                        source={source}
                        query={query}
                      />
                    </MovieCardContainer>
                  ))}
            </Box>
          </Box>
        )}

        {/* Bottom Pagination - Always render to prevent layout shift */}
        <Box
          display="flex"
          justifyContent="flex-end"
          mb={1}
          mt={0}
          borderTop="1px solid"
          borderTopColor="border-subtle-00"
          minHeight="50px" // Prevent layout shift
          paddingTop={4}
          opacity={shouldShowPagination ? 1 : 0}
          pointerEvents={shouldShowPagination ? "auto" : "none"}
          transition="opacity 0.2s ease"
        >
          <Box minWidth="200px" display="flex" justifyContent="flex-end">
            {shouldShowPagination && (
              <MoviePaginationCtrl
                currentPage={currentPage}
                onGoToPage={handlePageChange}
                totalMovieCount={total_results}
                totalPages={total_pages}
              />
            )}
          </Box>
        </Box>
      </>
    );
  }
);

MovieCollectionGrid.displayName = "MovieCollectionGrid";

export default MovieCollectionGrid;
