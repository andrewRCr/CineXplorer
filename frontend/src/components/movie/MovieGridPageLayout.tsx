import {
	Grid,
	GridItem,
	Show,
	useBreakpointValue,
	Text,
} from "@chakra-ui/react";
import NavBar from "@/components/layout/NavBar";
import MovieGrid from "@/components/movie/MovieGrid";
import Sidebar from "@/components/layout/Sidebar";
import type { Movie, PaginatedMoviesResponse } from "@/services/movieService";

interface MovieGridPageLayoutProps {
	title: string;
	fetcher: (page: number) => {
		request: Promise<{ data: PaginatedMoviesResponse }>;
		cancel: () => void;
	};
}

const MovieGridPageLayout = ({ title, fetcher }: MovieGridPageLayoutProps) => {
	const showSidebar = useBreakpointValue({
		base: false,
		md: true,
		lg: true,
	});

	return (
		<Grid
			templateAreas={{
				base: `"nav" "main"`,
				lg: `"nav nav" "sidebar main"`,
			}}
			templateColumns={{
				base: "1fr",
				lg: "250px 1fr",
			}}
		>
			<GridItem area="nav" bg="gray.00">
				<NavBar />
			</GridItem>
			<Show when={showSidebar}>
				<GridItem area="sidebar" bg="gray.900">
					<Sidebar />
				</GridItem>
			</Show>
			<GridItem area="main" bg="transparent">
				<Text fontSize="2xl" fontStyle="italic" color="white" p={2}>
					{title}
				</Text>
				<MovieGrid fetcher={fetcher} />
			</GridItem>
		</Grid>
	);
};

export default MovieGridPageLayout;
