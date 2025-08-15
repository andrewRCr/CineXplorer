import { fetchUpcomingMovies } from "@/services/movieService";
import MovieGridPageLayout from "@/components/MovieGridPageLayout";

const Upcoming = () => (
	<MovieGridPageLayout
		title="Upcoming"
		fetcher={() => fetchUpcomingMovies().getArray()}
	/>
);

export default Upcoming;
