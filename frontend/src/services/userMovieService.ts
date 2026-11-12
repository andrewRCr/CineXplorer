/** Paginated Library reads use stored movie cards and the signed-in user's state. */
import create from "./httpService";
import type { components } from "@/types/api";

// Type-safe schema imports from generated OpenAPI types
type MovieListResponseSchema = components["schemas"]["MovieListResponseSchema"];

// Query parameter types for type-safe API calls
export interface UserMoviesQueryParams {
    /**
     * Filter to only watchlist movies
     * When true, only returns movies where user_on_watchlist is true
     */
    watchlist?: boolean;
    /**
     * Page number for pagination
     */
    page?: number;
    page_size?: number;
}

// Re-export commonly used types for external consumers
export type { MovieListResponseSchema };

// Service instance for Django Ninja API endpoint
// Note: baseURL already includes /api, so paths are relative to /api/
const userMoviesService = create("/user-movie-data/movies");

/** Read a database page; page and page_size bound the stored results. */
export const getUserMovies = (params?: UserMoviesQueryParams) => {
    return userMoviesService.getPaginated<MovieListResponseSchema>(params);
};
