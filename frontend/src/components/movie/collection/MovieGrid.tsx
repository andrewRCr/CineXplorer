import { useMemo, forwardRef, useImperativeHandle, useRef, useEffect } from "react";
import { Text, Button, Box, Skeleton } from "@chakra-ui/react";
import MovieCard from "../MovieCard";
import MovieCardContainer from "../MovieCardContainer";
import { PaginationCtrl } from "../../layout/PaginationCtrl";
import { usePaginatedMovies } from "@/hooks/usePaginatedMovies";
import { useMovieGridPagination } from "@/hooks/useMovieGridPagination";
import { usePaginationDisplay } from "@/hooks/usePaginationDisplay";
import { type PaginatedMoviesResponse } from "@/types/movie";

interface MovieGridProps {
  fetcher: (page: number, tmdb_page_start?: number) => {
    request: Promise<{ data: PaginatedMoviesResponse }>;
    cancel: () => void;
  };
  source?: string;
  query?: string;
  initialCurrentPage?: number;
}

export interface MovieGridRef {
  resetToPageOne: () => void;
}

const MovieGrid = forwardRef<MovieGridRef, MovieGridProps>(
  ({ fetcher, source, query, initialCurrentPage }, ref) => {
    const pageSize = 20;

    // Use pagination hook for complex URL and state management first
    const { currentPage, handlePageChange, resetToPageOne } =
      useMovieGridPagination(initialCurrentPage);

    // Track smart buffer pagination metadata using ref to avoid triggering re-renders
    const nextTmdbPageStartRef = useRef<number | undefined>(undefined);
    const prevFetcherRef = useRef(fetcher);
    const prevNextTmdbPageStartRef = useRef<number | undefined>(undefined);

    // Reset metadata synchronously when fetcher changes (filter/route change)
    if (prevFetcherRef.current !== fetcher) {
      nextTmdbPageStartRef.current = undefined;
      prevNextTmdbPageStartRef.current = undefined;
      prevFetcherRef.current = fetcher;
    }

    // Create fetcher callback that uses the current page from pagination hook
    const fetcherCallback = useMemo(() => {
      return () => {
        return fetcher(currentPage, nextTmdbPageStartRef.current);
      };
    }, [fetcher, currentPage]);

    const { total_pages, total_results, movies, error, setError, isLoading, next_tmdb_page_start } =
      usePaginatedMovies(fetcherCallback);

    // Update metadata ref when API returns new value (doesn't trigger re-render)
    // Only update if the value actually changed to avoid re-applying stale values
    useEffect(() => {
      const newValue = next_tmdb_page_start ?? undefined;
      if (prevNextTmdbPageStartRef.current !== newValue) {
        nextTmdbPageStartRef.current = newValue;
        prevNextTmdbPageStartRef.current = newValue;
      }
    }, [next_tmdb_page_start]);

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

    // Expose resetToPageOne method via ref
    useImperativeHandle(
      ref,
      () => ({
        resetToPageOne,
      }),
      [resetToPageOne]
    );

    const skeletons = [1, 2, 3, 4, 5, 6, 7, 8];

    return (
      <>
        {error && (
          <Box textAlign="center" mb={4}>
            <Text color="destructive-foreground" mb={2}>
              {error}
            </Text>
            <Button size="sm" onClick={() => setError("")}>
              Dismiss
            </Button>
          </Box>
        )}

        {/* Top Pagination and Results Count */}
        {shouldShowPagination && (
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={4}
            flexWrap="wrap"
            gap={2}
            paddingBottom={2}
            borderBottom="1px solid"
            borderBottomColor="border"
          >
            <Text
              fontSize="sm"
              color="muted-foreground"
              fontWeight="medium"
            >
              {resultText}
            </Text>
            <PaginationCtrl
              currentPage={currentPage}
              onGoToPage={handlePageChange}
              totalMovieCount={total_results}
              totalPages={total_pages}
            />
          </Box>
        )}

        {/* Movie Grid */}
        {shouldShowEmptyState ? (
          <Box textAlign="center" py={12}>
            <Text fontSize="lg" color="muted-foreground" mb={0}>
              No movies found matching your filters.
            </Text>
            <Text fontSize="sm" color="muted-foreground">
              Try adjusting your search criteria or filters.
            </Text>
          </Box>
        ) : (
          <Box
            display="grid"
            gridTemplateColumns="repeat(auto-fit, 194px)"
            gap="16px"
            mb={6}
            justifyContent="start"
          >
            {isLoading
              ? skeletons.map((skeleton) => (
                  <MovieCardContainer key={skeleton}>
                    <Skeleton />
                  </MovieCardContainer>
                ))
              : movies.map((movie) => (
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
        )}

        {/* Bottom Pagination */}
        {shouldShowPagination && (
          <Box
            display="flex"
            justifyContent="flex-end"
            mb={1}
            mt={1}
            borderTop="1px solid"
            borderTopColor="border"
          >
            <PaginationCtrl
              currentPage={currentPage}
              onGoToPage={handlePageChange}
              totalMovieCount={total_results}
              totalPages={total_pages}
            />
          </Box>
        )}
      </>
    );
  }
);

MovieGrid.displayName = "MovieGrid";

export default MovieGrid;
