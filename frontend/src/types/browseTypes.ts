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
 * - query: Search text (reserved for future use - currently unused in browse flow)
 * - genres: Array of TMDB genre IDs (empty = all genres)
 * - minYear/maxYear: Year range filter (empty string = no constraint)
 * - minRating/maxRating: Rating range filter (empty string = no constraint)
 * - sortBy: Sort order for results
 * - language: ISO 639-1 language code (empty string = all languages)
 *
 * All string fields use empty string ("") as the "not set" value.
 * Array fields use empty array ([]) as the "not set" value.
 */
export interface BrowseParams {
  query: string;
  genres: number[];
  minYear: string;
  maxYear: string;
  minRating: string;
  maxRating: string;
  sortBy: SortOptionValue;
  language: string;
}
