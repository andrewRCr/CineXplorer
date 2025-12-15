import { useEffect, useRef, useCallback, useMemo, useState } from "react";
import { Text, Button, Box, Skeleton, Spinner } from "@chakra-ui/react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import MovieCard from "../MovieCard";
import MovieCardContainer from "../MovieCardContainer";
import { ResultsHeaderBar } from "./ResultsHeaderBar";
import { useInfiniteMovies } from "@/hooks/useInfiniteMovies";
import { useMovieCollectionContext } from "@/hooks/useMovieCollectionContext";
import { useInfiniteResultsText } from "@/hooks/useResultsText";
import { type MovieListItem } from "@/types/movie";
import { type BrowseParams } from "@/types/browseTypes";

// ============================================================================
// Constants
// ============================================================================

/** Fixed height per row (card height + padding). Used for virtualizer sizing. */
const ROW_HEIGHT = 449;

/** Gap between grid items in pixels. */
const GAP = 16;

/** Card width in pixels. Used for column count calculation. */
const CARD_WIDTH = 194;

/** Number of skeleton cards to show during initial loading. */
const SKELETON_COUNT = 20;

/** Debounce delay for scroll position saves (ms). */
const SCROLL_SAVE_DEBOUNCE = 200;

/** Debounce delay for fetchNextPage calls (ms). */
const FETCH_DEBOUNCE = 150;

/** Storage key prefix for scroll positions. */
const SCROLL_STORAGE_PREFIX = "scroll-";

// ============================================================================
// Placeholder for loading state
// ============================================================================

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

// ============================================================================
// Scroll Position Persistence Utilities
// ============================================================================

/**
 * Generates a storage key for scroll position based on query context.
 * Filter-specific keys ensure position is only restored for matching filters.
 */
const getScrollStorageKey = (
  source: string,
  browseParams: Partial<BrowseParams>
): string => {
  // Create deterministic key from source and filter params
  // Use Object.entries on the browseParams to iterate through set values
  const entries = Object.entries(browseParams) as [string, unknown][];
  const paramsKey = entries
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => {
      // Handle arrays specially (genres, certifications)
      if (Array.isArray(v)) {
        return v.length > 0 ? `${k}=${v.join(",")}` : null;
      }
      return `${k}=${v}`;
    })
    .filter(Boolean)
    .join("&");

  return `${SCROLL_STORAGE_PREFIX}${source}-${paramsKey}`;
};

/**
 * Retrieves saved scroll position from sessionStorage.
 * Returns 0 if no saved position exists.
 */
const getSavedScrollPosition = (key: string): number => {
  try {
    const saved = sessionStorage.getItem(key);
    return saved ? parseInt(saved, 10) : 0;
  } catch {
    return 0;
  }
};

/**
 * Saves scroll position to sessionStorage.
 */
const saveScrollPosition = (key: string, position: number): void => {
  try {
    sessionStorage.setItem(key, String(position));
  } catch {
    // Ignore storage errors (quota exceeded, etc.)
  }
};

// ============================================================================
// Column Count Calculation
// ============================================================================

/**
 * Calculates how many cards fit per row based on container width.
 * Accounts for gap between cards.
 */
const calculateColumnCount = (containerWidth: number): number => {
  if (containerWidth <= 0) return 1;
  // Each card needs CARD_WIDTH + GAP, except the last card in row
  // Formula: (containerWidth + GAP) / (CARD_WIDTH + GAP)
  return Math.max(1, Math.floor((containerWidth + GAP) / (CARD_WIDTH + GAP)));
};

// ============================================================================
// VirtualizedMovieGrid Component
// ============================================================================

/**
 * VirtualizedMovieGrid
 *
 * High-performance movie grid using window-level virtualization.
 * Only renders visible rows, enabling smooth scrolling through large lists.
 *
 * Features:
 * - Window-level virtualization via @tanstack/react-virtual
 * - Responsive column count based on container width
 * - Scroll position persistence for back-navigation UX
 * - Automatic loading when scrolling near bottom (infinite scroll)
 * - Skeleton loading state for initial load
 * - Error handling with retry capability
 * - Empty state for no results
 */
