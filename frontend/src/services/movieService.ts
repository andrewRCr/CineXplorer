import create from "./httpService";
import type {
	Movie,
	GenresResponse,
	PaginatedMoviesResponse,
	Keyword,
	Person,
	PaginatedKeywordResponse,
	PaginatedPersonResponse
} from "../@types/movie";

// Re-export commonly used types for external consumers
export type { PaginatedMoviesResponse, Movie, Keyword, Person };

// Service instances for clean Django Ninja API endpoints
export const fetchNowPlayingMoviesService = create("/api/movies/now-playing");
export const fetchUpcomingMovies = () => create("/api/movies/upcoming");
export const fetchMovieDetail = () => create("/api/movies");
export const fetchDiscoverMoviesService = create("/api/movies/discover");
export const fetchMovieGenresService = create("/api/genres");
export const fetchSearchMoviesService = create("/api/movies/search");

// Legacy endpoint mapping - use discover with sort_by for top-rated
export const fetchTopRatedMoviesService = create("/api/movies/discover");

// Supporting data endpoints from Django Ninja API
export const fetchKeywordsService = create("/api/keywords");
export const fetchSearchKeywordsService = create("/api/keywords/search");
export const fetchPeopleService = create("/api/people");
export const fetchSearchPeopleService = create("/api/people/search");

// Type-safe wrapper functions for common operations

/**
 * Fetch paginated movies using auto-generated response types
 */
export const fetchPaginatedMovies = (
	service: ReturnType<typeof create>,
	params?: Record<string, unknown>
) => {
	return service.getPaginated<PaginatedMoviesResponse>(params);
};

/**
 * Fetch single movie by TMDB ID using auto-generated types
 */
export const fetchSingleMovie = (
	service: ReturnType<typeof create>,
	tmdb_id: string | number
) => {
	return service.get<Movie>(`/${tmdb_id}`);
};

/**
 * Fetch movie genres using auto-generated response types
 */
export const fetchGenres = (
	service: ReturnType<typeof create>
) => {
	return service.get<GenresResponse>("");
};

/**
 * Fetch paginated keywords using auto-generated response types
 */
export const fetchPaginatedKeywords = (
	service: ReturnType<typeof create>,
	params?: Record<string, unknown>
) => {
	return service.getPaginated<PaginatedKeywordResponse>(params);
};

/**
 * Fetch paginated people using auto-generated response types
 */
export const fetchPaginatedPeople = (
	service: ReturnType<typeof create>,
	params?: Record<string, unknown>
) => {
	return service.getPaginated<PaginatedPersonResponse>(params);
};

// Convenience functions for common movie operations

/**
 * Fetch now playing movies with optional pagination and filtering
 */
export const getNowPlayingMovies = (params?: Record<string, unknown>) => {
	return fetchPaginatedMovies(fetchNowPlayingMoviesService, params);
};

/**
 * Fetch upcoming movies with optional pagination and filtering
 */
export const getUpcomingMovies = (params?: Record<string, unknown>) => {
	return fetchPaginatedMovies(fetchUpcomingMovies(), params);
};

/**
 * Fetch movie details by TMDB ID
 */
export const getMovieDetail = (tmdb_id: string | number) => {
	return fetchSingleMovie(fetchMovieDetail(), tmdb_id);
};

/**
 * Discover movies with advanced filtering
 */
export const discoverMovies = (params?: Record<string, unknown>) => {
	return fetchPaginatedMovies(fetchDiscoverMoviesService, params);
};

/**
 * Search movies by query
 */
export const searchMovies = (params?: Record<string, unknown>) => {
	return fetchPaginatedMovies(fetchSearchMoviesService, params);
};

/**
 * Get all available movie genres
 */
export const getMovieGenres = () => {
	return fetchGenres(fetchMovieGenresService);
};

/**
 * Search keywords with pagination
 */
export const searchKeywords = (params?: Record<string, unknown>) => {
	return fetchPaginatedKeywords(fetchSearchKeywordsService, params);
};

/**
 * Search people with pagination
 */
export const searchPeople = (params?: Record<string, unknown>) => {
	return fetchPaginatedPeople(fetchSearchPeopleService, params);
};

// Migration Notes:
// 1. Updated all endpoints to use clean Django Ninja API paths (/api/movies/*, /api/genres, etc.)
// 2. Replaced @shared imports with @types/movie for auto-generated types
// 3. Added new endpoints for keywords and people search with clean URLs
// 4. Updated parameter naming to match backend (tmdb_id instead of id)
// 5. All response types now use auto-generated schemas from OpenAPI
// 6. Implemented multiple router structure: /api/movies, /api/genres, /api/keywords, /api/people