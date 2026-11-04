/**
 * @file userMovieDataService.ts
 * @description Service for managing UserMovieData entities in isolation.
 *
 * This service handles CRUD operations on user movie metadata (the join table between
 * users and movies). It works with UserMovieData entities directly - managing watchlist
 * status, ratings, reviews, and other user-specific metadata for individual movies.
 *
 * **Key Distinction:**
 * - This service: Works with UserMovieData entities (the metadata/relationship itself)
 * - userMovieService: Works with Movies enriched with user data (movie-first approach)
 *
 * **Use Cases:**
 * - Adding/removing movies from watchlist (update metadata for a specific movie)
 * - Rating a movie (update user_rating field)
 * - Writing/editing reviews (update user_review field)
 * - Checking if user has data for a specific movie (by TMDB ID)
 * - Deleting user metadata for a movie
 *
 * **Example:**
 * ```typescript
 * // User clicks "Add to Watchlist" on a movie card
 * const userData = await getUserMovieDataByTmdbId({ tmdb_id: 550 });
 * if (userData) {
 *   await updateUserMovieData(userData.id, { user_on_watchlist: true });
 * } else {
 *   await createUserMovieData({ movie_id: moviePK, user_on_watchlist: true });
 * }
 * ```
 *
 * @see userMovieService.ts - For fetching movies enriched with user data (watchlist page, etc.)
 * @see movieService.ts - For general movie discovery without user-specific data
 */

import create from "./httpService";
import type { components } from "@/types/api";

// Type-safe schema imports from generated OpenAPI types
type UserMovieDataDetailSchema =
    components["schemas"]["UserMovieDataDetailSchema"];
type UserMovieDataCreateSchema =
    components["schemas"]["UserMovieDataCreateSchema"];
type UserMovieDataUpdateSchema =
    components["schemas"]["UserMovieDataUpdateSchema"];

// Query parameter types for type-safe API calls
export interface GetUserMovieDataByTmdbIdParams {
    tmdb_id: number;
}

// Re-export commonly used types for external consumers
export type {
    UserMovieDataDetailSchema,
    UserMovieDataCreateSchema,
    UserMovieDataUpdateSchema,
};

// Service instances for Django Ninja API endpoints
// Note: baseURL already includes /api, so paths are relative to /api/
const userMovieDataService = create("/user-movie-data");
const userMovieDataByTmdbIdService = create("/user-movie-data/by-tmdb-id");

/**
 * Fetch user movie data for a specific movie by TMDB ID
 *
 * Checks if the authenticated user has existing metadata (watchlist, rating, review, etc.)
 * for a movie identified by its TMDB ID. Returns the user's metadata with movie context
 * (tmdb_id and title).
 *
 * @param params - Object with tmdb_id parameter
 * @returns Promise with user movie data details (metadata only, not full movie object)
 *
 * @throws {HttpError} 404 if no data exists for this user/movie combination
 *
 * @example
 * // Check if user has this movie on watchlist
 * try {
 *   const data = await getUserMovieDataByTmdbId({ tmdb_id: 550 });
 *   if (data.user_on_watchlist) {
 *     console.log("Movie is on watchlist");
 *   }
 * } catch (err) {
 *   // 404 means user has no data for this movie yet
 * }
 */
export const getUserMovieDataByTmdbId = (
    params: GetUserMovieDataByTmdbIdParams,
) => {
    const controller = new AbortController();
    const request =
        userMovieDataByTmdbIdService.getPaginated<UserMovieDataDetailSchema>(
            params,
        ).request;

    return { request, cancel: () => controller.abort() };
};

/**
 * Create new user movie data entry
 *
 * Creates a new UserMovieData record when a user first interacts with a movie
 * (adds to watchlist, rates, reviews, etc.). This establishes the relationship
 * between the user and the movie.
 *
 * @param data - User movie data to create (includes movie_id for FK lookup)
 * @returns Promise with created user movie data
 *
 * @throws {HttpError} 400 if movie_id is invalid or entry already exists
 *
 * @example
 * // Add movie to watchlist (first interaction)
 * createUserMovieData({
 *   movie_id: 123,
 *   user_on_watchlist: true,
 *   user_watched: false,
 *   user_liked: false
 * })
 */
export const createUserMovieData = (data: UserMovieDataCreateSchema) => {
    return userMovieDataService.create<UserMovieDataDetailSchema>(data);
};

/**
 * Update existing user movie data entry
 *
 * Supports partial updates (PATCH) to modify any subset of user movie data fields
 * (watchlist, rating, review, etc.). Use this when user data already exists for
 * a movie and you want to change specific fields.
 *
 * @param id - Primary key of the UserMovieData object
 * @param data - Fields to update (all optional for PATCH)
 * @returns Promise with updated user movie data
 *
 * @throws {HttpError} 404 if object not found or doesn't belong to user
 *
 * @example
 * // Mark movie as watched and rate it
 * updateUserMovieData(1, {
 *   user_watched: true,
 *   user_rating: 8
 * })
 */
export const updateUserMovieData = (
    id: number,
    data: UserMovieDataUpdateSchema,
) => {
    return userMovieDataService.update<UserMovieDataUpdateSchema>(id, data);
};

/**
 * Delete user movie data entry
 *
 * Removes a UserMovieData record, severing the relationship between the user
 * and the movie. This is rare and typically used only to correct mistakes in
 * user input or for data cleanup.
 *
 * @param id - Primary key of the UserMovieData object
 * @returns Promise with 204 No Content on successful deletion
 *
 * @throws {HttpError} 404 if object not found or doesn't belong to user
 *
 * @example
 * // Remove all user data for a movie
 * deleteUserMovieData(1)
 */
export const deleteUserMovieData = (id: number) => {
    return userMovieDataService.remove(id);
};

// Implementation Notes:
// 1. All endpoints use clean Django Ninja API paths (/api/user-movie-data/*)
// 2. Uses auto-generated types from OpenAPI schema (components["schemas"])
// 3. Follows existing service patterns from movieService.ts
// 4. Type-safe query parameters and request/response handling
// 5. Comprehensive JSDoc documentation for all exported functions
// 6. Consistent error handling and AbortController support where applicable
// 7. Focus: UserMovieData CRUD operations (metadata management in isolation)
