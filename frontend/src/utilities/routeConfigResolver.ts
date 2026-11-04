import {
    fetchNowPlayingMoviesService,
    fetchUpcomingMovies,
    fetchSearchMoviesService,
    fetchBrowseMoviesService,
    type MovieListResponse,
} from "@/services/movieService";
import { PAGINATED_SOURCES } from "@/constants/routes";
import { parseSearchParamsFromUrl } from "./searchUrlSync";

export interface RouteConfig {
    fetcher: (
        page: number,
        filters?: Record<string, string | number | number[]>,
        tmdb_page_start?: number,
    ) => {
        request: Promise<{ data: MovieListResponse }>;
        cancel: () => void;
    };
    source: string;
    title: string | { main: string; secondary?: string };
}

/**
 * Get fetcher and source configuration based on route
 *
 * @param pathname - The current route pathname (e.g., '/search', '/browse')
 * @param search - Optional URL search string from React Router location.
 *                 If provided, used to extract query param for search route.
 *                 If omitted, falls back to window.location.search (backward compatibility).
 * @returns RouteConfig with fetcher, source identifier, and title
 */
export const getFetcherAndSource = (
    pathname: string,
    search?: string,
): RouteConfig => {
    // Get query parameter for search - prefer provided search string over window.location
    const getQueryParam = () => {
        // Use provided search string if available (from React Router)
        if (search !== undefined) {
            return parseSearchParamsFromUrl(search).query;
        }
        // Fallback to window.location for backward compatibility
        if (typeof window === "undefined") return "";
        return parseSearchParamsFromUrl(window.location.search).query;
    };

    if (pathname.includes("/now-playing")) {
        return {
            fetcher: (
                page: number,
                filters?: Record<string, string | number | number[]>,
                tmdb_page_start?: number,
            ) =>
                fetchNowPlayingMoviesService.getPaginated<MovieListResponse>({
                    page,
                    ...filters,
                    ...(tmdb_page_start !== undefined && { tmdb_page_start }),
                }),
            source: PAGINATED_SOURCES.NOW_PLAYING,
            title: "Now Playing",
        };
    }
    if (pathname.includes("/upcoming")) {
        return {
            fetcher: (
                page: number,
                filters?: Record<string, string | number | number[]>,
                tmdb_page_start?: number,
            ) =>
                fetchUpcomingMovies().getPaginated<MovieListResponse>({
                    page,
                    ...filters,
                    ...(tmdb_page_start !== undefined && { tmdb_page_start }),
                }),
            source: PAGINATED_SOURCES.UPCOMING,
            title: "Upcoming",
        };
    }
    // Browse route - exact match for /browse path
    // (not /browse/now-playing or /browse/upcoming which are handled above)
    if (pathname === "/browse" || pathname.endsWith("/browse")) {
        return {
            fetcher: (
                page: number,
                filters?: Record<string, string | number | number[]>,
                tmdb_page_start?: number,
            ) =>
                fetchBrowseMoviesService.getPaginated<MovieListResponse>({
                    page,
                    ...filters,
                    ...(tmdb_page_start !== undefined && { tmdb_page_start }),
                }),
            source: PAGINATED_SOURCES.BROWSE,
            title: "Browse",
        };
    }
    if (pathname.includes("/search")) {
        const query = getQueryParam();
        return {
            fetcher: (
                page: number,
                filters?: Record<string, string | number | number[]>,
                tmdb_page_start?: number,
            ) =>
                fetchSearchMoviesService.getPaginated<MovieListResponse>({
                    page,
                    ...filters,
                    // Query from search param takes precedence over filters.query
                    // This ensures the URL is the source of truth for search queries
                    query,
                    ...(tmdb_page_start !== undefined && { tmdb_page_start }),
                }),
            source: PAGINATED_SOURCES.SEARCH,
            title: {
                main: "Search Results",
                secondary: query ? ` for "${query}"` : undefined,
            },
        };
    }
    // Default fallback - use browse endpoint
    return {
        fetcher: (
            page: number,
            filters?: Record<string, string | number | number[]>,
            tmdb_page_start?: number,
        ) =>
            fetchBrowseMoviesService.getPaginated<MovieListResponse>({
                page,
                ...filters,
                ...(tmdb_page_start !== undefined && { tmdb_page_start }),
            }),
        source: PAGINATED_SOURCES.BROWSE,
        title: "Browse",
    };
};
