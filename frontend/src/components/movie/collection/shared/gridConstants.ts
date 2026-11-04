/**
 * Shared constants for movie grid components.
 *
 * These values are used across VirtualizedMovieGrid and SequentialMovieGrid
 * to ensure consistent sizing and layout.
 */

import { type MovieListItem } from "@/types/movie";

/** Card width in pixels. Used for column count calculation and grid template. */
export const CARD_WIDTH = 194;

/** Gap between grid items in pixels. */
export const GAP = 16;

/** Number of skeleton cards to show during initial loading. */
export const SKELETON_COUNT = 20;

/**
 * Placeholder movie for skeleton loading state.
 * Uses MovieListItem shape (genre_ids, not genres) to match API response.
 */
export const placeholderMovie: MovieListItem = {
    tmdb_id: 0,
    title: "Loading Movie Title",
    release_date: "2000-01-01",
    poster_path: "",
    vote_average: 0,
    overview: "Loading overview...",
    genre_ids: [],
    runtime: 0,
};

/**
 * Calculates how many cards fit per row based on container width.
 * Accounts for gap between cards.
 *
 * Formula: (containerWidth + GAP) / (CARD_WIDTH + GAP)
 * Each card needs CARD_WIDTH + GAP, except the last card in row.
 */
export const calculateColumnCount = (containerWidth: number): number => {
    if (containerWidth <= 0) return 1;
    return Math.max(1, Math.floor((containerWidth + GAP) / (CARD_WIDTH + GAP)));
};
