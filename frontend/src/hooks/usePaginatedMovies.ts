import { useApiRequest } from "./useApiRequest";
import { useMemo } from "react";
import { type PaginatedMoviesResponse } from "@/types/movie";

/**
 * Paginated Movies Hook
 *
 * **Purpose:** Extracts and structures paginated movie data from API responses.
 *
 * **Responsibilities:**
 * - Calls useApiRequest to execute the fetch
 * - Extracts pagination metadata (total_pages, total_results, current page, next_tmdb_page_start)
 * - Extracts movie results array
 * - Provides structured return value for grid components
 *
 * **Smart Buffer Pagination:**
 * - `next_tmdb_page_start`: Tracks TMDB page to fetch next (for smart buffer continuation)
 * - Enables accurate pagination when buffer consumes multiple TMDB pages per API page
 * - Parent components should pass this value as `tmdb_page_start` in next request
 *
 * **Data Flow Position:**
 * ```
 * useMovieFetchRouter → [usePaginatedMovies] → useApiRequest
 * ```
 *
 * **Example:**
 * ```typescript
 * const { movies, total_pages, total_results, next_tmdb_page_start, isLoading, error } = usePaginatedMovies(
 *   () => routedFetcher(currentPage, next_tmdb_page_start)
 * );
 * ```
 *
 * @param fetchFn - Fetcher function that returns paginated response (typically from useMovieFetchRouter)
 * @returns Structured object with movies array, pagination data, loading/error states
 */

type FetchArrayFn = () => {
	request: Promise<{ data: PaginatedMoviesResponse }>;
	cancel: () => void;
};

export const usePaginatedMovies = (fetchFn: FetchArrayFn) => {
	// Memoize fetcher to ensure stable reference for useApiRequest
	const stableFetcher = useMemo(() => {
		return fetchFn;
	}, [fetchFn]);

	const { data, error, setData, setError, isLoading } =
		useApiRequest<PaginatedMoviesResponse>(stableFetcher);

	// Extract pagination info and movies array
	const movies = isLoading ? [] : data?.results ?? [];
	const total_pages = data?.total_pages ?? 1;
	const total_results = data?.total_results ?? movies.length;
	const page = data?.page; // Don't provide default when data is undefined
	const next_tmdb_page_start = data?.next_tmdb_page_start; // Smart buffer metadata (undefined if not present)

	return {
		page,
		total_pages,
		total_results,
		next_tmdb_page_start,
		movies,
		error,
		setMovies: setData,
		setError,
		isLoading,
	};
};
