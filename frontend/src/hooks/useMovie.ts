import { useEffect, useState } from "react";
import movieService, { type Movie } from "../services/movieService";
import { CanceledError } from "../services/apiClient";

const useMovie = () => {
	const [movies, setMovies] = useState<Movie[]>([]);
	const [error, setError] = useState("");

	useEffect(() => {
		const { request, cancel } = movieService.getArray<Movie>();
		request
			.then((res) => {
				const data = res.data;
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

				console.log("Movies fetched successfully:", moviesArr);
			})
			.catch((err) => {
				if (err instanceof CanceledError) return;
				setError(err.message);
			});

		return () => cancel();
	}, []);

	return { movies, error, setMovies, setError };
};

export default useMovie;
