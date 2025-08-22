import { useCallback } from "react";
import {
	fetchNowPlayingMoviesService,
	type PaginatedMoviesResponse,
} from "@/services/movieService";
import MovieGridPageLayout from "@/components/movie/MovieGridPageLayout";

const NowPlaying = () => {
	// useCallback IS needed here to stabilize fetcher reference
	const fetcher = useCallback((page: number) => {
		console.log("Fetcher called with page:", page);
		return fetchNowPlayingMoviesService.getPaginated<PaginatedMoviesResponse>({
			page,
		});
	}, []);
	return <MovieGridPageLayout title="Now Playing" fetcher={fetcher} />;
};

export default NowPlaying;
