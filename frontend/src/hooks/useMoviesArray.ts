import { useApiRequest } from "./useApiRequest";
import { useMemo } from "react";
import { type PaginatedMoviesResponse } from "../services/movieService";

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

	// Debug logging
	console.log("useMoviesArray Debug:", {
		hasData: !!data,
		total_pages,
		total_results,
		page,
		moviesCount: movies.length,
		rawData: data
			? {
					total_pages: data.total_pages,
					total_results: data.total_results,
					page: data.page,
					resultsLength: data.results?.length,
			  }
			: null,
	});

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
