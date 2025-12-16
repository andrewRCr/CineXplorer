/**
 * Shared Test Utilities for Movie Grid Components
 *
 * This module provides reusable fixtures, factories, and helpers for testing
 * InfiniteMovieGrid, SequentialMovieGrid, and VirtualizedMovieGrid components.
 *
 * DRY Principle: These utilities eliminate duplication across grid tests by
 * centralizing mock data creation, provider wrappers, and common mocks.
 */

/* eslint-disable react-refresh/only-export-components */
// Disabled: This file exports test utilities, not app components. Fast refresh N/A.

import { render } from "@testing-library/react";
import { vi } from "vitest";
import { ChakraProvider } from "@chakra-ui/react";
import defaultSystem from "@/theme";
import type { MovieListItem, PaginatedMoviesResponse } from "@/@types/movie";
import type { UseInfiniteMoviesResult } from "@/hooks/movie/useInfiniteMovies";

// ============================================================================
// Provider Wrapper
// ============================================================================

/**
 * Renders component wrapped in ChakraProvider for theme/styling context.
 * Use this for all component tests that use Chakra UI components.
 */
export const renderWithProvider = (ui: React.ReactElement) => {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>);
};

// ============================================================================
// Mock Movie Data Factory
// ============================================================================

/**
 * Creates a single mock MovieListItem with sensible defaults.
 * Override any field by passing options.
 *
 * @example
 * // Default movie
 * const movie = createMockMovie({ tmdb_id: 1 });
 *
 * // With custom fields
 * const movie = createMockMovie({
 *   tmdb_id: 42,
 *   title: "Custom Title",
 *   vote_average: 9.5,
 * });
 */
export const createMockMovie = (
  overrides: Partial<MovieListItem> & { tmdb_id: number }
): MovieListItem => {
  const { tmdb_id, ...rest } = overrides;
  return {
    tmdb_id,
    title: `Movie ${tmdb_id}`,
    release_date: "2023-01-01",
    poster_path: `/poster${tmdb_id}.jpg`,
    vote_average: 7.5,
    vote_count: 1000,
    overview: `Overview for movie ${tmdb_id}`,
    genre_ids: [28, 12],
    runtime: 120,
    ...rest, // Override defaults with any provided values (excluding tmdb_id)
  };
};

/**
 * Creates an array of mock movies with sequential IDs.
 *
 * @param count - Number of movies to create
 * @param startId - Starting tmdb_id (default: 1)
 * @param titlePrefix - Prefix for movie titles (default: "Movie")
 *
 * @example
 * // 5 movies with IDs 1-5
 * const movies = createMockMovies(5);
 *
 * // 3 movies with IDs 10-12 and custom prefix
 * const movies = createMockMovies(3, 10, "Action Film");
 */
export const createMockMovies = (
  count: number,
  startId = 1,
  titlePrefix = "Movie"
): MovieListItem[] =>
  Array.from({ length: count }, (_, i) =>
    createMockMovie({
      tmdb_id: startId + i,
      title: `${titlePrefix} ${startId + i}`,
    })
  );

// ============================================================================
// Mock Page Response Factory
// ============================================================================

/**
 * Creates a mock PaginatedMoviesResponse with realistic pagination metadata.
 *
 * @param pageNum - Display page number (1-indexed)
 * @param movies - Movies to include in this page
 * @param options - Override pagination metadata
 *
 * @example
 * // Basic page
 * const page = createMockPage(1, movies);
 *
 * // Last page (no next)
 * const page = createMockPage(5, movies, { hasNext: false });
 *
 * // Custom total
 * const page = createMockPage(1, movies, { totalResults: 500 });
 */
export const createMockPage = (
  pageNum: number,
  movies: MovieListItem[],
  options: {
    hasNext?: boolean;
    totalResults?: number;
    totalPages?: number;
  } = {}
): PaginatedMoviesResponse => {
  const { hasNext = true, totalResults = 200, totalPages = 10 } = options;

  return {
    page: pageNum,
    results: movies,
    total_pages: totalPages,
    total_results: totalResults,
    // Simulate TMDB cursor: each "display page" consumes ~3 TMDB pages
    next_tmdb_page_start: hasNext ? (pageNum + 1) * 3 : null,
  };
};

// ============================================================================
// Mock Hook Return Factory
// ============================================================================

/**
 * Default mock functions for useInfiniteMovies hook.
 * Create once per test file, reset in beforeEach via vi.clearAllMocks().
 */
export const createMockHookFunctions = () => ({
  fetchNextPage: vi.fn(),
  refetch: vi.fn(),
});

/**
 * Creates a complete mock return object for useInfiniteMovies hook.
 * All fields have sensible defaults; override only what your test needs.
 *
 * @example
 * // Loading state
 * const hookReturn = createMockHookReturn({ isLoading: true });
 *
 * // With movies
 * const hookReturn = createMockHookReturn({
 *   movies: createMockMovies(5),
 *   hasNextPage: true,
 * });
 *
 * // Error state
 * const hookReturn = createMockHookReturn({
 *   error: new Error("Network error"),
 *   isError: true,
 * });
 */
