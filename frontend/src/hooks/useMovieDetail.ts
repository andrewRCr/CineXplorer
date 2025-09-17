import { useApiRequest } from "./useApiRequest";
import { useMemo } from "react";
import type React from "react";
import { type Movie } from "shared/index";

type FetchDetailFn = () => {
	request: Promise<{ data: Movie }>;
	cancel: () => void;
};

const useMovieDetail = (fetchFn: FetchDetailFn): {
	movie: Movie | undefined;
	error: string;
	setMovie: React.Dispatch<React.SetStateAction<Movie | undefined>>;
	setError: React.Dispatch<React.SetStateAction<string>>;
	isLoading: boolean;
} => {
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
