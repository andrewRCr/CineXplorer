import { useCallback } from "react";
import { fetchUpcomingMovies } from "@/services/movieService";
import type { PaginatedMoviesResponse } from "@/services/movieService";
import MovieGridPageLayout from "@/components/movie/MovieGridPageLayout";
import { ROUTE_NAMES, PAGINATED_SOURCES } from "@/constants/routes";

const Upcoming = () => {
	const fetcher = useCallback((page: number, filters?: Record<string, any>) => {
		return fetchUpcomingMovies().getPaginated<PaginatedMoviesResponse>({
			page,
			...filters,
		});
	}, []);

	return (
		<MovieGridPageLayout
			title={ROUTE_NAMES.UPCOMING}
			fetcher={fetcher}
			source={PAGINATED_SOURCES.UPCOMING}
			showFilters={true}
			filterStyle="minimal"
		/>
	);
};

export default Upcoming;
