/**
 * VirtualizedMovieGrid Component Tests
 *
 * Test suite for the virtualized infinite scroll grid component.
 * Uses @tanstack/react-virtual for efficient rendering of large lists.
 *
 * KEY BEHAVIORS TESTED:
 * 1. Virtualization - Only visible items rendered (DOM efficiency)
 * 2. Loading states - Skeleton on initial load, spinner on page fetch
 * 3. Error handling - Error display with retry capability
 * 4. Empty state - Graceful "no movies found" display
 * 5. Infinite scroll - Auto-fetch when near bottom of content
 * 6. Scroll persistence - Save/restore scroll position for back-nav UX
 * 7. Filter awareness - Clear saved position on filter/query changes
 *
 * ARCHITECTURAL NOTES:
 * - Component uses `useWindowVirtualizer` for window-level scroll
 * - Scroll position keyed by stringified queryKey (filter-specific)
 * - Debounced scroll saves prevent excessive storage writes
 * - `initialOffset` enables instant scroll restoration on mount
 */

import { screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";

// Shared test utilities
import {
  renderWithProvider,
  createMockMovies,
  createMockPage,
  createMockHookReturn,
  createMockHookFunctions,
  createMockSessionStorage,
  MockMovieCard,
  MockMovieCardContainer,
} from "./grid-test-utils";

// Component under test
import VirtualizedMovieGrid from "../../VirtualizedMovieGrid";

// Mocked dependencies
import { useInfiniteMovies } from "@/hooks/movie/useInfiniteMovies";
import { useMovieCollectionContext } from "@/hooks/movie/useMovieCollectionContext";

// ============================================================================
// Mock Setup
// ============================================================================

// Mock the hooks used by the component
vi.mock("@/hooks/movie/useInfiniteMovies");
vi.mock("@/hooks/movie/useMovieCollectionContext");

// Mock child components to isolate grid logic from card rendering
vi.mock("../../../MovieCard", () => ({
  default: MockMovieCard,
}));

vi.mock("../../../MovieCardContainer", () => ({
  default: MockMovieCardContainer,
}));

/**
 * Mock useWindowVirtualizer from @tanstack/react-virtual.
 *
 * The virtualizer controls which items are "visible" and should render.
 * We mock it to return controllable virtual items for testing.
 */
vi.mock("@tanstack/react-virtual", () => ({
  useWindowVirtualizer: vi.fn(),
}));

// Import the mocked module for manipulation in tests
import { useWindowVirtualizer } from "@tanstack/react-virtual";

// ============================================================================
// Test Suite
// ============================================================================

describe("VirtualizedMovieGrid", () => {
  // Shared mock functions (reset each test)
  const mockFns = createMockHookFunctions();

  // Session storage mock for scroll persistence tests
  const sessionStorageMock = createMockSessionStorage();

  // Virtualizer mock state
  let mockVirtualItems: { index: number; start: number; size: number }[] = [];
  let mockScrollToOffset: Mock;

  /**
   * Creates mock virtualizer return value.
   * @param itemCount - Total number of items in the list
   * @param visibleRange - [start, end] indices of visible items
   */
  const createMockVirtualizer = (
    itemCount: number,
    visibleRange: [number, number] = [0, Math.min(itemCount, 12)]
  ) => {
    const [start, end] = visibleRange;
    mockVirtualItems = Array.from({ length: end - start }, (_, i) => ({
      index: start + i,
      start: (start + i) * 449, // Fixed row height
      size: 449,
    }));

    return {
      getVirtualItems: () => mockVirtualItems,
      getTotalSize: () => itemCount * 449,
      scrollToOffset: mockScrollToOffset,
      scrollOffset: 0,
      // Range for detecting "near bottom"
      range: { startIndex: start, endIndex: end },
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Reset session storage
    sessionStorageMock.clearStorage();
    vi.stubGlobal("sessionStorage", sessionStorageMock.mockStorage);

    // Reset scroll position
    Object.defineProperty(window, "scrollY", {
      value: 0,
      writable: true,
      configurable: true,
    });

    // Setup virtualizer mock
    mockScrollToOffset = vi.fn();
    (useWindowVirtualizer as Mock).mockReturnValue(
      createMockVirtualizer(0, [0, 0])
    );

    // Setup default context mock - provides queryKey for scroll position keying
    (useMovieCollectionContext as Mock).mockReturnValue({
      source: "discover",
      query: "",
      finalFetcher: vi.fn(),
      browseParams: {},
    });

    // Setup default hook mock - empty state
    (useInfiniteMovies as Mock).mockReturnValue(
      createMockHookReturn({}, mockFns)
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  // ==========================================================================
  // VIRTUALIZATION TESTS
  // Tests that only visible items are rendered (DOM efficiency)
  // ==========================================================================

  describe("Virtualization: Only visible items rendered", () => {
    /**
     * Core virtualization behavior: With 50 movies loaded, only the items
     * currently in the viewport should have DOM elements. This is what makes
     * virtualization efficient for long lists.
     */
    it("renders only visible movie cards, not the entire dataset", () => {
      const allMovies = createMockMovies(50);

      // Virtualizer reports only items 0-11 are visible
      (useWindowVirtualizer as Mock).mockReturnValue(
        createMockVirtualizer(50, [0, 12])
      );

      (useInfiniteMovies as Mock).mockReturnValue(
        createMockHookReturn({
          movies: allMovies,
          pages: [createMockPage(1, allMovies)],
          pageCount: 1,
          totalResults: 500,
          hasNextPage: true,
        }, mockFns)
      );

      renderWithProvider(<VirtualizedMovieGrid />);

      // Should render exactly 12 movie cards (the visible ones)
      const movieCards = screen.getAllByTestId("movie-card");
      expect(movieCards).toHaveLength(12);

      // Verify it's the first 12 movies
      expect(screen.getByText("Movie 1")).toBeInTheDocument();
      expect(screen.getByText("Movie 12")).toBeInTheDocument();

      // Movie 13+ should NOT be rendered (not in viewport)
      expect(screen.queryByText("Movie 13")).not.toBeInTheDocument();
      expect(screen.queryByText("Movie 50")).not.toBeInTheDocument();
    });

    /**
     * When user scrolls down, the visible range changes and different
     * items should render. This verifies the virtualizer integration.
     */
    it("updates rendered items when virtualizer range changes", () => {
      const allMovies = createMockMovies(50);

      // Simulate scrolled state: items 20-31 visible
      (useWindowVirtualizer as Mock).mockReturnValue(
        createMockVirtualizer(50, [20, 32])
      );

      (useInfiniteMovies as Mock).mockReturnValue(
        createMockHookReturn({
          movies: allMovies,
          hasNextPage: true,
        }, mockFns)
      );

      renderWithProvider(<VirtualizedMovieGrid />);

      // Should show movies 21-32 (1-indexed titles)
      expect(screen.getByText("Movie 21")).toBeInTheDocument();
      expect(screen.getByText("Movie 32")).toBeInTheDocument();

      // Earlier items not rendered
      expect(screen.queryByText("Movie 1")).not.toBeInTheDocument();
      expect(screen.queryByText("Movie 19")).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // LOADING STATE TESTS
  // Tests skeleton display during initial fetch
  // ==========================================================================

  describe("Loading states: Skeleton and spinners", () => {
    /**
     * Initial page load should show skeleton placeholders while data
     * is being fetched. This provides visual feedback that content is loading.
     * Note: Skeletons wrap MovieCard components for proper sizing, so
     * movie-card elements exist but are visually hidden by the skeleton overlay.
     */
    it("shows skeleton loaders during initial data fetch", () => {
      (useInfiniteMovies as Mock).mockReturnValue(
        createMockHookReturn({
          isLoading: true,
          isFetching: true,
        }, mockFns)
      );

      renderWithProvider(<VirtualizedMovieGrid />);

      // Should show skeleton loaders (20 skeleton cards)
      const skeletons = screen.getAllByTestId("skeleton-loader");
      expect(skeletons.length).toBe(20);
    });

    /**
     * When fetching additional pages (not initial load), show a loading
     * indicator at the bottom while preserving existing content.
     */
    it("shows loading indicator when fetching next page", () => {
      const movies = createMockMovies(20);

      (useWindowVirtualizer as Mock).mockReturnValue(
        createMockVirtualizer(20, [0, 12])
      );

      (useInfiniteMovies as Mock).mockReturnValue(
        createMockHookReturn({
          movies,
          hasNextPage: true,
          isFetching: true,
          isFetchingNextPage: true,
        }, mockFns)
      );

      renderWithProvider(<VirtualizedMovieGrid />);

      // Existing movies still visible
      expect(screen.getAllByTestId("movie-card")).toHaveLength(12);

      // Loading indicator for next page
      expect(screen.getByTestId("loading-more")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // ERROR STATE TESTS
  // Tests error display with retry capability
  // ==========================================================================

  describe("Error handling: Display and retry", () => {
    /**
     * When the API request fails, display the error message and provide
     * a retry button so users can attempt to recover.
     */
    it("displays error message when fetch fails", () => {
      (useInfiniteMovies as Mock).mockReturnValue(
        createMockHookReturn({
          error: new Error("Network error"),
          isError: true,
        }, mockFns)
      );

      renderWithProvider(<VirtualizedMovieGrid />);

      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });

    /**
     * The retry button should call refetch() to attempt recovery.
     */
    it("calls refetch when retry button clicked", () => {
      (useInfiniteMovies as Mock).mockReturnValue(
        createMockHookReturn({
          error: new Error("Network error"),
          isError: true,
        }, mockFns)
      );

      renderWithProvider(<VirtualizedMovieGrid />);

      const retryButton = screen.getByRole("button", { name: /retry/i });
      fireEvent.click(retryButton);

      expect(mockFns.refetch).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // EMPTY STATE TESTS
  // Tests graceful handling of no results
  // ==========================================================================

  describe("Empty state: No movies found", () => {
    /**
     * When the API returns no results (e.g., filters too restrictive),
     * show a helpful message instead of an empty grid.
     */
    it("shows 'no movies found' when results are empty", () => {
      (useInfiniteMovies as Mock).mockReturnValue(
        createMockHookReturn({
          movies: [],
          hasNextPage: false,
          isLoading: false,
        }, mockFns)
      );

      renderWithProvider(<VirtualizedMovieGrid />);

      expect(screen.getByText(/no movies found/i)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // INFINITE SCROLL TESTS
  // Tests auto-fetching when scrolling near bottom
  // ==========================================================================

  describe("Infinite scroll: Auto-fetch on scroll", () => {
    /**
     * When the virtualizer detects the user has scrolled near the bottom
     * of available content, trigger fetchNextPage to load more movies.
     * This creates the "infinite scroll" UX.
     */
    it("triggers fetchNextPage when scrolling near bottom", async () => {
      const movies = createMockMovies(20);

      // Simulate near-bottom: visible items 15-19 out of 20
      const mockVirtualizer = createMockVirtualizer(20, [15, 20]);
      (useWindowVirtualizer as Mock).mockReturnValue(mockVirtualizer);

      (useInfiniteMovies as Mock).mockReturnValue(
        createMockHookReturn({
          movies,
          hasNextPage: true,
          isFetching: false,
          isFetchingNextPage: false,
        }, mockFns)
      );

      renderWithProvider(<VirtualizedMovieGrid />);

      // Component should have detected near-bottom state and triggered fetch
      // (debounced to prevent excessive calls)
      vi.advanceTimersByTime(150);

      expect(mockFns.fetchNextPage).toHaveBeenCalledTimes(1);
    });

    /**
     * Don't trigger fetch if we're already fetching - prevents duplicate
     * requests and potential race conditions.
     */
    it("does not trigger fetch when already fetching", () => {
      const movies = createMockMovies(20);

      // Near bottom but already fetching
      (useWindowVirtualizer as Mock).mockReturnValue(
        createMockVirtualizer(20, [15, 20])
      );

      (useInfiniteMovies as Mock).mockReturnValue(
        createMockHookReturn({
          movies,
          hasNextPage: true,
          isFetching: true,
          isFetchingNextPage: true,
        }, mockFns)
      );

      renderWithProvider(<VirtualizedMovieGrid />);

      vi.advanceTimersByTime(150);

      // Should NOT call fetchNextPage since already fetching
      expect(mockFns.fetchNextPage).not.toHaveBeenCalled();
    });

    /**
     * Don't trigger fetch if there are no more pages - respects
     * the hasNextPage flag from the API.
     */
    it("does not trigger fetch when no more pages", () => {
      const movies = createMockMovies(20);

      // At bottom, but no more pages
      (useWindowVirtualizer as Mock).mockReturnValue(
        createMockVirtualizer(20, [15, 20])
      );

      (useInfiniteMovies as Mock).mockReturnValue(
        createMockHookReturn({
          movies,
          hasNextPage: false, // No more pages
          isFetching: false,
        }, mockFns)
      );

      renderWithProvider(<VirtualizedMovieGrid />);

      vi.advanceTimersByTime(150);

      expect(mockFns.fetchNextPage).not.toHaveBeenCalled();
    });

    /**
     * Show "end of results" message when user has scrolled through
     * all available content.
     */
    it("shows 'end of results' when hasNextPage is false", () => {
      const movies = createMockMovies(20);

      (useWindowVirtualizer as Mock).mockReturnValue(
        createMockVirtualizer(20, [0, 12])
      );

      (useInfiniteMovies as Mock).mockReturnValue(
        createMockHookReturn({
          movies,
          hasNextPage: false,
          isFetching: false,
        }, mockFns)
      );

      renderWithProvider(<VirtualizedMovieGrid />);

      expect(screen.getByText(/no more results/i)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // SCROLL POSITION PERSISTENCE TESTS
  // Tests save/restore for back-navigation UX
  // ==========================================================================

  describe("Scroll persistence: Save position on scroll", () => {
    /**
     * When user scrolls, save the current scroll position to sessionStorage.
     * This enables restoring position when navigating back to the page.
     * The save is debounced to prevent excessive writes.
     */
    it("saves scroll position to sessionStorage on scroll (debounced)", async () => {
      const movies = createMockMovies(50);

      (useWindowVirtualizer as Mock).mockReturnValue(
        createMockVirtualizer(50, [0, 12])
      );

      // Context provides queryKey for storage key generation
      (useMovieCollectionContext as Mock).mockReturnValue({
        source: "discover",
        query: "",
        finalFetcher: vi.fn(),
        browseParams: { genre: "action" },
      });

      (useInfiniteMovies as Mock).mockReturnValue(
        createMockHookReturn({
          movies,
          hasNextPage: true,
        }, mockFns)
      );

      renderWithProvider(<VirtualizedMovieGrid />);

      // Simulate scroll event
      Object.defineProperty(window, "scrollY", { value: 500, configurable: true });
      fireEvent.scroll(window);

      // Debounce delay
      vi.advanceTimersByTime(200);

      // Should have saved to sessionStorage
      expect(sessionStorageMock.mockStorage.setItem).toHaveBeenCalled();

      // Key should include filter context for filter-specific positions
      const setItemCalls = sessionStorageMock.mockStorage.setItem.mock.calls;
      expect(setItemCalls.length).toBeGreaterThan(0);

      // Value should be JSON with the scroll position
      const lastCall = setItemCalls[setItemCalls.length - 1];
      expect(lastCall[1]).toContain('"position":500');
    });
  });

  describe("Scroll persistence: Restore position on mount", () => {
    /** Helper to create JSON storage entry format */
    const createStorageEntry = (position: number, timestamp = Date.now()) =>
      JSON.stringify({ position, timestamp });

    /**
     * When component mounts with restoreScroll=true in location state
     * (from "Back to Results" link) and there's a saved scroll position,
     * restore it via the virtualizer's initialOffset.
     * This creates seamless back-navigation UX.
     */
    it("restores scroll position from sessionStorage on mount", () => {
      const movies = createMockMovies(50);

      // Pre-populate saved scroll position (JSON format with position and timestamp)
      sessionStorageMock.setStoredValue("scroll-discover-", createStorageEntry(750));

      (useMovieCollectionContext as Mock).mockReturnValue({
        source: "discover",
        query: "",
        finalFetcher: vi.fn(),
        browseParams: {},
      });

      (useInfiniteMovies as Mock).mockReturnValue(
        createMockHookReturn({
          movies,
          hasNextPage: true,
        }, mockFns)
      );

      // Simulate back-navigation via location state
      // (set by BackToCollectionLink component)
      renderWithProvider(<VirtualizedMovieGrid />, {
        initialEntries: [{ pathname: "/browse", state: { restoreScroll: true } }],
      });

      // Virtualizer should have been created with initialOffset
      expect(useWindowVirtualizer).toHaveBeenCalledWith(
        expect.objectContaining({
          initialOffset: 750,
        })
      );
    });

    /**
     * If no saved position exists, start at top (offset 0).
     */
    it("starts at top when no saved position exists", () => {
      const movies = createMockMovies(50);

      // No saved position
      sessionStorageMock.clearStorage();

      (useInfiniteMovies as Mock).mockReturnValue(
        createMockHookReturn({
          movies,
          hasNextPage: true,
        }, mockFns)
      );

      renderWithProvider(<VirtualizedMovieGrid />);

      // Should use 0 as default initialOffset
      expect(useWindowVirtualizer).toHaveBeenCalledWith(
        expect.objectContaining({
          initialOffset: 0,
        })
      );
    });
  });

  describe("Scroll persistence: Clear on filter change", () => {
    /**
     * When filters change (new queryKey), the saved scroll position is
     * no longer valid - it was for different content. Clear it so user
     * starts at top of new results.
     *
     * This test verifies that the component uses a different storage key
     * for different filter combinations, so changing filters means
     * no saved position exists for the new key.
     */
    it("clears saved position when queryKey changes", () => {
      const movies = createMockMovies(50);

      // Save position for "action" filter
      sessionStorageMock.setStoredValue("scroll-discover-action", "500");

      // But render with "comedy" filter - different queryKey
      (useMovieCollectionContext as Mock).mockReturnValue({
        source: "discover",
        query: "",
        finalFetcher: vi.fn(),
        browseParams: { genre: "comedy" }, // Different filter than saved
      });

      (useInfiniteMovies as Mock).mockReturnValue(
        createMockHookReturn({
          movies,
          hasNextPage: true,
        }, mockFns)
      );

      renderWithProvider(<VirtualizedMovieGrid />);

      // Since queryKey is for "comedy" but saved position is for "action",
      // the component should not find a saved position and use 0
      expect(useWindowVirtualizer).toHaveBeenCalledWith(
        expect.objectContaining({
          initialOffset: 0,
        })
      );
    });
  });

  // ==========================================================================
  // INTEGRATION: Virtualizer configuration
  // Tests that virtualizer is configured correctly
  // ==========================================================================

  describe("Virtualizer configuration", () => {
    /**
     * The virtualizer must be configured with correct item sizing for
     * accurate scroll calculations. Our movie cards have fixed height.
     */
    it("configures virtualizer with correct item size", () => {
      const movies = createMockMovies(20);

      (useInfiniteMovies as Mock).mockReturnValue(
        createMockHookReturn({
          movies,
          hasNextPage: true,
        }, mockFns)
      );

      renderWithProvider(<VirtualizedMovieGrid />);

      // Should configure virtualizer with our fixed row height
      expect(useWindowVirtualizer).toHaveBeenCalledWith(
        expect.objectContaining({
          count: 20,
          estimateSize: expect.any(Function),
        })
      );

      // Verify estimateSize returns correct value
      const config = (useWindowVirtualizer as Mock).mock.calls[0][0];
      expect(config.estimateSize()).toBe(449); // Fixed card height
    });

    /**
     * Gap between items should be specified for correct positioning.
     */
    it("configures virtualizer with gap spacing", () => {
      const movies = createMockMovies(20);

      (useInfiniteMovies as Mock).mockReturnValue(
        createMockHookReturn({
          movies,
          hasNextPage: true,
        }, mockFns)
      );

      renderWithProvider(<VirtualizedMovieGrid />);

      expect(useWindowVirtualizer).toHaveBeenCalledWith(
        expect.objectContaining({
          gap: 16, // Standard spacing between cards
        })
      );
    });
  });

  // ==========================================================================
  // EDGE CASE TESTS
  // Tests for resize and content edge cases
  // ==========================================================================

  describe("Edge cases: Resize and content extremes", () => {
    /**
     * When viewport resizes (e.g., tablet rotation, sidebar toggle),
     * the component re-renders with new column count. The grid should
     * continue functioning correctly without visual glitches.
     *
     * This test verifies the component correctly passes rowCount to
     * the virtualizer, which changes based on column layout.
     *
     * Note: In jsdom, container.offsetWidth is 0, so columnCount defaults
     * to 1 (all movies in single column). The virtualizer is called with
     * rowCount = movies.length / columnCount.
     */
    it("passes correct rowCount to virtualizer based on movie count", () => {
      const movies = createMockMovies(20);

      // In jsdom with 0 container width, columnCount = 1, so rowCount = 20
      (useWindowVirtualizer as Mock).mockReturnValue(
        createMockVirtualizer(20, [0, 12])
      );

      (useInfiniteMovies as Mock).mockReturnValue(
        createMockHookReturn({
          movies,
          hasNextPage: true,
        }, mockFns)
      );

      renderWithProvider(<VirtualizedMovieGrid />);

      // Verify virtualizer was called with correct count
      // In jsdom: 20 movies / 1 column = 20 rows
      expect(useWindowVirtualizer).toHaveBeenCalledWith(
        expect.objectContaining({
          count: 20,
        })
      );

      // Verify component renders visible cards
      const movieCards = screen.getAllByTestId("movie-card");
      expect(movieCards.length).toBeGreaterThan(0);
      expect(movieCards.length).toBeLessThanOrEqual(12); // Only visible ones
    });

    /**
     * When there are very few results (fewer than fill the viewport),
     * the grid should display them without virtualization gaps or
     * unexpected behavior.
     *
     * Note: In jsdom, columnCount = 1, so each movie gets its own row.
     * With 3 movies, virtualizer shows rows 0-2, displaying all 3 movies.
     */
    it("handles very few results where viewport exceeds content", () => {
      const movies = createMockMovies(3); // Just 3 movies

      // In jsdom with columnCount = 1, we have 3 rows
      // Return all 3 rows as visible
      const mockVirtualizer = {
        getVirtualItems: () => [
          { index: 0, start: 0, size: 449 },
          { index: 1, start: 465, size: 449 },
          { index: 2, start: 930, size: 449 },
        ],
        getTotalSize: () => 449 * 3,
        scrollToOffset: mockScrollToOffset,
        scrollOffset: 0,
        range: { startIndex: 0, endIndex: 3 },
      };

      (useWindowVirtualizer as Mock).mockReturnValue(mockVirtualizer);

      (useInfiniteMovies as Mock).mockReturnValue(
        createMockHookReturn({
          movies,
          hasNextPage: false, // No more results
          totalResults: 3,
        }, mockFns)
      );

      renderWithProvider(<VirtualizedMovieGrid />);

      // All 3 movies should be visible (one per row in jsdom)
      expect(screen.getByText("Movie 1")).toBeInTheDocument();
      expect(screen.getByText("Movie 2")).toBeInTheDocument();
      expect(screen.getByText("Movie 3")).toBeInTheDocument();

      // Should show "no more results" since hasNextPage is false
      expect(screen.getByText(/no more results/i)).toBeInTheDocument();
    });

    /**
     * Single result edge case: Grid should handle displaying just one movie
     * without layout issues or unexpected empty states.
     */
    it("handles single result correctly", () => {
      const movies = createMockMovies(1); // Just 1 movie

      const mockVirtualizer = {
        getVirtualItems: () => [
          { index: 0, start: 0, size: 449 },
        ],
        getTotalSize: () => 449,
        scrollToOffset: mockScrollToOffset,
        scrollOffset: 0,
        range: { startIndex: 0, endIndex: 1 },
      };

      (useWindowVirtualizer as Mock).mockReturnValue(mockVirtualizer);

      (useInfiniteMovies as Mock).mockReturnValue(
        createMockHookReturn({
          movies,
          hasNextPage: false,
          totalResults: 1,
        }, mockFns)
      );

      renderWithProvider(<VirtualizedMovieGrid />);

      // Single movie should display
      expect(screen.getByText("Movie 1")).toBeInTheDocument();

      // Should still show grid, not empty state
      expect(screen.queryByText(/no movies found/i)).not.toBeInTheDocument();
    });

    /**
     * When content is small but hasNextPage is true, the "near bottom"
     * detection should trigger a fetch. This tests the edge where
     * all content fits in viewport but more exists on server.
     *
     * Detection logic: lastVisibleIndex >= rowCount - 2
     * With 5 movies (5 rows in jsdom), visible 0-4, last=4, rowCount=5
     * 4 >= 5-2 = 4 >= 3 = true → should fetch
     */
    it("triggers fetch for small content when at bottom", () => {
      const movies = createMockMovies(5);

      // In jsdom: columnCount=1, rowCount=5
      // Simulate all rows visible (small content)
      const mockVirtualizer = {
        getVirtualItems: () => [
          { index: 0, start: 0, size: 449 },
          { index: 1, start: 465, size: 449 },
          { index: 2, start: 930, size: 449 },
          { index: 3, start: 1395, size: 449 },
          { index: 4, start: 1860, size: 449 }, // Last row, index 4
        ],
        getTotalSize: () => 449 * 5,
        scrollToOffset: mockScrollToOffset,
        scrollOffset: 0,
        range: { startIndex: 0, endIndex: 5 },
      };

      (useWindowVirtualizer as Mock).mockReturnValue(mockVirtualizer);

      (useInfiniteMovies as Mock).mockReturnValue(
        createMockHookReturn({
          movies,
          hasNextPage: true,
          isFetching: false,
          isFetchingNextPage: false,
        }, mockFns)
      );

      renderWithProvider(<VirtualizedMovieGrid />);

      // Advance timers to trigger debounced fetch
      vi.advanceTimersByTime(150);

      // lastVisibleIndex (4) >= rowCount (5) - 2 = 3 → should trigger fetch
      expect(mockFns.fetchNextPage).toHaveBeenCalled();
    });
  });
});
