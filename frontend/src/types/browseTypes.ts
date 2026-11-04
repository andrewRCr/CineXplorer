/**
 * Browse Domain Types - Single source of truth for browse/filter state
 *
 * This file defines the core types for the movie browsing feature, including:
 * - BrowseParams: The umbrella type for all browse state (filters, sort, search)
 * - SortOptionValue: Valid sort values accepted by TMDB API
 * - SortOption: UI option structure for sort dropdowns
 *
 * Terminology Note:
 * "Browse params" encompasses all user-controlled state for movie discovery:
 * search query, genre/year/rating filters, sort order, and language preference.
 * This is distinct from pagination, which is handled separately.
 */

/**
 * Valid sort option values for TMDB movie discovery API
 *
 * Only includes meaningful sort directions:
 * - popularity.asc removed (produces garbage results - untracked movies)
 * - vote_average.asc removed (produces garbage results - unrated movies)
 * - original_title.desc removed (Z-A broken for Latin languages due to Unicode ordering)
 */
export type SortOptionValue =
    | "popularity.desc"
    | "vote_average.desc"
    | "release_date.desc"
    | "release_date.asc"
    | "original_title.asc";

/**
 * Sort option for UI dropdowns
 */
export interface SortOption {
    value: SortOptionValue;
    label: string;
}

/**
 * Browse parameters - complete state for movie browsing UI
 *
 * Fields:
 * - genres: Array of TMDB genre IDs (empty = all genres)
 * - minYear/maxYear: Year range filter (empty string = no constraint)
 * - minRating/maxRating: Rating range filter (empty string = no constraint)
 * - sortBy: Sort order for results
 * - language: ISO 639-1 language code (empty string = all languages)
 * - certifications: Array of US MPAA ratings to filter by (empty = all ratings)
 *
 * Note: Search query is NOT part of BrowseParams. Search flows through a separate
 * path (URL ?query= → searchQuery memo → context.query) to avoid key mismatches
 * between scroll save/restore operations.
 *
 * All string fields use empty string ("") as the "not set" value.
 * Array fields use empty array ([]) as the "not set" value.
 */
export interface BrowseParams {
    genres: number[];
    minYear: string;
    maxYear: string;
    minRating: string;
    maxRating: string;
    sortBy: SortOptionValue;
    language: string;
    certifications: string[];
}

/**
 * BrowseParams keys as a runtime array - coupled to interface via type checks.
 *
 * Used for URL parameter filtering (preserving non-browse params).
 * Compile-time checks ensure this stays in sync with BrowseParams interface.
 */
export const BROWSE_PARAM_KEYS = [
    "genres",
    "minYear",
    "maxYear",
    "minRating",
    "maxRating",
    "sortBy",
    "language",
    "certifications",
] as const satisfies readonly (keyof BrowseParams)[];

// Compile-time check: error if any BrowseParams key is missing from array
type _AssertKeysComplete =
    Exclude<
        keyof BrowseParams,
        (typeof BROWSE_PARAM_KEYS)[number]
    > extends never
        ? true
        : "Missing keys in BROWSE_PARAM_KEYS";
const _assertKeysComplete: _AssertKeysComplete = true;
void _assertKeysComplete; // Prevent unused variable warning
