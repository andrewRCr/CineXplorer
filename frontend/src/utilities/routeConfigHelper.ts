import {
    fetchNowPlayingMoviesService,
    fetchUpcomingMovies,
    fetchSearchMoviesService,
    fetchBrowseMoviesService,
    type PaginatedMoviesResponse,
} from "@/services/movieService";
import { PAGINATED_SOURCES } from "@/constants/routes";

export interface RouteConfig {
    fetcher: (
        page: number,
        filters?: Record<string, string | number | number[]>,
        tmdb_page_start?: number
    ) => {
        request: Promise<{ data: PaginatedMoviesResponse }>;
        cancel: () => void;
    };
    source: string;
    title: string | { main: string; secondary?: string };
}

// Helper function to get fetcher and source based on route
export const getFetcherAndSource = (pathname: string): RouteConfig => {
    // Get query parameter for search
    const getQueryParam = () => {
        if (typeof window === "undefined") return "";
        const params = new URLSearchParams(window.location.search);
        return params.get("query") || "";
    };

    if (pathname.includes("/now-playing")) {
        return {
            fetcher: (
                page: number,
                filters?: Record<string, string | number | number[]>,
                tmdb_page_start?: number
            ) =>
                fetchNowPlayingMoviesService.getPaginated<PaginatedMoviesResponse>({
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
                tmdb_page_start?: number
            ) =>
                fetchUpcomingMovies().getPaginated<PaginatedMoviesResponse>({
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
                tmdb_page_start?: number
            ) =>
                fetchBrowseMoviesService.getPaginated<PaginatedMoviesResponse>({
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
                tmdb_page_start?: number
            ) =>
                fetchSearchMoviesService.getPaginated<PaginatedMoviesResponse>({
                    page,
                    query,
                    ...filters,
                    ...(tmdb_page_start !== undefined && { tmdb_page_start }),
                }),
            source: PAGINATED_SOURCES.SEARCH,
            title: {
                main: "Search Results",
                secondary: query ? ` for "${query}"` : undefined
            },
        };
    }
    // Default fallback - use browse endpoint
    return {
        fetcher: (
            page: number,
            filters?: Record<string, string | number | number[]>,
            tmdb_page_start?: number
        ) =>
            fetchBrowseMoviesService.getPaginated<PaginatedMoviesResponse>({
                page,
                ...filters,
                ...(tmdb_page_start !== undefined && { tmdb_page_start }),
            }),
        source: PAGINATED_SOURCES.BROWSE,
        title: "Browse",
    };
};
