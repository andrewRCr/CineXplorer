import { useEffect, useState, type SetStateAction } from "react";
import movieService, { type Movie } from "../services/movieService";
import { CanceledError } from "../services/apiClient";

const useMovie = () => {
	const [movies, setMovies] = useState<Movie[]>([]);
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		const { request, cancel } = movieService.getArray<Movie>();
		setIsLoading(true);
		request
			.then((res: { data: unknown }) => {
				const data = res.data;
				console.log(data);
				let moviesArr: Movie[];
				if (Array.isArray(data)) {
					moviesArr = data;
				} else if (
					data &&
					typeof data === "object" &&
					Array.isArray(data as Record<string, unknown>)
				) {
					moviesArr = (data as { results: Movie[] }).results;
				} else {
					moviesArr = [data as Movie];
				}
				setMovies(moviesArr);
				setIsLoading(false);
				console.log("Movies fetched successfully:", moviesArr);
			})
			.catch((err: { message: SetStateAction<string> }) => {
				if (err instanceof CanceledError) return;
				setError(err.message);
				setIsLoading(false);
			});

		return () => cancel();
	}, []);

	return { movies, error, setMovies, setError, isLoading };
};

export default useMovie;