export const createMockHookReturn = (
  overrides: Partial<UseInfiniteMoviesResult> = {},
  mockFns = createMockHookFunctions()
): UseInfiniteMoviesResult => ({
  // Data
  movies: overrides.movies ?? [],
  pages: overrides.pages ?? [],
  pageCount: overrides.pageCount ?? 0,
  totalResults: overrides.totalResults,

  // Actions (use provided mocks or create new ones)
  fetchNextPage: overrides.fetchNextPage ?? mockFns.fetchNextPage,
  refetch: overrides.refetch ?? mockFns.refetch,

  // Pagination state
  hasNextPage: overrides.hasNextPage ?? false,

  // Loading states
  isLoading: overrides.isLoading ?? false,
  isFetching: overrides.isFetching ?? false,
  isFetchingNextPage: overrides.isFetchingNextPage ?? false,

  // Error state
  error: overrides.error ?? null,
  isError: overrides.isError ?? false,
});

// ============================================================================
// Common Mock Components
// ============================================================================

/**
 * Mock MovieCard component for isolating grid logic from card rendering.
 * Returns a simple div with movie title for easy assertions.
 */
export const MockMovieCard = ({ movie }: { movie: MovieListItem }) => (
  <div data-testid="movie-card">{movie.title}</div>
);

/**
 * Mock MovieCardContainer component for isolating grid logic from container styling.
 */
export const MockMovieCardContainer = ({
  children,
}: {
  children: React.ReactNode;
}) => <div data-testid="movie-card-container">{children}</div>;

// ============================================================================
// Browser API Mocks
// ============================================================================

/**
 * Creates a mock IntersectionObserver for testing infinite scroll triggers.
 * Returns the mock observer and helper to simulate intersection.
 *
 * @example
 * const { mockObserver, simulateIntersection } = createMockIntersectionObserver();
 * vi.stubGlobal("IntersectionObserver", mockObserver);
 *
 * // In test: trigger intersection
 * simulateIntersection(true);
 */
export const createMockIntersectionObserver = () => {
  const mockObserve = vi.fn();
  const mockDisconnect = vi.fn();
  const mockUnobserve = vi.fn();

  let storedCallback: ((entries: { isIntersecting: boolean }[]) => void) | null =
    null;

  const mockObserver = vi.fn((callback: typeof storedCallback) => {
    storedCallback = callback;
    return {
      observe: mockObserve,
      disconnect: mockDisconnect,
      unobserve: mockUnobserve,
    };
  });

  const simulateIntersection = (isIntersecting: boolean) => {
    if (storedCallback) {
      storedCallback([{ isIntersecting }]);
    }
  };

  return {
    mockObserver,
    mockObserve,
    mockDisconnect,
    mockUnobserve,
    simulateIntersection,
  };
};

/**
 * Creates a mock sessionStorage for testing scroll position persistence.
 * Returns the mock storage and helper functions.
 *
 * @example
 * const { mockStorage, getStoredValue } = createMockSessionStorage();
 * vi.stubGlobal("sessionStorage", mockStorage);
 *
 * // Check stored value
 * expect(getStoredValue("scroll-key")).toBe("500");
 */
export const createMockSessionStorage = () => {
  const store = new Map<string, string>();

  const mockStorage = {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => store.set(key, value)),
    removeItem: vi.fn((key: string) => store.delete(key)),
    clear: vi.fn(() => store.clear()),
    get length() {
      return store.size;
    },
    key: vi.fn((index: number) => Array.from(store.keys())[index] ?? null),
  };

  return {
    mockStorage,
    getStoredValue: (key: string) => store.get(key),
    setStoredValue: (key: string, value: string) => store.set(key, value),
    clearStorage: () => store.clear(),
  };
};

/**
 * Creates mock window scroll properties for testing scroll position.
 *
 * @example
 * const { setScrollY, mockScrollTo } = createMockWindowScroll();
 *
 * // Simulate user scrolling
 * setScrollY(500);
 * window.dispatchEvent(new Event("scroll"));
 */
export const createMockWindowScroll = () => {
  let currentScrollY = 0;
  const mockScrollTo = vi.fn((_x: number, y: number) => {
    currentScrollY = y;
  });

  // Note: Caller must manually stub window.scrollY and window.scrollTo
  // as they require different stubbing approaches per test framework

  return {
    getScrollY: () => currentScrollY,
    setScrollY: (y: number) => {
      currentScrollY = y;
    },
    mockScrollTo,
  };
};

/**
 * Creates a mock ResizeObserver for testing responsive column calculations.
 *
 * @example
 * const { mockObserver, simulateResize } = createMockResizeObserver();
 * vi.stubGlobal("ResizeObserver", mockObserver);
 *
 * // Simulate resize
 * simulateResize({ width: 1200 });
 */
export const createMockResizeObserver = () => {
  const mockObserve = vi.fn();
  const mockDisconnect = vi.fn();
  const mockUnobserve = vi.fn();

  let storedCallback:
    | ((entries: { contentRect: { width: number } }[]) => void)
    | null = null;

  const mockObserver = vi.fn((callback: typeof storedCallback) => {
    storedCallback = callback;
    return {
      observe: mockObserve,
      disconnect: mockDisconnect,
      unobserve: mockUnobserve,
    };
  });

  const simulateResize = (rect: { width: number; height?: number }) => {
    if (storedCallback) {
      storedCallback([{ contentRect: { width: rect.width } }]);
    }
  };

  return {
    mockObserver,
    mockObserve,
    mockDisconnect,
    mockUnobserve,
    simulateResize,
  };
};
