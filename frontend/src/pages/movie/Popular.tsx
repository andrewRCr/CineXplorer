import { useCallback } from "react";
import {
	fetchDiscoverMoviesService,
	type PaginatedMoviesResponse,
} from "@/services/movieService";
import MovieGridPageLayout from "@/components/movie/MovieGridPageLayout";

const Popular = () => {
	const fetcher = useCallback((page: number, filters?: Record<string, any>) => {
		return fetchDiscoverMoviesService.getPaginated<PaginatedMoviesResponse>({
			page,
			...filters,
		});
	}, []);

	return (
		<MovieGridPageLayout
			title="Popular"
			fetcher={fetcher}
			source="popular"
			showFilters={true}
			filterStyle="minimal"
		/>
	);
};

export default Popular;
