/**
 * Frontend-specific movie types and re-exports from shared types
 * 
 * This file imports shared API types and extends them with frontend-specific
 * types and utilities for better type safety.
 */

// Import shared API types that should be consistent across frontend/backend
// TODO: Re-enable when path mapping is fixed
// export type {
//   Movie,
//   Genre,
//   CastMember,
//   CrewMember,
//   ProductionCompany,
//   UserMovieData,
//   ApiError,
//   ApiResponse,
//   PaginatedResponse,
//   MovieListParams,
//   RateMovieRequest,
//   WatchlistRequest,
//   LikeMovieRequest,
//   WatchedMovieRequest
// } from 'shared';

// Temporary: Define types inline until shared path mapping is fixed
export interface Movie {
  tmdb_id: number;
  title: string;
  release_date: string;
  runtime?: number;
  overview?: string; // Optional to match shared API types
  poster_path: string | null;
  backdrop_path?: string | null;
  vote_average: number;
  vote_count?: number;
  popularity?: number;
  original_language?: string;
  original_title?: string;
  adult?: boolean;
  video?: boolean;
  genres?: { id: number; name: string }[];
  cast?: { id: number; name: string; character: string; profile_path?: string }[];
  crew?: { id: number; name: string; job: string; profile_path?: string }[];
  production_companies?: { id: number; name: string; logo_path?: string }[];
}

/**
 * Frontend-specific extensions and utilities
 */

// TMDB API-specific pagination response structure
// This matches TMDB's current flat response format, not Django's nested format
export interface PaginatedMoviesResponse {
  page: number;
  results: Movie[];
  total_pages: number;
  total_results: number;
}

// TMDB Genres API response structure
export interface GenresResponse {
  genres: { id: number; name: string }[];
}

// Future: When backend is updated to use shared pagination format, use this instead:
// export type PaginatedMoviesResponse = import('shared').PaginatedResponse<import('shared').Movie>;

export interface Credits {
  cast: { id: number; name: string; character: string; profile_path?: string }[];
  crew: { id: number; name: string; job: string; profile_path?: string }[];
}

/**
 * Frontend-specific filter types
 * (UI form state - different from API MovieListParams)
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

// Helper type for converting UI filters to API params
export type MovieFiltersToApiParams = (filters: MovieFilters) => Record<string, unknown>;
