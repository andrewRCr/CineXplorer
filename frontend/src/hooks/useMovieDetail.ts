import { useApiRequest } from "./useApiRequest";
import { useMemo } from "react";
import { type Movie } from "@/types/movie";

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
