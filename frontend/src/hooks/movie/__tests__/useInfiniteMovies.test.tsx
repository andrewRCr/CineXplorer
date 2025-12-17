/**
 * Tests for useInfiniteMovies hook
 *
 * This hook wraps TanStack Query's useInfiniteQuery for movie fetching,
 * handling cursor-based pagination via next_tmdb_page_start.
 *
 * Test coverage:
 * - Returns paginated results correctly
 * - fetchNextPage triggers next page load with correct tmdb_page_start
 * - hasNextPage reflects API response (next_tmdb_page_start presence)
 * - Filter changes reset query (new query key)
 * - Error states handled correctly
 */

import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useInfiniteMovies } from "../useInfiniteMovies";
import type { PaginatedMoviesResponse } from "@/@types/movie";

// Helper to create QueryClient wrapper for tests
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Don't retry in tests
        gcTime: 0, // Don't cache between tests
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

/**
 * Helper to create mock paginated response
 */
function createMockResponse(
  overrides?: Partial<PaginatedMoviesResponse>
): PaginatedMoviesResponse {
  return {
    page: 1,
    total_pages: 10,
    total_results: 200,
    results: [
      {
        tmdb_id: 123,
        title: "Test Movie 1",
        poster_path: "/test1.jpg",
        release_date: "2024-01-01",
        vote_average: 8.5,
        user_movie_data: null,
      },
      {
        tmdb_id: 456,
        title: "Test Movie 2",
        poster_path: "/test2.jpg",
        release_date: "2024-02-01",
        vote_average: 7.8,
        user_movie_data: null,
      },
    ],
    next_tmdb_page_start: 3,
    ...overrides,
  };
}

