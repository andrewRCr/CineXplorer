import { useApiRequest } from "./useApiRequest";
import { type Movie } from "../services/movieService";

type FetchArrayFn = () => {
	request: Promise<{ data: Movie[] }>;
	cancel: () => void;
};

const useMoviesArray = (fetchFn: FetchArrayFn) => {
	const {
		data: movies,
		error,
		setData: setMovies,
		setError,
		isLoading,
	} = useApiRequest<Movie[]>(() => fetchFn());
	return { movies: movies || [], error, setMovies, setError, isLoading };
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
