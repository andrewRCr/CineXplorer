/**
 * Movie Interaction Service
 *
 * Pure service functions for managing user interactions with movies
 * (watchlist, watched, liked, rating, review).
 *
 * Architecture:
 * - Layer 1 (this file): Pure functions with business logic
 * - Layer 2 (hooks): State management and UI integration
 * - Layer 3 (components): UI rendering
 *
 * These functions are designed to survive state management migrations
 * (e.g., TanStack Query in Frontend Modernization) and serve as the
 * stable API between the backend and UI layers.
 *
 * Backend Integration Notes:
 * - CREATE: POST /api/user-movie-data with movie_id (expects TMDB ID, not database ID)
 * - UPDATE: PATCH /api/user-movie-data/{id} with partial fields
 * - Backend uses get_or_create pattern (returns 400 if entry already exists)
 *
 * Related Services:
 * - userMovieDataService.ts: Low-level CRUD operations (isolation pattern)
 * - userMovieService.ts: Movie-first queries with enrichment
 */

import type { Movie } from '../@types/movie.d';
import type { components } from '../types/api';
import {
    createUserMovieData,
    updateUserMovieData,
    getUserMovieDataByTmdbId,
} from './userMovieDataService';

type UserMovieDataDetailSchema = components['schemas']['UserMovieDataDetailSchema'];
type UserMovieDataCreateSchema = components['schemas']['UserMovieDataCreateSchema'];
type UserMovieDataUpdateSchema = components['schemas']['UserMovieDataUpdateSchema'];

/**
 * Type guard for API errors with status codes
 */
interface ApiError extends Error {
    status?: number;
}

function isApiError(error: unknown): error is ApiError {
    return error instanceof Error && 'status' in error;
}

/**
 * Toggle a movie's watchlist status
 *
 * Logic:
 * - If movie.user_movie_data is null → CREATE new entry with watchlist=true
 * - If movie.user_movie_data exists → UPDATE (toggle current watchlist value)
 *
 * Edge Case Handling:
 * - 400 "already exists" error (race condition): Fetch current data and retry with UPDATE
 *
 * @param movie - Movie object with optional user_movie_data
 * @returns Promise with updated UserMovieData
 * @throws Error if API call fails (network, validation, etc.)
 *
 * @example
 * // Add to watchlist (movie without user data)
 * const result = await toggleMovieWatchlist(movie);
 *
 * @example
 * // Remove from watchlist (movie already on watchlist)
 * const result = await toggleMovieWatchlist(movieWithData);
 */
export async function toggleMovieWatchlist(
    movie: Movie
): Promise<UserMovieDataDetailSchema> {
    // Case 1: No existing user data → CREATE
    if (!movie.user_movie_data) {
        const createPayload: UserMovieDataCreateSchema = {
            movie_id: movie.tmdb_id, // Backend expects TMDB ID as movie_id
            user_on_watchlist: true,
            user_watched: false,
            user_liked: false,
            user_rating: null,
            user_review: null,
        };

        try {
            const response = await createUserMovieData(createPayload);
            return response.data;
        } catch (error: unknown) {
            // Handle race condition: Another request created the entry
            if (isApiError(error) && error.status === 400) {
                if (error.message.includes('already exists')) {
                    // Fetch the existing data and retry with UPDATE
                    const { request } = getUserMovieDataByTmdbId({ tmdb_id: movie.tmdb_id });
                    const existingDataResponse = await request;
                    const updateResponse = await updateUserMovieData(existingDataResponse.data.id!, {
                        user_on_watchlist: true,
                    });
                    return updateResponse.data;
                }
            }
            // Re-throw other errors
            throw error;
        }
    }

    // Case 2: Existing user data → UPDATE (toggle)
    const currentWatchlistStatus = movie.user_movie_data.user_on_watchlist;
    const updatePayload: UserMovieDataUpdateSchema = {
        user_on_watchlist: !currentWatchlistStatus,
    };

    const response = await updateUserMovieData(movie.user_movie_data.id!, updatePayload);
    return response.data;
}

/**
 * Toggle a movie's watched status
 *
 * TODO: Implement in future expansion (API Layer P2)
 * Same pattern as toggleMovieWatchlist but for user_watched field
 *
 * @param _movie - Movie object with optional user_movie_data
 * @returns Promise with updated UserMovieData
 */
 
export async function toggleMovieWatched(
    _movie: Movie
): Promise<UserMovieDataDetailSchema> {
    // TODO: Implement (same pattern as toggleMovieWatchlist)
    throw new Error('toggleMovieWatched not yet implemented');
}

/**
 * Toggle a movie's liked status
 *
 * TODO: Implement in future expansion (API Layer P2)
 * Same pattern as toggleMovieWatchlist but for user_liked field
 *
 * @param _movie - Movie object with optional user_movie_data
 * @returns Promise with updated UserMovieData
 */
 
export async function toggleMovieLiked(
    _movie: Movie
): Promise<UserMovieDataDetailSchema> {
    // TODO: Implement (same pattern as toggleMovieWatchlist)
    throw new Error('toggleMovieLiked not yet implemented');
}

/**
 * Set a movie's rating
 *
 * TODO: Implement in future expansion (API Layer P2)
 * Opens rating modal/UI, then updates user_rating field
 *
 * @param _movie - Movie object with optional user_movie_data
 * @param _rating - Rating value (1-10)
 * @returns Promise with updated UserMovieData
 */
 
export async function setMovieRating(
    _movie: Movie,
    _rating: number
): Promise<UserMovieDataDetailSchema> {
    // TODO: Implement (may need UI modal integration)
    throw new Error('setMovieRating not yet implemented');
}

/**
 * Set a movie's review
 *
 * TODO: Implement in future expansion (API Layer P2)
 * Opens review modal/UI, then updates user_review field
 *
 * @param _movie - Movie object with optional user_movie_data
 * @param _review - Review text
 * @returns Promise with updated UserMovieData
 */
 
export async function setMovieReview(
    _movie: Movie,
    _review: string
): Promise<UserMovieDataDetailSchema> {
    // TODO: Implement (may need UI modal integration)
    throw new Error('setMovieReview not yet implemented');
}
