import {
    fetchNowPlayingMoviesService,
    fetchUpcomingMovies,
    fetchTopRatedMoviesService,
    fetchSearchMoviesService,
    fetchDiscoverMoviesService,
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
    if (pathname.includes("/popular")) {
        return {
            fetcher: (
                page: number,
                filters?: Record<string, string | number | number[]>,
                tmdb_page_start?: number
            ) =>
                fetchDiscoverMoviesService.getPaginated<PaginatedMoviesResponse>({
                    page,
                    sort_by: "popularity.desc",
                    ...filters,
                    ...(tmdb_page_start !== undefined && { tmdb_page_start }),
                }),
            source: PAGINATED_SOURCES.POPULAR,
            title: "Popular",
        };
    }
    if (pathname.includes("/top-rated")) {
        return {
            fetcher: (
                page: number,
                filters?: Record<string, string | number | number[]>,
                tmdb_page_start?: number
            ) =>
                fetchTopRatedMoviesService.getPaginated<PaginatedMoviesResponse>({
                    page,
                    sort_by: "vote_average.desc",
                    ...filters,
                    ...(tmdb_page_start !== undefined && { tmdb_page_start }),
                }),
            source: PAGINATED_SOURCES.TOP_RATED,
            title: "Top Rated",
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
    // Default fallback
    return {
        fetcher: (
            page: number,
            filters?: Record<string, string | number | number[]>,
            tmdb_page_start?: number
        ) =>
            fetchDiscoverMoviesService.getPaginated<PaginatedMoviesResponse>({
                page,
                ...filters,
                ...(tmdb_page_start !== undefined && { tmdb_page_start }),
            }),
        source: PAGINATED_SOURCES.POPULAR,
        title: "Movies",
    };
};
