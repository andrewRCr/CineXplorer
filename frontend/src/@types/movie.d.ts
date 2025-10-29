/**
 * Frontend-specific movie types and re-exports from auto-generated API types
 *
 * This file imports auto-generated API types from Django Ninja OpenAPI
 * and provides type aliases and frontend-specific extensions.
 */

import type { components } from '../types/api';

// ============================================================================
// Type Aliases from Auto-Generated API Types
// ============================================================================

// Core types directly from backend schemas
export type MovieDetailSchema = components['schemas']['MovieDetailSchema'];
export type MovieBaseSchema = components['schemas']['MovieBaseSchema'];
export type Genre = components['schemas']['GenreSchema'];
export type CastMember = components['schemas']['CastMemberSchema'];
export type CrewMember = components['schemas']['CrewMemberSchema'];
export type ProductionCompany = components['schemas']['ProductionCompanySchema'];
export type UserMovieData = components['schemas']['UserMovieDataSchema'];

// Pagination types
export type PaginatedMoviesResponse = components['schemas']['PaginatedMovieResponseSchema'];

// Supporting types
export type Keyword = components['schemas']['KeywordSchema'];
export type Person = components['schemas']['PersonSchema'];
export type PaginatedKeywordResponse = components['schemas']['PaginatedKeywordResponseSchema'];
export type PaginatedPersonResponse = components['schemas']['PaginatedPersonResponseSchema'];

// ============================================================================
// Extended Movie Type with Frontend Fields
// ============================================================================

/**
 * Extended Movie type that includes all backend fields plus additional
 * frontend-required fields from TMDB API
 */
export interface Movie extends MovieDetailSchema {
  // Additional fields that frontend expects from TMDB API
  backdrop_path?: string | null;
  vote_count?: number | null;
  popularity?: number;
  original_language?: string;
  original_title?: string;
  adult?: boolean;
  video?: boolean;
}

/**
 * Base movie type for list views
 */
export interface MovieBase extends MovieBaseSchema {
  // Additional fields for list views if needed
  backdrop_path?: string | null;
}

// ============================================================================
// Response Type Aliases for API Endpoints
// ============================================================================

// Genre endpoint response
export interface GenresResponse {
  genres: Genre[];
}

// Credits type (for potential future use)
export interface Credits {
  cast: CastMember[];
  crew: CrewMember[];
}

// ============================================================================
// Frontend-Specific Types
// ============================================================================

/**
 * Frontend-specific filter types for UI state management
 * (Different from backend API parameters)
 */
export interface MovieFilters {
  query: string;
  genres: number[];
  minYear: string;
  maxYear: string;
  minRating: string;
  maxRating: string;
  minRuntime: string;
  maxRuntime: string;
  sortBy: string;
}

// Note: For API parameter types, use MovieQueryParams from services/movieService.ts
// which provides proper typing for all API filter parameters

// ============================================================================
// Backward Compatibility Notes
// ============================================================================

/**
 * Migration Notes:
 *
 * The following changes were made when migrating to auto-generated types:
 *
 * 1. `Movie` extends `MovieDetailSchema` with additional TMDB fields
 * 2. `MovieBase` extends `MovieBaseSchema` for list views
 * 3. All types now use snake_case consistently (e.g., tmdb_id, poster_path)
 * 4. Optional fields are properly marked with `| null` or `| undefined`
 * 5. User movie data is now properly typed as `UserMovieDataSchema`
 *
 * Type differences to be aware of:
 * - `release_date` is now optional (string | null | undefined)
 * - `runtime` is optional (number | null | undefined)
 * - `vote_average` is optional (number | null | undefined)
 * - All path fields (poster_path, backdrop_path) are string | null | undefined
 * - The `Movie` interface extends the backend schema with frontend-specific fields
 */