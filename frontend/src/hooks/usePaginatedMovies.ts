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
 * - Extracts pagination metadata (total_pages, total_results, current page)
 * - Extracts movie results array
 * - Provides structured return value for grid components
 *
 * **Data Flow Position:**
 * ```
 * useMovieFetchRouter → [usePaginatedMovies] → useApiRequest
 * ```
 *
 * **Example:**
 * ```typescript
 * const { movies, total_pages, total_results, isLoading, error } = usePaginatedMovies(
 *   () => routedFetcher(currentPage)
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

	return {
		page,
		total_pages,
		total_results,
		movies,
		error,
		setMovies: setData,
		setError,
		isLoading,
	};
};
