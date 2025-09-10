import { useCallback } from "react";
import {
	fetchNowPlayingMoviesService,
	type PaginatedMoviesResponse,
} from "@/services/movieService";
import MovieGridPageLayout from "@/components/movie/MovieGridPageLayout";
import { ROUTE_NAMES, PAGINATED_SOURCES } from "@/constants/routes";

const NowPlaying = () => {
	// Enhanced fetcher that accepts filters
	const fetcher = useCallback((page: number, filters?: Record<string, any>) => {
		return fetchNowPlayingMoviesService.getPaginated<PaginatedMoviesResponse>({
			page,
			...filters,
		});
	}, []);

	return (
		<MovieGridPageLayout
			title={ROUTE_NAMES.NOW_PLAYING}
			fetcher={fetcher}
			source={PAGINATED_SOURCES.NOW_PLAYING}
			showFilters={true}
			filterStyle="minimal"
		/>
	);
};

export default NowPlaying;
