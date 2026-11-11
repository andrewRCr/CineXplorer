/** Movie interactions save the requested state with one PATCH by TMDB ID. */
import type { MovieListItem } from "@/types/movie";
import {
    saveUserMovieData,
    type UserMovieDataSchema,
} from "./userMovieDataService";

export async function toggleMovieWatchlist(
    movie: MovieListItem,
    desiredValue: boolean,
): Promise<UserMovieDataSchema> {
    const response = await saveUserMovieData(movie.tmdb_id, {
        user_on_watchlist: desiredValue,
    });
    return response.data;
}

/**
 * Toggle a movie's watched status
 *
 * TODO: Not implemented yet; it rejects.
 * Same pattern as toggleMovieWatchlist but for user_watched field
 *
 * @param _movie - Movie object with optional user_movie_data
 * @returns Promise with updated UserMovieData
 */

export function toggleMovieWatched(
    _movie: MovieListItem,
): Promise<UserMovieDataSchema> {
    // TODO: Implement (same pattern as toggleMovieWatchlist)
    return Promise.reject(new Error("toggleMovieWatched not yet implemented"));
}

/**
 * Toggle a movie's liked status
 *
 * TODO: Not implemented yet; it rejects.
 * Same pattern as toggleMovieWatchlist but for user_liked field
 *
 * @param _movie - Movie object with optional user_movie_data
 * @returns Promise with updated UserMovieData
 */

export function toggleMovieLiked(
    _movie: MovieListItem,
): Promise<UserMovieDataSchema> {
    // TODO: Implement (same pattern as toggleMovieWatchlist)
    return Promise.reject(new Error("toggleMovieLiked not yet implemented"));
}

/**
 * Set a movie's rating
 *
 * TODO: Not implemented yet; it rejects.
 * Opens rating modal/UI, then updates user_rating field
 *
 * @param _movie - Movie object with optional user_movie_data
 * @param _rating - Rating value (1-10)
 * @returns Promise with updated UserMovieData
 */

export function setMovieRating(
    _movie: MovieListItem,
    _rating: number,
): Promise<UserMovieDataSchema> {
    // TODO: Implement (may need UI modal integration)
    return Promise.reject(new Error("setMovieRating not yet implemented"));
}

/**
 * Set a movie's review
 *
 * TODO: Not implemented yet; it rejects.
 * Opens review modal/UI, then updates user_review field
 *
 * @param _movie - Movie object with optional user_movie_data
 * @param _review - Review text
 * @returns Promise with updated UserMovieData
 */

export function setMovieReview(
    _movie: MovieListItem,
    _review: string,
): Promise<UserMovieDataSchema> {
    // TODO: Implement (may need UI modal integration)
    return Promise.reject(new Error("setMovieReview not yet implemented"));
}
