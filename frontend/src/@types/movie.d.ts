/**
 * Movie Types
 *
 * Type aliases from auto-generated API types (Django Ninja OpenAPI).
 * Uses semantic names that reflect frontend usage context.
 *
 * Type Architecture:
 * - MovieListItem: Used in grids, lists, cards (browse, search, discover endpoints)
 * - MovieDetail: Used on movie detail pages (single movie endpoint)
 *
 * Key difference: MovieListItem has `genre_ids: number[]`, MovieDetail has
 * `genres: GenreSchema[]`. This mirrors TMDB's API design where list endpoints
 * return compact data and detail endpoints return full objects.
 */

import type { components } from '../types/api';

// ============================================================================
// Core Movie Types
// ============================================================================

/**
 * Movie data for list/grid views (browse, search, discover endpoints).
 * Contains compact representation with genre_ids (not full genre objects).
 */
export type MovieListItem = components['schemas']['MovieBaseSchema'];

/**
 * Full movie data for detail pages (single movie endpoint).
 * Contains complete data including genres, cast, crew, etc.
 */
export type MovieDetail = components['schemas']['MovieDetailSchema'];

// ============================================================================
// Pagination Types
// ============================================================================

/**
 * Paginated response wrapper for movie list endpoints.
 * Contains results as MovieListItem[] (not MovieDetail[]).
 */
export type PaginatedMoviesResponse = components['schemas']['PaginatedMovieResponseSchema'];

// ============================================================================
// Supporting Types
// ============================================================================

export type Genre = components['schemas']['GenreSchema'];
export type CastMember = components['schemas']['CastMemberSchema'];
export type CrewMember = components['schemas']['CrewMemberSchema'];
export type ProductionCompany = components['schemas']['ProductionCompanySchema'];
export type SpokenLanguage = components['schemas']['SpokenLanguageSchema'];
export type UserMovieData = components['schemas']['UserMovieDataSchema'];
export type Keyword = components['schemas']['KeywordSchema'];
export type Person = components['schemas']['PersonSchema'];
export type PaginatedKeywordResponse = components['schemas']['PaginatedKeywordResponseSchema'];
export type PaginatedPersonResponse = components['schemas']['PaginatedPersonResponseSchema'];

// ============================================================================
// Response Types
// ============================================================================

export interface GenresResponse {
  genres: Genre[];
}

export interface Credits {
  cast: CastMember[];
  crew: CrewMember[];
}

// ============================================================================
// Deprecated Aliases (for migration - remove after all usages updated)
// ============================================================================

/**
 * @deprecated Use MovieListItem for list views or MovieDetail for detail pages
 */
export type Movie = MovieListItem;

/**
 * @deprecated Use MovieListItem instead
 */
export type MovieBaseSchema = MovieListItem;

/**
 * @deprecated Use MovieDetail instead
 */
export type MovieDetailSchema = MovieDetail;