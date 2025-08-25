import { fetchUpcomingMovies } from "@/services/movieService";
import MovieGridPageLayout from "@/components/movie/MovieGridPageLayout";
import { ROUTE_NAMES, PAGINATED_SOURCES } from "@/constants/routes";

const Upcoming = () => (
	<MovieGridPageLayout
		title={ROUTE_NAMES.UPCOMING}
		fetcher={(page) => fetchUpcomingMovies().getPaginated({ page })}
		source={PAGINATED_SOURCES.UPCOMING}
	/>
);

export default Upcoming;
