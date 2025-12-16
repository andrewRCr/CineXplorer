import {
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  useMemo,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Text, Box, Spinner } from "@chakra-ui/react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import MovieCard from "../MovieCard";
import MovieCardContainer from "../MovieCardContainer";
import { GridHeader } from "./GridHeader";
import {
  CARD_WIDTH,
  GAP,
  calculateColumnCount,
  getScrollStorageKey,
  getSavedScrollPosition,
  saveScrollPosition,
  GridErrorState,
  GridEmptyState,
  GridSkeletonLoader,
} from "./shared";
import { useInfiniteMovies } from "@/hooks/movie/useInfiniteMovies";
import { useMovieCollectionContext } from "@/hooks/movie/useMovieCollectionContext";
import { useInfiniteResultsText } from "@/hooks/movie/useResultsText";
import { type MovieListItem } from "@/types/movie";

// ============================================================================
// Virtualization-Specific Constants
// ============================================================================

/** Fixed height per row (card height + padding). Used for virtualizer sizing. */
const ROW_HEIGHT = 449;

/** Debounce delay for scroll position saves (ms). */
const SCROLL_SAVE_DEBOUNCE = 200;

/** Debounce delay for fetchNextPage calls (ms). */
const FETCH_DEBOUNCE = 150;

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
  const { source, query, finalFetcher, browseParams, title, renderPageHeader } =
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

  // Include query in scroll key for search routes (different queries = different scroll positions)
  const scrollStorageKey = useMemo(() => {
    const baseKey = getScrollStorageKey(source ?? "discover", browseParams ?? {});
    // Append query to key for search routes
    return query ? `${baseKey}-q=${query}` : baseKey;
  }, [source, browseParams, query]);

  // Track previous key to detect filter changes
  const prevScrollKeyRef = useRef(scrollStorageKey);

  // Detect if this is back-navigation (restore scroll) vs fresh load (reset to top)
  // Uses explicit signal from React Router location state:
  // - "Back to Results" link sets state={{ restoreScroll: true }}
  // - After reading, we clear the state so refresh won't see it
  // - Direct URL navigation has no state → reset to top
  const location = useLocation();
  const navigate = useNavigate();

  // Capture restore signal on mount (before we clear it)
  const shouldRestoreScrollRef = useRef(
    location.state?.restoreScroll === true
  );
  const hasRestoredScrollRef = useRef(false);

  // Clear location state after capturing it, so refresh won't restore scroll
  // This runs once on mount - the ref already captured the value
  useEffect(() => {
    if (location.state?.restoreScroll) {
      navigate(location.pathname + location.search, {
        replace: true,
        state: null,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty - only run on mount

  // Guard to prevent saving scroll position immediately after restoration
  // (virtualizer may not have full height yet, causing wrong position to be saved)
  const isRestoringScrollRef = useRef(false);
  // Track restoration timeouts for cleanup
  const restorationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up restoration timeout on unmount
  useEffect(() => {
    return () => {
      if (restorationTimeoutRef.current) {
        clearTimeout(restorationTimeoutRef.current);
      }
      isRestoringScrollRef.current = false;
    };
  }, []);

  // Handle scroll position on filter changes and back-navigation
  // Note: Browser scroll restoration disabled in main.tsx (must happen before React mounts)
  useLayoutEffect(() => {
    // On filter change, reset to top
    if (prevScrollKeyRef.current !== scrollStorageKey) {
      window.scrollTo(0, 0);
      hasRestoredScrollRef.current = true; // Don't restore after filter change
      prevScrollKeyRef.current = scrollStorageKey;
    }
  }, [scrollStorageKey]);

  // Restore scroll position for back-navigation (when explicitly signaled via location state)
  useLayoutEffect(() => {
    if (
      shouldRestoreScrollRef.current &&
      !hasRestoredScrollRef.current &&
      !isLoading &&
      movies.length > 0
    ) {
      const savedPosition = getSavedScrollPosition(scrollStorageKey);
      if (savedPosition > 0) {
        // Set guard before restoring to prevent immediate save of wrong position
        // (virtualizer may not have full content height yet on first scroll attempt)
        isRestoringScrollRef.current = true;
        window.scrollTo(0, savedPosition);
        // Re-scroll after virtualizer has time to render full content height
        // Use requestAnimationFrame + timeout to ensure layout is complete
        requestAnimationFrame(() => {
          restorationTimeoutRef.current = setTimeout(() => {
            window.scrollTo(0, savedPosition);
            // Allow saving again after content has stabilized
            restorationTimeoutRef.current = setTimeout(() => {
              isRestoringScrollRef.current = false;
            }, 100);
          }, 50);
        });
      }
      hasRestoredScrollRef.current = true;
    }
  }, [isLoading, movies.length, scrollStorageKey]);

  // Scroll to top on error (reset position when data fetch fails)
  useLayoutEffect(() => {
    if (isError) {
      window.scrollTo(0, 0);
      hasRestoredScrollRef.current = true;
    }
  }, [isError]);

  // Get initial offset for virtualizer
  // Only use saved position for back-navigation (explicit signal), not refresh
  const initialOffset = useMemo(
    () =>
      shouldRestoreScrollRef.current
        ? getSavedScrollPosition(scrollStorageKey)
        : 0,
    [scrollStorageKey]
  );

  // Debounced scroll save
  const scrollSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const handleScroll = useCallback(() => {
    // Skip saving if we're in the middle of restoring scroll position
    if (isRestoringScrollRef.current) {
      return;
    }
    if (scrollSaveTimeoutRef.current) {
      clearTimeout(scrollSaveTimeoutRef.current);
    }
    scrollSaveTimeoutRef.current = setTimeout(() => {
      // Double-check guard in case restoration started during debounce
      if (isRestoringScrollRef.current) {
        return;
      }
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

  // Normalize title to string (can be string or {main, secondary} object from routeConfigHelper)
  const normalizedTitle = useMemo(() => {
    if (!title) return undefined;
    if (typeof title === "string") return title;
    // Object with main/secondary - combine them
    const titleObj = title as { main: string; secondary?: string };
    return titleObj.secondary ? `${titleObj.main}${titleObj.secondary}` : titleObj.main;
  }, [title]);

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <Box>
      {/* Grid Header - includes title when PageHeader is not rendered */}
      <GridHeader
        title={!renderPageHeader ? normalizedTitle : undefined}
        resultText={resultText}
        isLoading={isLoading}
        visible={showHeader}
      />

      {/* Error State */}
      {isError && <GridErrorState error={error} onRetry={() => refetch()} />}

      {/* Empty State */}
      {isEmpty && !isError && <GridEmptyState />}

      {/* Grid Container - always mounted for ResizeObserver stability */}
      <Box ref={containerRef}>
        {/* Loading Skeletons (Initial Load) */}
        {isLoading && <GridSkeletonLoader />}

        {/* Virtualized Movie Grid */}
        {!isLoading && movies.length > 0 && (
          <>
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
          </>
        )}
      </Box>

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