describe("useInfiniteMovies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("returns paginated results correctly", () => {
    it("should return movies from initial fetch", async () => {
      const mockFetcher = vi.fn().mockResolvedValue(createMockResponse());

      const { result } = renderHook(
        () =>
          useInfiniteMovies({
            queryKey: ["movies", "test"],
            fetcher: mockFetcher,
          }),
        { wrapper: createWrapper() }
      );

      // Initially loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.movies).toEqual([]);

      // Wait for data
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should have movies flattened from pages
      expect(result.current.movies).toHaveLength(2);
      expect(result.current.movies[0].tmdb_id).toBe(123);
      expect(result.current.movies[1].tmdb_id).toBe(456);

      // Should expose raw pages array for sequential pagination
      expect(result.current.pages).toHaveLength(1);
      expect(result.current.pageCount).toBe(1);
      expect(result.current.pages[0].results).toHaveLength(2);
    });

    it("should flatten movies from multiple pages", async () => {
      const page1 = createMockResponse({
        page: 1,
        next_tmdb_page_start: 3,
        results: [
          {
            tmdb_id: 1,
            title: "Movie 1",
            poster_path: null,
            release_date: "2024-01-01",
            vote_average: 8.0,
            user_movie_data: null,
          },
        ],
      });

      const page2 = createMockResponse({
        page: 2,
        next_tmdb_page_start: 5,
        results: [
          {
            tmdb_id: 2,
            title: "Movie 2",
            poster_path: null,
            release_date: "2024-01-02",
            vote_average: 7.0,
            user_movie_data: null,
          },
        ],
      });

      const mockFetcher = vi
        .fn()
        .mockResolvedValueOnce(page1)
        .mockResolvedValueOnce(page2);

      const { result } = renderHook(
        () =>
          useInfiniteMovies({
            queryKey: ["movies", "test"],
            fetcher: mockFetcher,
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Fetch next page
      await result.current.fetchNextPage();

      await waitFor(() => {
        expect(result.current.movies).toHaveLength(2);
      });

      // Movies should be flattened from both pages
      expect(result.current.movies[0].tmdb_id).toBe(1);
      expect(result.current.movies[1].tmdb_id).toBe(2);
    });
  });

  describe("fetchNextPage triggers next page load with correct tmdb_page_start", () => {
    it("should pass next_tmdb_page_start to fetcher for subsequent pages", async () => {
      const page1 = createMockResponse({
        page: 1,
        next_tmdb_page_start: 5, // Buffer consumed TMDB pages 1-4
      });

      const page2 = createMockResponse({
        page: 2,
        next_tmdb_page_start: 9,
      });

      const mockFetcher = vi
        .fn()
        .mockResolvedValueOnce(page1)
        .mockResolvedValueOnce(page2);

      const { result } = renderHook(
        () =>
          useInfiniteMovies({
            queryKey: ["movies", "test"],
            fetcher: mockFetcher,
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // First call should have no pageParam (initial fetch)
      expect(mockFetcher).toHaveBeenCalledTimes(1);
      expect(mockFetcher).toHaveBeenCalledWith(
        expect.objectContaining({ pageParam: undefined })
      );

      // Trigger next page
      await result.current.fetchNextPage();

      await waitFor(() => {
        expect(mockFetcher).toHaveBeenCalledTimes(2);
      });

      // Second call should have tmdb_page_start from first response
      expect(mockFetcher).toHaveBeenLastCalledWith(
        expect.objectContaining({ pageParam: 5 })
      );
    });
  });

  describe("hasNextPage reflects API response", () => {
    it("should have hasNextPage=true when next_tmdb_page_start is present", async () => {
      const mockFetcher = vi.fn().mockResolvedValue(
        createMockResponse({
          next_tmdb_page_start: 5,
        })
      );

      const { result } = renderHook(
        () =>
          useInfiniteMovies({
            queryKey: ["movies", "test"],
            fetcher: mockFetcher,
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasNextPage).toBe(true);
    });

    it("should have hasNextPage=false when next_tmdb_page_start is null", async () => {
      const mockFetcher = vi.fn().mockResolvedValue(
        createMockResponse({
          next_tmdb_page_start: null,
        })
      );

      const { result } = renderHook(
        () =>
          useInfiniteMovies({
            queryKey: ["movies", "test"],
            fetcher: mockFetcher,
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasNextPage).toBe(false);
    });

    it("should have hasNextPage=false when next_tmdb_page_start is undefined", async () => {
      const { next_tmdb_page_start: _, ...response } = createMockResponse();

      const mockFetcher = vi.fn().mockResolvedValue(response);

      const { result } = renderHook(
        () =>
          useInfiniteMovies({
            queryKey: ["movies", "test"],
            fetcher: mockFetcher,
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasNextPage).toBe(false);
    });
  });

  describe("filter changes reset query", () => {
    it("should refetch when query key changes", async () => {
      const response1 = createMockResponse({
        results: [
          {
            tmdb_id: 100,
            title: "Filter 1 Movie",
            poster_path: null,
            release_date: "2024-01-01",
            vote_average: 8.0,
            user_movie_data: null,
          },
        ],
      });

      const response2 = createMockResponse({
        results: [
          {
            tmdb_id: 200,
            title: "Filter 2 Movie",
            poster_path: null,
            release_date: "2024-01-01",
            vote_average: 7.0,
            user_movie_data: null,
          },
        ],
      });

      const mockFetcher = vi
        .fn()
        .mockResolvedValueOnce(response1)
        .mockResolvedValueOnce(response2);

      const { result, rerender } = renderHook(
        ({ queryKey }) =>
          useInfiniteMovies({
            queryKey,
            fetcher: mockFetcher,
          }),
        {
          wrapper: createWrapper(),
          initialProps: { queryKey: ["movies", { genre: "action" }] },
        }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.movies[0].tmdb_id).toBe(100);

      // Change filter (query key)
      rerender({ queryKey: ["movies", { genre: "comedy" }] });

      await waitFor(() => {
        expect(result.current.movies[0]?.tmdb_id).toBe(200);
      });

      // Should have made two separate fetches
      expect(mockFetcher).toHaveBeenCalledTimes(2);
    });
  });

  describe("error states handled correctly", () => {
    it("should expose error when fetch fails", async () => {
      const mockError = new Error("Network error");
      const mockFetcher = vi.fn().mockRejectedValue(mockError);

      const { result } = renderHook(
        () =>
          useInfiniteMovies({
            queryKey: ["movies", "test"],
            fetcher: mockFetcher,
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.movies).toEqual([]);
    });

    it("should have isError=true on failure", async () => {
      const mockFetcher = vi.fn().mockRejectedValue(new Error("Failed"));

      const { result } = renderHook(
        () =>
          useInfiniteMovies({
            queryKey: ["movies", "test"],
            fetcher: mockFetcher,
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe("isFetching states", () => {
    it("should have isFetchingNextPage=true while loading more", async () => {
      let resolveSecondPage: (value: PaginatedMoviesResponse) => void;
      const secondPagePromise = new Promise<PaginatedMoviesResponse>(
        (resolve) => {
          resolveSecondPage = resolve;
        }
      );

      const page1 = createMockResponse({ next_tmdb_page_start: 3 });

      const mockFetcher = vi
        .fn()
        .mockResolvedValueOnce(page1)
        .mockReturnValueOnce(secondPagePromise);

      const { result } = renderHook(
        () =>
          useInfiniteMovies({
            queryKey: ["movies", "test"],
            fetcher: mockFetcher,
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Start fetching next page
      result.current.fetchNextPage();

      await waitFor(() => {
        expect(result.current.isFetchingNextPage).toBe(true);
      });

      // Resolve the second page
      resolveSecondPage!(createMockResponse({ page: 2 }));

      await waitFor(() => {
        expect(result.current.isFetchingNextPage).toBe(false);
      });
    });
  });

  describe("edge cases", () => {
    it("handles empty page in middle of results", async () => {
      // Page 1 has movies, page 2 is empty, page 3 has movies
      const page1 = createMockResponse({
        page: 1,
        next_tmdb_page_start: 3,
        results: [
          {
            tmdb_id: 1,
            title: "Movie 1",
            poster_path: null,
            release_date: "2024-01-01",
            vote_average: 8.0,
            user_movie_data: null,
          },
        ],
      });

      const page2Empty = createMockResponse({
        page: 2,
        next_tmdb_page_start: 5,
        results: [], // Empty page
      });

      const page3 = createMockResponse({
        page: 3,
        next_tmdb_page_start: null, // Last page
        results: [
          {
            tmdb_id: 3,
            title: "Movie 3",
            poster_path: null,
            release_date: "2024-01-03",
            vote_average: 7.0,
            user_movie_data: null,
          },
        ],
      });

      const mockFetcher = vi
        .fn()
        .mockResolvedValueOnce(page1)
        .mockResolvedValueOnce(page2Empty)
        .mockResolvedValueOnce(page3);

      const { result } = renderHook(
        () =>
          useInfiniteMovies({
            queryKey: ["movies", "edge-empty"],
            fetcher: mockFetcher,
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Fetch page 2 (empty)
      await result.current.fetchNextPage();
      await waitFor(() => expect(result.current.pageCount).toBe(2));

      // Fetch page 3
      await result.current.fetchNextPage();
      await waitFor(() => expect(result.current.pageCount).toBe(3));

      // Movies should be flattened correctly, skipping empty page
      expect(result.current.movies).toHaveLength(2);
      expect(result.current.movies[0].tmdb_id).toBe(1);
      expect(result.current.movies[1].tmdb_id).toBe(3);
    });

    it("handles cursor becoming null after non-null (end of results)", async () => {
      const page1 = createMockResponse({
        page: 1,
        next_tmdb_page_start: 3, // Has more
      });

      const page2Last = createMockResponse({
        page: 2,
        next_tmdb_page_start: null, // No more pages
        results: [
          {
            tmdb_id: 999,
            title: "Last Movie",
            poster_path: null,
            release_date: "2024-12-31",
            vote_average: 9.0,
            user_movie_data: null,
          },
        ],
      });

      const mockFetcher = vi
        .fn()
        .mockResolvedValueOnce(page1)
        .mockResolvedValueOnce(page2Last);

      const { result } = renderHook(
        () =>
          useInfiniteMovies({
            queryKey: ["movies", "end-cursor"],
            fetcher: mockFetcher,
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.hasNextPage).toBe(true);
      });

      await result.current.fetchNextPage();

      await waitFor(() => {
        expect(result.current.hasNextPage).toBe(false);
      });

      // Should have movies from both pages
      expect(result.current.movies).toHaveLength(3); // 2 from page1 + 1 from page2
    });

    it("does not refetch when query key has same values but different reference", async () => {
      const mockFetcher = vi.fn().mockResolvedValue(createMockResponse());

      // Use a stable query key format
      const queryKeyValue = { genre: "action", year: 2024 };

      const { result, rerender } = renderHook(
        ({ queryKey }) =>
          useInfiniteMovies({
            queryKey: ["movies", queryKey],
            fetcher: mockFetcher,
          }),
        {
          wrapper: createWrapper(),
          initialProps: { queryKey: { ...queryKeyValue } },
        }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetcher).toHaveBeenCalledTimes(1);

      // Rerender with structurally identical but different reference object
      rerender({ queryKey: { ...queryKeyValue } });

      // Wait for any potential async effects to settle
      await waitFor(() => {
        expect(true).toBe(true);
      });

      // Should NOT refetch since TanStack Query compares by value, not reference
      // This tests that the query key serialization works correctly
      expect(mockFetcher).toHaveBeenCalledTimes(1);
    });

    it("handles fetchNextPage call while already fetching", async () => {
      let resolveFirstFetch: (value: PaginatedMoviesResponse) => void;
      const firstFetchPromise = new Promise<PaginatedMoviesResponse>(
        (resolve) => {
          resolveFirstFetch = resolve;
        }
      );

      const mockFetcher = vi.fn().mockReturnValue(firstFetchPromise);

      const { result } = renderHook(
        () =>
          useInfiniteMovies({
            queryKey: ["movies", "concurrent"],
            fetcher: mockFetcher,
          }),
        { wrapper: createWrapper() }
      );

      // Initial fetch is in progress
      expect(result.current.isLoading).toBe(true);

      // Try to fetch next page while still loading
      // This should be a no-op or handled gracefully
      result.current.fetchNextPage();
      result.current.fetchNextPage();

      // Resolve the initial fetch
      resolveFirstFetch!(createMockResponse());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should only have made one call (initial fetch)
      expect(mockFetcher).toHaveBeenCalledTimes(1);
    });

    it("handles response with page 0 (edge case)", async () => {
      const page0 = createMockResponse({
        page: 0, // Some APIs might return 0-indexed pages
        next_tmdb_page_start: 2,
        results: [
          {
            tmdb_id: 1,
            title: "Page 0 Movie",
            poster_path: null,
            release_date: "2024-01-01",
            vote_average: 8.0,
            user_movie_data: null,
          },
        ],
      });

      const mockFetcher = vi.fn().mockResolvedValue(page0);

      const { result } = renderHook(
        () =>
          useInfiniteMovies({
            queryKey: ["movies", "page-zero"],
            fetcher: mockFetcher,
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should still work correctly
      expect(result.current.movies).toHaveLength(1);
      expect(result.current.hasNextPage).toBe(true);
    });
  });
});
