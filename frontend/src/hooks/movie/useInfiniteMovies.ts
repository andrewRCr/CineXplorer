import {
    useInfiniteQuery,
    type InfiniteData,
    type QueryKey,
    type UseInfiniteQueryResult,
} from "@tanstack/react-query";
import { useMemo } from "react";
import type { MovieListResponse, MovieListItem } from "@/types/movie";

/**
 * Options for useInfiniteMovies hook
 */
export interface UseInfiniteMoviesOptions {
    /**
     * Query key for TanStack Query cache management.
     * Should include all dependencies that affect results (filters, sort, source).
     * Example: ['movies', 'discover', { genre: 'action', sort: 'popularity' }]
     */
    queryKey: QueryKey;

    /**
     * Fetcher function that returns paginated movie response.
     * Receives pageParam (tmdb_page_start) for subsequent pages.
     */
    fetcher: (context: {
        pageParam: number | undefined;
    }) => Promise<MovieListResponse>;

    /**
     * Whether the query is enabled. Defaults to true.
     */
    enabled?: boolean;
}

/**
 * Return type for useInfiniteMovies hook
 */
type MovieInfiniteQueryResult = UseInfiniteQueryResult<
    InfiniteData<MovieListResponse>,
    Error
>;

export interface UseInfiniteMoviesResult {
    /** Flattened array of movies from all fetched pages */
    movies: MovieListItem[];

    /** Raw pages array from TanStack Query (for sequential/discrete page access) */
    pages: MovieListResponse[];

    /** Total number of fetched pages */
    pageCount: number;

    /** Total results from API (from first page response) */
    totalResults: number | undefined;

    /** Fetch the next page of results */
    fetchNextPage: MovieInfiniteQueryResult["fetchNextPage"];

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

    /** Refetch the query */
    refetch: MovieInfiniteQueryResult["refetch"];
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

    const queryPages = query.data?.pages;

    // Flatten all pages into single movies array (for infinite scroll)
    const movies = useMemo(() => {
        if (!queryPages) return [];
        return queryPages.flatMap((page) => page.results ?? []);
    }, [queryPages]);

    // Raw pages array (for sequential/discrete page access)
    const pages = useMemo(() => {
        return queryPages ?? [];
    }, [queryPages]);

    // Total results from first page (consistent across all pages)
    const totalResults = pages[0]?.total_results;

    return {
        movies,
        pages,
        pageCount: pages.length,
        totalResults,
        fetchNextPage: query.fetchNextPage,
        hasNextPage: query.hasNextPage ?? false,
        isLoading: query.isLoading,
        isFetching: query.isFetching,
        isFetchingNextPage: query.isFetchingNextPage,
        error: query.error,
        isError: query.isError,
        refetch: query.refetch,
    };
}
