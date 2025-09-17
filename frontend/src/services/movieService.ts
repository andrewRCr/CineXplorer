import create from "./httpService";
import type { 
	Movie, 
	Genre
} from "shared/index";

// Define API-specific response types that may differ from shared types
// TMDB API uses a flat pagination format, not Django's nested format
export interface TMDBPaginatedResponse<T> {
	page: number;
	results: T[];
	total_pages: number;
	total_results: number;
}

// TMDB Genres API response structure
export interface GenresResponse {
	genres: Genre[];
}

// Type aliases for clarity
export type PaginatedMoviesResponse = TMDBPaginatedResponse<Movie>;

// Service instances with proper typing for movie-related endpoints
export const fetchNowPlayingMoviesService = create("/movie/now-playing/");
export const fetchUpcomingMovies = () => create("/movie/upcoming");
export const fetchMovieDetail = () => create("/movie/find");
export const fetchDiscoverMoviesService = create("/movie/discover/");
export const fetchMovieGenresService = create("/movie/genres/");
export const fetchTopRatedMoviesService = create("/movie/top-rated/");
export const fetchSearchMoviesService = create("/movie/search/");

// Type-safe wrapper functions for common operations
export const fetchPaginatedMovies = (
	service: ReturnType<typeof create>,
	params?: Record<string, unknown>
) => {
	return service.getPaginated<PaginatedMoviesResponse>(params);
};

export const fetchSingleMovie = (
	service: ReturnType<typeof create>,
	id: string | number
) => {
	return service.get<Movie>(id);
};

export const fetchGenres = (
	service: ReturnType<typeof create>
) => {
	return service.getPaginated<GenresResponse>();
};
