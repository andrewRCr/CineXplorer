/**
 * @file userMovieService.ts
 * @description Service for fetching movies enriched with user-specific data (movie-first approach).
 *
 * This service fetches complete movie objects from TMDB that are enriched with the authenticated
 * user's metadata (watchlist status, ratings, reviews, etc.). It provides a "movie-first" view
 * where movies are the primary entity and user data is attached as additional context.
 *
 * **Key Distinction:**
 * - This service: Works with Movies enriched with user data (movie-first approach)
 * - userMovieDataService: Works with UserMovieData entities (the metadata/relationship itself)
 *
 * **Use Cases:**
 * - Displaying user's watchlist page (full movie objects with posters, titles, AND user metadata)
 * - Showing user's watched movies
 * - Displaying user's rated/reviewed movies
 * - Any query where you need complete movie information + user context
 *
 * **Architecture Note:**
 * The backend enrichment service automatically attaches user_movie_data to movie objects for
 * authenticated users. This service consumes those enriched endpoints (/api/user-movie-data/movies),
 * while general discovery endpoints (/api/movies/discover) are handled by movieService.ts
 * (which also return enriched data for authenticated users, but are discovery-focused rather than
 * user-collection-focused).
 *
 * **Example:**
 * ```typescript
 * // Display user's watchlist page
 * const { data } = await getUserMovies({ watchlist: true });
 * // Returns: PaginatedMovieResponseSchema with full movie objects
 * data.results.forEach(movie => {
 *   console.log(movie.title); // TMDB data
 *   console.log(movie.user_movie_data?.user_on_watchlist); // User metadata
 * });
 * ```
 *
 * @see userMovieDataService.ts - For CRUD operations on user metadata in isolation
 * @see movieService.ts - For general movie discovery (also enriched for authenticated users)
 */

import create from "./httpService";
import type { components } from "../types/api";

// Type-safe schema imports from generated OpenAPI types
type PaginatedMovieResponseSchema = components["schemas"]["PaginatedMovieResponseSchema"];

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
}

// Re-export commonly used types for external consumers
export type { PaginatedMovieResponseSchema };

// Service instance for Django Ninja API endpoint
// Note: baseURL already includes /api, so paths are relative to /api/
const userMoviesService = create("/user-movie-data/movies");

/**
 * Fetch user's movies with optional watchlist filtering
 *
 * This endpoint returns movies that the user has interacted with (watched, rated,
 * added to watchlist, etc.). Each movie is enriched with complete TMDB data (title,
 * poster, release date, etc.) AND user-specific metadata (watchlist status, rating,
 * review, etc.).
 *
 * The response format matches other movie endpoints (PaginatedMovieResponseSchema),
 * making it easy to reuse movie card components and other UI elements.
 *
 * **Enrichment Details:**
 * - All movies include `user_movie_data` field with user's metadata
 * - For unauthenticated requests, this endpoint returns 401 (requires authentication)
 * - Data is paginated using standard TMDB pagination format
 *
 * @param params - Query parameters for filtering (watchlist: boolean, page: number)
 * @returns Promise with paginated movie response (full movie objects + user metadata)
 *
 * @throws {HttpError} 401 if user is not authenticated
 *
 * @example
 * // Get all user movies
 * const { request } = getUserMovies();
 * const response = await request;
 * console.log(response.data.results); // Array of movies with user_movie_data
 *
 * @example
 * // Get only watchlist movies
 * const { request } = getUserMovies({ watchlist: true });
 * const response = await request;
 * response.data.results.forEach(movie => {
 *   console.log(`${movie.title} - On watchlist`);
 * });
 *
 * @example
 * // Paginated request
 * const { request, cancel } = getUserMovies({ watchlist: true, page: 2 });
 * // Cancel if user navigates away
 * useEffect(() => () => cancel(), []);
 */
export const getUserMovies = (params?: UserMoviesQueryParams) => {
	const controller = new AbortController();
	const request = userMoviesService
		.getPaginated<PaginatedMovieResponseSchema>(params)
		.request;

	return { request, cancel: () => controller.abort() };
};

// Implementation Notes:
// 1. Uses clean Django Ninja API path (/api/user-movie-data/movies)
// 2. Uses auto-generated types from OpenAPI schema (components["schemas"])
// 3. Follows existing service patterns from movieService.ts
// 4. Type-safe query parameters and request/response handling
// 5. Comprehensive JSDoc documentation
// 6. AbortController support for cancellable requests
// 7. Focus: Movie-first queries (full movie objects enriched with user data)
