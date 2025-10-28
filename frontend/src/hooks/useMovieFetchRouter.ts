import { useCallback, useRef } from "react";
import type { PaginatedMoviesResponse } from "@/services/movieService";
import type { MovieFilters as MovieFiltersType } from "@/components/movie/filters/AdvancedMovieFilters";
import { mapFiltersToApiParams } from "@/utilities/movieFilterMapper";
import { fetchSearchMoviesService } from "@/services/movieService";

/**
 * Movie Fetch Router Hook
 *
 * **Purpose:** Routes movie fetch requests to the appropriate endpoint based on filter state,
 * automatically switching between search and discover/browse endpoints.
 *
 * **Responsibilities:**
 * - Detects search queries and routes to search endpoint automatically
 * - Maps UI filter state to API parameters via mapFiltersToApiParams
 * - Manages stable references to prevent unnecessary re-renders
 * - Returns a fetcher function compatible with the pagination hooks
 *
 * **Data Flow Position:**
 * ```
 * RouteConfigHelper → [useMovieFetchRouter] → usePaginatedMovies → useApiRequest
 * ```
 *
 * **Example:**
 * ```typescript
 * const routedFetcher = useMovieFetchRouter({
 *   fetcher: discoverMoviesFetcher,  // Base fetcher from routeConfigHelper
 *   filters: { query: 'avatar', genres: [28] },  // UI filter state
 *   filterStyle: 'expanded'
 * });
 *
 * // When filters.query exists → automatically routes to search endpoint
 * // When filters.query is empty → uses provided base fetcher (discover/browse)
 * ```
 *
 * @param options.fetcher - Base fetcher from routeConfigHelper (discover, top-rated, etc.)
 * @param options.filters - Current UI filter state including optional search query
 * @param options.filterStyle - UI filter layout mode (affects parameter mapping)
 * @returns Routed fetcher function that accepts a page number
 */

// Type for fetcher function signature
type FetcherFn = (
	page: number,
	filters?: Record<string, string | number | number[]>,
	tmdb_page_start?: number
) => {
	request: Promise<{ data: PaginatedMoviesResponse }>;
	cancel: () => void;
};

interface UseMovieFetchRouterOptions {
	fetcher: FetcherFn;
	filters: MovieFiltersType;
	filterStyle: "expanded" | "minimal";
}

export function useMovieFetchRouter({
	fetcher,
	filters,
	filterStyle,
}: UseMovieFetchRouterOptions): (page: number, tmdb_page_start?: number) => {
	request: Promise<{ data: PaginatedMoviesResponse }>;
	cancel: () => void;
} {
	// Use refs to store the latest filter values without causing re-renders
	const filtersRef = useRef(filters);
	const filterStyleRef = useRef(filterStyle);
	const baseFetcherRef = useRef(fetcher);

	// Update refs when values change
	filtersRef.current = filters;
	filterStyleRef.current = filterStyle;
	baseFetcherRef.current = fetcher;

	const routedFetcher = useCallback(
		(page: number, tmdb_page_start?: number) => {
			// Get current values from refs
			const currentFilters = filtersRef.current;
			const currentFilterStyle = filterStyleRef.current;
			const currentBaseFetcher = baseFetcherRef.current;

			// Check if there's a search query - if so, use search endpoint instead of base fetcher
			const hasSearchQuery = !!currentFilters.query?.trim();

			// Map UI filters to API parameters
			const filterParams = mapFiltersToApiParams(
				currentFilters,
				currentFilterStyle
			);

			if (hasSearchQuery) {
				// Route to search endpoint
				const query = currentFilters.query;

				// Remove query from filterParams since it's handled separately by search endpoint
				const otherFilters = Object.fromEntries(
					Object.entries(filterParams).filter(([key]) => key !== "query")
				);

				const searchParams = {
					page,
					query,
					...otherFilters,
					...(tmdb_page_start !== undefined && { tmdb_page_start }),
				};

				return fetchSearchMoviesService.getPaginated<PaginatedMoviesResponse>(
					searchParams
				);
			} else {
				// Route to base fetcher (discover, top-rated, etc.)
				return currentBaseFetcher(page, filterParams, tmdb_page_start);
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[filters, filterStyle] // Recreate fetcher when filters change
	);

	return routedFetcher;
}
