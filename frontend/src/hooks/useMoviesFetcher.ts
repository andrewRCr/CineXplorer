import { useMemo } from "react";
import type { PaginatedMoviesResponse } from "@/types/movie";

type FetcherFunction = (page: number) => {
	request: Promise<{ data: PaginatedMoviesResponse }>;
	cancel: () => void;
};

/**
 * Custom hook to create a fetcher function for useMoviesArray
 * Handles the logic of creating a memoized fetcher that depends on currentPage
 */
export function useMoviesFetcher(
	finalFetcher: FetcherFunction | undefined,
	currentPage: number
) {
	const fetcherForMoviesArray = useMemo(() => {
		if (!finalFetcher) {
			return () => ({
				request: Promise.resolve({
					data: { page: 1, results: [], total_pages: 1, total_results: 0 },
				}),
				cancel: () => {},
			});
		}
		return () => finalFetcher(currentPage);
	}, [finalFetcher, currentPage]);

	return fetcherForMoviesArray;
}
