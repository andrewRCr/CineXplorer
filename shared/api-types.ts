/**
 * Shared API Response Types
 * 
 * These interfaces should be used by both frontend and backend to ensure
 * API contract consistency and prevent type mismatches.
 */

import type { ErrorCode, ErrorCategory } from './error-codes';

/**
 * Standard API Error structure
 * Matches Django REST framework error format
 */
export interface ApiError {
  code: ErrorCode;
  message: string;
  category?: ErrorCategory;
  field?: string;           // For validation errors on specific fields
  details?: Record<string, unknown>;
}

/**
 * Standard API Response wrapper
 * Used for all API endpoints to maintain consistency
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  errors?: ApiError[];      // For multiple validation errors
  meta?: {
    timestamp: string;
    request_id?: string;
    version?: string;
  };
}

/**
 * Paginated API Response
 * Matches Django REST framework pagination
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    per_page: number;
    total_pages: number;
    total_count: number;
    has_next: boolean;
    has_previous: boolean;
    next_page?: number;
    previous_page?: number;
  };
}

/**
 * Authentication response structures
 */
export interface AuthTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
  user: {
    id: number;
    username: string;
    email: string;
    is_verified: boolean;
  };
}

/**
 * User profile data structure
 */
export interface UserProfile {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  is_verified: boolean;
  date_joined: string;
  last_login?: string;
  avatar_url?: string;
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    email_notifications: boolean;
  };
}

/**
 * Movie rating/interaction data
 * Matches the UserMovieData model from Django
 */
export interface UserMovieData {
  user_rating?: number | null;
  user_review?: string | null;
  user_watched: boolean;
  user_on_watchlist: boolean;
  user_liked: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Core Movie data structure
 * Matches TMDB API responses and backend serializer output
 */
export interface Movie {
  tmdb_id: number;
  title: string;
  release_date: string;
  runtime?: number;
  overview?: string; // Only present in detail views
  poster_path: string | null;
  backdrop_path?: string | null; // TMDB field, optional
  vote_average: number;
  vote_count?: number; // TMDB field, optional
  popularity?: number; // TMDB field, optional
  original_language?: string; // TMDB field, optional
  original_title?: string; // TMDB field, optional
  adult?: boolean; // TMDB field, optional
  video?: boolean; // TMDB field, optional
  
  // Relational data (may be included via serializer in detail views)
  genres?: Genre[];
  cast?: CastMember[];
  crew?: CrewMember[];
  production_companies?: ProductionCompany[];
  
  // User-specific data (only present when user is authenticated)
  user_movie_data?: UserMovieData | null;
}

/**
 * Supporting movie-related interfaces
 */
export interface Genre {
  id: number;
  name: string;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path?: string;
  order?: number; // Optional since not always provided
}

export interface CrewMember {
  id: number;
  name: string;
  job: string;
  department?: string; // Optional since not always provided by TMDB
  profile_path?: string;
}

export interface ProductionCompany {
  id: number;
  name: string;
  logo_path?: string;
  origin_country: string;
}

/**
 * Movie list/filter request parameters
 * Used for search, filtering, and pagination
 */
export interface MovieListParams {
  page?: number;
  per_page?: number;
  query?: string;
  genres?: number[];
  min_year?: number;
  max_year?: number;
  min_rating?: number;
  max_rating?: number;
  min_runtime?: number;
  max_runtime?: number;
  sort_by?: 'title' | 'release_date' | 'vote_average' | 'popularity' | 'runtime';
  sort_order?: 'asc' | 'desc';
  include_adult?: boolean;
  user_filters?: {
    watched?: boolean;
    on_watchlist?: boolean;
    liked?: boolean;
    rated?: boolean;
  };
}

/**
 * User movie interaction request payloads
 */
export interface RateMovieRequest {
  rating: number;  // 1-10
  review?: string;
}

export interface WatchlistRequest {
  on_watchlist: boolean;
}

export interface LikeMovieRequest {
  liked: boolean;
}

export interface WatchedMovieRequest {
  watched: boolean;
}