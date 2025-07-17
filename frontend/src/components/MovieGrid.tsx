import { useEffect, useState } from "react";
import apiClient from "@/services/apiClient";
import useMovie from "@/hooks/useMovie";
import { Text } from "@chakra-ui/react";

const MovieGrid = () => {
	// const [movies, setMovies] = useState<Movie[]>([]);
	// const [error, setError] = useState("");

	// useEffect(() => {
	// 	apiClient
	// 		.get<FetchMoviesResponse>("/movies")
	// 		.then((res) => setMovies(res.data.results))
	// 		.catch((err) => setError(err.message));
	// }, []);

	const { movies, error, setMovies, setError } = useMovie();

	return (
		<>
			{error && <Text>{error}</Text>}
			<ul>
				{movies.map((movie) => (
					<li key={movie.id}>{movie.title}</li>
				))}
			</ul>
		</>
	);
};

export default MovieGrid;
