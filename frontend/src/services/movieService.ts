import create from "./httpService";

// TODO: add genres, etc; match backend response structure
export interface Movie {
	id: number;
	title: string;
	release_date: string;
	runtime: number;
	overview: string;
	poster_path: string;
	vote_average: number;
}

export interface FetchMoviesResponse {
	count: number;
	results: Movie[];
}

// reusable API functions
export const fetchNowPlayingMovies = () => create("/movie/now-playing");
export const fetchUpcomingMovies = () => create("/movie/upcoming");
export const fetchMovieDetail = () => create("/movie/find");
