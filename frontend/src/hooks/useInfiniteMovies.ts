import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { PaginatedMoviesResponse, MovieBaseSchema } from "@/@types/movie";

/**
 * Options for useInfiniteMovies hook
 */
export interface UseInfiniteMoviesOptions {
  /**
   * Query key for TanStack Query cache management.
   * Should include all dependencies that affect results (filters, sort, source).
   * Example: ['movies', 'discover', { genre: 'action', sort: 'popularity' }]
   */
  queryKey: unknown[];

  /**
   * Fetcher function that returns paginated movie response.
   * Receives pageParam (tmdb_page_start) for subsequent pages.
   */
  fetcher: (context: {
    pageParam: number | undefined;
  }) => Promise<PaginatedMoviesResponse>;

  /**
   * Whether the query is enabled. Defaults to true.
   */
  enabled?: boolean;
}

/**
 * Return type for useInfiniteMovies hook
 */
export interface UseInfiniteMoviesResult {
  /** Flattened array of movies from all fetched pages */
  movies: MovieBaseSchema[];

  /** Fetch the next page of results */
  fetchNextPage: () => void;

  /** Whether there are more pages to fetch */
  hasNextPage: boolean;

  /** Whether the initial load is in progress */
  isLoading: boolean;

  /** Whether any fetch is in progress (initial or subsequent) */
  isFetching: boolean;

  /** Whether a subsequent page fetch is in progress */
  isFetchingNextPage: boolean;

  /** Error object if the query failed */
  error: Error | null;

  /** Whether the query is in an error state */
  isError: boolean;
}

/**
 * Infinite scroll hook for movie fetching
 *
 * Wraps TanStack Query's useInfiniteQuery with movie-specific logic:
 * - Uses next_tmdb_page_start for cursor-based pagination
 * - Flattens pages into single movies array for consumers
 * - Handles loading, error, and pagination states
 *
 * @example
 * ```typescript
 * const { movies, fetchNextPage, hasNextPage, isLoading } = useInfiniteMovies({
 *   queryKey: ['movies', 'browse', { genre: selectedGenre }],
 *   fetcher: ({ pageParam }) => browseMovies({ tmdb_page_start: pageParam }),
 * });
 * ```
 */
export function useInfiniteMovies({
  queryKey,
  fetcher,
  enabled = true,
}: UseInfiniteMoviesOptions): UseInfiniteMoviesResult {
  const query = useInfiniteQuery({
    queryKey,
    queryFn: fetcher,
    enabled,
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => {
      // Use next_tmdb_page_start as cursor for next page
      // Returns undefined when null/undefined (signals no more pages)
      return lastPage.next_tmdb_page_start ?? undefined;
    },
  });

  // Flatten all pages into single movies array
  const movies = useMemo(() => {
    if (!query.data?.pages) return [];
    return query.data.pages.flatMap((page) => page.results ?? []);
  }, [query.data?.pages]);

  return {
    movies,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage ?? false,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isFetchingNextPage: query.isFetchingNextPage,
    error: query.error,
    isError: query.isError,
  };
}
