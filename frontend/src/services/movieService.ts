import create from "./httpService";

// TODO: add genres, etc; match backend response structure
export interface Movie {
	id: number;
	title: string;
	release_date: string;
	runtime: number;
	overview: string;
	poster_path: string;
}

export interface FetchMoviesResponse {
	count: number;
	results: Movie[];
}

// Create an instance of HttpService for the Movie endpoint.
export default create("/movie/find/78");
