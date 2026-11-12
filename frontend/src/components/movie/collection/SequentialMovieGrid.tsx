import { infiniteMoviesKey } from "@/lib/queries";
import { useState, useCallback, useMemo } from "react";
import { Box } from "@chakra-ui/react";
import MovieCard from "../MovieCard";
import MovieCardContainer from "../MovieCardContainer";
import { GridHeader } from "./GridHeader";
import { ResultsFooterBar } from "./ResultsFooterBar";
import {
  CARD_WIDTH,
  GAP,
  GridErrorState,
  GridEmptyState,
  GridSkeletonLoader,
} from "./shared";
import { useInfiniteMovies } from "@/hooks/movie/useInfiniteMovies";
import { useMovieCollectionContext } from "@/hooks/movie/useMovieCollectionContext";
import { SequentialPaginationCtrl } from "./SequentialPaginationCtrl";
import { useSequentialResultsText } from "@/hooks/movie/useResultsText";
import { type MovieListItem } from "@/types/movie";

/**
 * SequentialMovieGrid
 *
 * **Status:** Reference implementation - fully functional but not currently
 * wired to routes. Retained as an alternative pagination approach.
 *
 * Displays movies in a grid with sequential (prev/next) pagination.
 * Uses the same useInfiniteMovies hook as VirtualizedMovieGrid but displays
 * discrete pages rather than accumulating all results.
 *
 * Key difference from VirtualizedMovieGrid:
 * - Shows one "page" of results at a time (pages[currentPageIndex])
 * - Uses SequentialPaginationCtrl for navigation
 * - "Next" prefetches via fetchNextPage() if needed, then advances index
 * - "Prev" simply decrements index (data already cached by TanStack Query)
 */
const SequentialMovieGrid = () => {
  const { source, query, finalFetcher, browseParams } =
    useMovieCollectionContext({});
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  // Build stable query key (same as VirtualizedMovieGrid for cache sharing)
  const queryKey = infiniteMoviesKey(source, query, browseParams);

  const {
    pages,
    pageCount,
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
  const isEmpty =
    !isLoading && currentPageMovies.length === 0 && pageCount === 0;

  // Pages vary in size, so count the results on the pages before this one
  const resultsBefore = pages
    .slice(0, currentPageIndex)
    .reduce((count, page) => count + (page.results?.length ?? 0), 0);

  // Generate results text for header
  const resultText = useSequentialResultsText(
    resultsBefore,
    currentPageMovies.length,
    totalResults,
    isLoading,
  );
  const showHeaderFooter =
    (currentPageMovies.length > 0 || isLoading) && !isEmpty;

  // Memoized pagination controls (same for header and footer)
  const paginationControls = useMemo(
    () => (
      <SequentialPaginationCtrl
        hasPrev={hasPrev}
        hasNext={hasNext}
        onPrev={handlePrev}
        onNext={() => void handleNext()}
        isLoading={isFetchingNextPage}
      />
    ),
    [hasPrev, hasNext, handlePrev, handleNext, isFetchingNextPage],
  );

  return (
    <Box>
      {/* Grid Header with Pagination */}
      <GridHeader
        resultText={resultText}
        paginationControls={paginationControls}
        isLoading={isLoading}
        visible={showHeaderFooter}
      />

      {/* Error State */}
      {isError && (
        <GridErrorState error={error} onRetry={() => void refetch()} />
      )}

      {/* Empty State */}
      {isEmpty && !isError && <GridEmptyState />}

      {/* Loading Skeletons (Initial Load or Page Transition) */}
      {(isLoading || (isFetchingNextPage && currentPageIndex >= pageCount)) && (
        <GridSkeletonLoader />
      )}

      {/* Movie Grid */}
      {!isLoading &&
        !(isFetchingNextPage && currentPageIndex >= pageCount) &&
        currentPageMovies.length > 0 && (
          <Box
            display="grid"
            gridTemplateColumns={`repeat(auto-fit, ${CARD_WIDTH}px)`}
            gap={`${GAP}px`}
            mb={6}
            justifyContent="center"
          >
            {currentPageMovies.map((movie: MovieListItem) => (
              <MovieCardContainer key={`${movie.tmdb_id}-${movie.title}`}>
                <MovieCard movie={movie} source={source} query={query} />
              </MovieCardContainer>
            ))}
          </Box>
        )}

      {/* Results Footer with Pagination */}
      <ResultsFooterBar
        paginationControls={paginationControls}
        visible={showHeaderFooter && !isError}
      />
    </Box>
  );
};

export default SequentialMovieGrid;
