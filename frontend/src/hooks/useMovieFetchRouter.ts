import { useCallback, useRef } from "react";
import type { PaginatedMoviesResponse } from "@/services/movieService";
import type { BrowseParams } from "@/types/browseTypes";
import { mapBrowseParamsToApi } from "@/utilities/browseParamMapper";

/**
 * Movie Fetch Router Hook
 *
 * **Purpose:** Wraps movie fetchers with browse parameter mapping, providing a
 * consistent interface for the pagination hooks.
 *
 * **Responsibilities:**
 * - Maps UI browse state to API parameters via mapBrowseParamsToApi
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
 *   browseParams: { genres: [28], sortBy: 'popularity.desc' },
 *   browseLayout: 'expanded'
 * });
 * ```
 *
 * @param options.fetcher - Base fetcher from routeConfigHelper (discover, top-rated, etc.)
 * @param options.filters - Current UI browse state
 * @param options.filterStyle - UI browse layout mode (affects parameter mapping)
 * @returns Fetcher function that accepts a page number
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
    filters: BrowseParams;
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
            const currentBrowseParams = filtersRef.current;
            const currentBrowseLayout = filterStyleRef.current;
            const currentBaseFetcher = baseFetcherRef.current;

            // Map browse params to API parameters
            const apiParams = mapBrowseParamsToApi(
                currentBrowseParams,
                currentBrowseLayout
            );

            // Always use the base fetcher (discover, top-rated, etc.)
            return currentBaseFetcher(page, apiParams, tmdb_page_start);
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [filters, filterStyle] // Recreate fetcher when browse params change
    );

    return routedFetcher;
}
