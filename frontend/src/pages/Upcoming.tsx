import { fetchUpcomingMovies } from "@/services/movieService";
import MovieGridPageLayout from "@/components/MovieGridPageLayout";

const Upcoming = () => (
	<MovieGridPageLayout
		title="Upcoming"
		fetcher={(page) => fetchUpcomingMovies().getPaginated({ page })}
	/>
);

export default Upcoming;
