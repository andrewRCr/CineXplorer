import { useApiRequest } from "./useApiRequest";
import { useMemo } from "react";
import { type Movie } from "../services/movieService";

type FetchDetailFn = () => {
	request: Promise<{ data: Movie }>;
	cancel: () => void;
};

const useMovieDetail = (fetchFn: FetchDetailFn) => {
	const stableFetcher = useMemo(() => fetchFn, [fetchFn]);
	const {
		data: movie,
		error,
		setData: setMovie,
		setError,
		isLoading,
	} = useApiRequest<Movie>(stableFetcher);
	return { movie, error, setMovie, setError, isLoading };
};

export default useMovieDetail;

// import { useEffect, useState, type SetStateAction } from "react";
// // import movieDetailService, { type Movie } from "../services/movieDetailService";
// import { fetchMovieDetail, type Movie } from "../services/movieService";
// import { CanceledError } from "../services/apiClient";

// const useMovieDetail = (id: string) => {
// 	const [movie, setMovie] = useState<Movie>();
// 	const [error, setError] = useState("");
// 	const [isLoading, setIsLoading] = useState(false);

// 	useEffect(() => {
// 		console.log(id);
// 		const { request, cancel } = fetchMovieDetail().get(id);
// 		setIsLoading(true);
// 		request
// 			.then((res: { data: unknown }) => {
// 				const data = res.data;
// 				//console.log(data);
// 				let movie: Movie;
// 				if (Array.isArray(data)) {
// 					movie = data[0];
// 				} else if (
// 					data &&
// 					typeof data === "object" &&
// 					Array.isArray(data as Record<string, unknown>)
// 				) {
// 					movie = (data as { results: Movie[] }).results[0];
// 				} else {
// 					movie = data as Movie;
// 				}
// 				setMovie(movie);
// 				setIsLoading(false);
// 				console.log("Movie Detail fetched successfully:", movie);
// 			})
// 			.catch((err: { message: SetStateAction<string> }) => {
// 				if (err instanceof CanceledError) return;
// 				setError(err.message);
// 				setIsLoading(false);
// 			});

// 		return () => cancel();
// 	}, []);

// 	return { movie, error, setMovie, setError, isLoading };
// };

// export default useMovieDetail;