const VirtualizedMovieGrid = () => {
  const { source, query, finalFetcher, browseParams } =
    useMovieCollectionContext({});

  // Build stable query key from actual filter values
  const queryKey = ["movies", "virtualized", source, query, browseParams];

  const {
    movies,
    totalResults,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isFetching,
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

  // --------------------------------------------------------------------------
  // Responsive Column Count
  // --------------------------------------------------------------------------

  const containerRef = useRef<HTMLDivElement>(null);
  const [columnCount, setColumnCount] = useState(4);

  // Calculate column count on resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateColumnCount = () => {
      const width = container.offsetWidth;
      setColumnCount(calculateColumnCount(width));
    };

    // Initial calculation
    updateColumnCount();

    // ResizeObserver for responsive updates
    const resizeObserver = new ResizeObserver(updateColumnCount);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  // --------------------------------------------------------------------------
  // Row Calculation
  // --------------------------------------------------------------------------

  const rowCount = useMemo(() => {
    if (movies.length === 0) return 0;
    return Math.ceil(movies.length / columnCount);
  }, [movies.length, columnCount]);

  // --------------------------------------------------------------------------
  // Scroll Position Persistence
  // --------------------------------------------------------------------------

  const scrollStorageKey = useMemo(
    () => getScrollStorageKey(source ?? "discover", browseParams ?? {}),
    [source, browseParams]
  );

  // Track previous key to detect filter changes
  const prevScrollKeyRef = useRef(scrollStorageKey);

  // Get initial offset for virtualizer (saved position or 0)
  const initialOffset = useMemo(() => {
    // If key changed (filter change), start at top
    if (prevScrollKeyRef.current !== scrollStorageKey) {
      prevScrollKeyRef.current = scrollStorageKey;
      return 0;
    }
    return getSavedScrollPosition(scrollStorageKey);
  }, [scrollStorageKey]);

  // Debounced scroll save
  const scrollSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const handleScroll = useCallback(() => {
    if (scrollSaveTimeoutRef.current) {
      clearTimeout(scrollSaveTimeoutRef.current);
    }
    scrollSaveTimeoutRef.current = setTimeout(() => {
      saveScrollPosition(scrollStorageKey, window.scrollY);
    }, SCROLL_SAVE_DEBOUNCE);
  }, [scrollStorageKey]);

  // Attach scroll listener for position saving
  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollSaveTimeoutRef.current) {
        clearTimeout(scrollSaveTimeoutRef.current);
      }
    };
  }, [handleScroll]);

  // --------------------------------------------------------------------------
  // Window Virtualizer
  // --------------------------------------------------------------------------

  const virtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => ROW_HEIGHT,
    gap: GAP,
    initialOffset,
  });

  const virtualItems = virtualizer.getVirtualItems();

  // --------------------------------------------------------------------------
  // Infinite Scroll (Near-Bottom Detection)
  // --------------------------------------------------------------------------

  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detect when scrolled near bottom and trigger fetch
  useEffect(() => {
    if (!hasNextPage || isFetching || isFetchingNextPage) return;
    if (rowCount === 0) return;

    // Check if we're near the bottom (within last 2 rows)
    const lastVisibleIndex = virtualItems[virtualItems.length - 1]?.index ?? 0;
    const nearBottom = lastVisibleIndex >= rowCount - 2;

    if (nearBottom) {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      fetchTimeoutRef.current = setTimeout(() => {
        fetchNextPage();
      }, FETCH_DEBOUNCE);
    }

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [
    virtualItems,
    rowCount,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    fetchNextPage,
  ]);

  // --------------------------------------------------------------------------
  // Derived State
  // --------------------------------------------------------------------------

  const isEmpty = !isLoading && movies.length === 0;
  const resultText = useInfiniteResultsText(totalResults, isLoading);
  const showHeader = movies.length > 0 || isLoading;

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <Box>
      {/* Results Header */}
      <ResultsHeaderBar
        resultText={resultText}
        isLoading={isLoading}
        visible={showHeader}
      />

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

      {/* Loading Skeletons (Initial Load) */}
      {isLoading && (
        <Box
          display="grid"
          gridTemplateColumns={`repeat(auto-fit, ${CARD_WIDTH}px)`}
          gap={`${GAP}px`}
          mb={6}
          justifyContent="center"
        >
          {Array.from({ length: SKELETON_COUNT }, (_, i) => (
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
      )}

      {/* Virtualized Movie Grid */}
      {!isLoading && movies.length > 0 && (
        <Box ref={containerRef}>
          {/* Virtualizer container - height matches total content */}
          <Box
            position="relative"
            width="100%"
            height={`${virtualizer.getTotalSize()}px`}
          >
            {/* Render only visible rows */}
            {virtualItems.map((virtualRow) => {
              const rowStartIndex = virtualRow.index * columnCount;
              const rowMovies = movies.slice(
                rowStartIndex,
                rowStartIndex + columnCount
              );

              return (
                <Box
                  key={virtualRow.index}
                  position="absolute"
                  top={0}
                  left={0}
                  width="100%"
                  transform={`translateY(${virtualRow.start}px)`}
                  display="grid"
                  gridTemplateColumns={`repeat(auto-fit, ${CARD_WIDTH}px)`}
                  gap={`${GAP}px`}
                  justifyContent="center"
                >
                  {rowMovies.map((movie: MovieListItem) => (
                    <MovieCardContainer
                      key={`${movie.tmdb_id}-${movie.title}`}
                      data-testid="movie-card-container"
                    >
                      <MovieCard movie={movie} source={source} query={query} />
                    </MovieCardContainer>
                  ))}
                </Box>
              );
            })}
          </Box>
        </Box>
      )}

      {/* Loading More Indicator */}
      <Box h="20px" mt={4} textAlign="center">
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

export default VirtualizedMovieGrid;
