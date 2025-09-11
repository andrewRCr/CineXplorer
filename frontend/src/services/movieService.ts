import create from "./httpService";

// TODO: add genres, etc; match backend response structure
export interface Movie {
	tmdb_id: number;
	title: string;
	release_date: string;
	runtime: number;
	overview: string;
	poster_path: string;
	vote_average: number;
	genres?: { id: number; name: string }[];
	cast?: { id: number; name: string; character: string }[];
	crew?: { id: number; name: string; job: string }[];
	production_companies?: { id: number; name: string }[];
	user_movie_data?: any;
}

export interface PaginatedMoviesResponse {
	page: number;
	results: Movie[];
	total_pages: number;
	total_results: number;
}

// export interface FetchMoviesResponse {
// 	count: number;
// 	results: Movie[];
// }

// reusable API functions
// export const fetchNowPlayingMovies = (page: number) =>
// 	create(`/movie/now-playing?page=${page}`);
// export const fetchNowPlayingMovies = (page: number) =>
// 	create("/movie/now-playing").getPaginated<PaginatedMoviesResponse>({ page });
export const fetchNowPlayingMoviesService = create("/movie/now-playing/");
export const fetchUpcomingMovies = () => create("/movie/upcoming");
export const fetchMovieDetail = () => create("/movie/find");
export const fetchDiscoverMoviesService = create("/movie/discover/");
export const fetchMovieGenresService = create("/movie/genres/");
export const fetchTopRatedMoviesService = create("/movie/top-rated/");
export const fetchSearchMoviesService = create("/movie/search/");
