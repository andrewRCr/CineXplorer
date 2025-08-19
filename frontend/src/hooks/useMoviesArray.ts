import { useApiRequest } from "./useApiRequest";
import { useMemo } from "react";
import {
	type Movie,
	type PaginatedMoviesResponse,
} from "../services/movieService";

type FetchArrayFn = () => {
	request: Promise<{ data: PaginatedMoviesResponse }>;
	cancel: () => void;
};

const useMoviesArray = (fetchFn: FetchArrayFn) => {
	// Memoize fetcher to ensure stable reference for useApiRequest
	const stableFetcher = useMemo(() => fetchFn, [fetchFn]);
	const { data, error, setData, setError, isLoading } =
		useApiRequest<PaginatedMoviesResponse>(stableFetcher);
	// return { movies: movies || [], error, setMovies, setError, isLoading };

	// Extract pagination info and movies array
	const movies = data?.results ?? [];
	const total_pages = data?.total_pages ?? 1;
	const total_results = data?.total_results ?? movies.length;
	const page = data?.page ?? 1;

	return {
		page,
		total_pages,
		total_results,
		movies,
		error,
		setMovies: setData,
		setError,
		isLoading,
	};
};

export default useMoviesArray;

// LAST VERSION:
// import { useApiRequest } from "./useApiRequest";
// // import movieService, { type Movie } from "../services/moviesArrayService";
// import { fetchNowPlayingMovies, type Movie } from "../services/movieService";

// const useMoviesArrResult = () => {
// 	const {
// 		data: movies,
// 		error,
// 		setData: setMovies,
// 		setError,
// 		isLoading,
// 	} = useApiRequest<Movie[]>(() => movieService.getArray<Movie>());
// 	return { movies: movies || [], error, setMovies, setError, isLoading };
// };

// export default useMoviesArrResult;

// ORIGINAL VERSION:
// import { useEffect, useState, type SetStateAction } from "react";
// import movieService, { type Movie } from "../services/moviesArrayService";
// import { CanceledError } from "../services/apiClient";

// const useMoviesArray = () => {
// 	const [movies, setMovies] = useState<Movie[]>([]);
// 	const [error, setError] = useState("");
// 	const [isLoading, setIsLoading] = useState(false);

// 	useEffect(() => {
// 		const { request, cancel } = movieService.getArray<Movie>();
// 		setIsLoading(true);
// 		request
// 			.then((res: { data: unknown }) => {
// 				const data = res.data;
// 				//console.log(data);
// 				let moviesArr: Movie[];
// 				if (Array.isArray(data)) {
// 					moviesArr = data;
// 				} else if (
// 					data &&
// 					typeof data === "object" &&
// 					Array.isArray(data as Record<string, unknown>)
// 				) {
// 					moviesArr = (data as { results: Movie[] }).results;
// 				} else {
// 					moviesArr = [data as Movie];
// 				}
// 				setMovies(moviesArr);
// 				setIsLoading(false);
// 				// console.log("Movies fetched successfully:", moviesArr);
// 			})
// 			.catch((err: { message: SetStateAction<string> }) => {
// 				if (err instanceof CanceledError) return;
// 				setError(err.message);
// 				setIsLoading(false);
// 			});

// 		return () => cancel();
// 	}, []);

// 	return { movies, error, setMovies, setError, isLoading };
// };

// export default useMoviesArray;
