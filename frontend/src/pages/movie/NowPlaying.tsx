import { useCallback } from "react";
import {
	fetchNowPlayingMoviesService,
	type PaginatedMoviesResponse,
} from "@/services/movieService";
import MovieGridPageLayout from "@/components/movie/MovieGridPageLayout";
import { ROUTE_NAMES, PAGINATED_SOURCES } from "@/constants/routes";

const NowPlaying = () => {
	// useCallback IS needed here to stabilize fetcher reference
	const fetcher = useCallback((page: number) => {
		return fetchNowPlayingMoviesService.getPaginated<PaginatedMoviesResponse>({
			page,
		});
	}, []);
	return (
		<MovieGridPageLayout
			title={ROUTE_NAMES.NOW_PLAYING}
			fetcher={fetcher}
			source={PAGINATED_SOURCES.NOW_PLAYING}
		/>
	);
};

export default NowPlaying;
