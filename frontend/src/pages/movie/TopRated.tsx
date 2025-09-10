import { useCallback } from "react";
import {
	fetchTopRatedMoviesService,
	type PaginatedMoviesResponse,
} from "@/services/movieService";
import MovieGridPageLayout from "@/components/movie/MovieGridPageLayout";

const TopRated = () => {
	const fetcher = useCallback((page: number, filters?: Record<string, any>) => {
		return fetchTopRatedMoviesService.getPaginated<PaginatedMoviesResponse>({
			page,
			...filters,
		});
	}, []);

	return (
		<MovieGridPageLayout
			title="Top Rated Movies"
			fetcher={fetcher}
			source="top-rated"
			showFilters={true}
			filterStyle="minimal"
		/>
	);
};

export default TopRated;
