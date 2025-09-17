import { useApiRequest } from "./useApiRequest";
import { useMemo } from "react";
import { type PaginatedMoviesResponse } from "@/types/movie";

type FetchArrayFn = () => {
	request: Promise<{ data: PaginatedMoviesResponse }>;
	cancel: () => void;
};

const useMoviesArray = (fetchFn: FetchArrayFn) => {
	// Memoize fetcher to ensure stable reference for useApiRequest
	const stableFetcher = useMemo(() => {
		return fetchFn;
	}, [fetchFn]);
	const { data, error, setData, setError, isLoading } =
		useApiRequest<PaginatedMoviesResponse>(stableFetcher);
	// return { movies: movies || [], error, setMovies, setError, isLoading };

	// Extract pagination info and movies array
	const movies = isLoading ? [] : data?.results ?? [];
	const total_pages = data?.total_pages ?? 1;
	const total_results = data?.total_results ?? movies.length;
	const page = data?.page; // Don't provide default when data is undefined


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
