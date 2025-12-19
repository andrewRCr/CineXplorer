import { useCallback, useRef } from "react";
import type { MovieListResponse } from "@/services/movieService";
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
 *   browseParams: { genres: [28], sortBy: 'popularity.desc' }
 * });
 * ```
 *
 * @param options.fetcher - Base fetcher from routeConfigHelper (discover, top-rated, etc.)
 * @param options.browseParams - Current UI browse state
 * @returns Fetcher function that accepts a page number
 */

// Type for fetcher function signature
type FetcherFn = (
    page: number,
    params?: Record<string, string | number | number[]>,
    tmdb_page_start?: number
) => {
    request: Promise<{ data: MovieListResponse }>;
    cancel: () => void;
};

interface UseMovieFetchRouterOptions {
    fetcher: FetcherFn;
    browseParams: BrowseParams;
}

export function useMovieFetchRouter({
    fetcher,
    browseParams,
}: UseMovieFetchRouterOptions): (page: number, tmdb_page_start?: number) => {
    request: Promise<{ data: MovieListResponse }>;
    cancel: () => void;
} {
    // Use refs to store the latest values without causing re-renders
    const browseParamsRef = useRef(browseParams);
    const baseFetcherRef = useRef(fetcher);

    // Update refs when values change
    browseParamsRef.current = browseParams;
    baseFetcherRef.current = fetcher;

    const routedFetcher = useCallback(
        (page: number, tmdb_page_start?: number) => {
            // Get current values from refs
            const currentBrowseParams = browseParamsRef.current;
            const currentBaseFetcher = baseFetcherRef.current;

            // Map browse params to API parameters
            const apiParams = mapBrowseParamsToApi(currentBrowseParams);

            // Always use the base fetcher (discover, top-rated, etc.)
            return currentBaseFetcher(page, apiParams, tmdb_page_start);
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [browseParams] // Recreate fetcher when browse params change
    );

    return routedFetcher;
}
