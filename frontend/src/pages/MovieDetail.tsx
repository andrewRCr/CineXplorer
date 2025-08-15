import useMovieDetail from "@/hooks/useMovieDetail";
import { Text } from "@chakra-ui/react";
import { useParams } from "react-router-dom";

const MovieDetail = () => {
	const { id } = useParams<{ id: string }>();
	const { movie, error, setMovie, setError, isLoading } = useMovieDetail(id!);

	return (
		<>
			{error && <Text>{error}</Text>}
			<h1>SINGLE MOVIE DETAIL PAGE</h1>
			<p>Dedicated per-movie detail page.</p>
			<br />
			<p>Movie ID: {id}</p>
			<p>{movie ? movie.title : "Loading..."}</p>
		</>
	);
};

export default MovieDetail;
