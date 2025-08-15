import { fetchNowPlayingMovies } from "@/services/movieService";
import MoviePageLayout from "@/components/MovieGridPageLayout";

const NowPlaying = () => (
	<MoviePageLayout
		title="Now Playing"
		fetcher={() => fetchNowPlayingMovies().getArray()}
	/>
);

export default NowPlaying;

// import {
// 	Grid,
// 	GridItem,
// 	Show,
// 	useBreakpointValue,
// 	Text,
// } from "@chakra-ui/react";
// import NavBar from "@/components/NavBar";
// import MovieGrid from "@/components/MovieGrid";
// import { fetchNowPlayingMovies } from "@/services/movieService";

// const NowPlaying = () => {
// 	const showSidebar = useBreakpointValue({
// 		base: false,
// 		md: true,
// 		lg: true,
// 	});

// 	return (
// 		<Grid
// 			templateAreas={{
// 				base: `"nav" "main"`,
// 				lg: `"nav nav" "sidebar main"`,
// 			}}
// 			templateColumns={{
// 				base: "1fr",
// 				lg: "250px 1fr",
// 			}}
// 		>
// 			<GridItem area="nav" bg="gray.00">
// 				<NavBar />
// 			</GridItem>
// 			<Show when={showSidebar}>
// 				<GridItem area="sidebar" bg="gray.900">
// 					Sidebar
// 				</GridItem>
// 			</Show>
// 			<GridItem area="main" bg="transparent">
// 				<Text fontSize="2xl" fontStyle="italic" color="white" p={2}>
// 					Now Playing
// 				</Text>
// 				<MovieGrid fetcher={() => fetchNowPlayingMovies().getArray()} />
// 			</GridItem>
// 		</Grid>
// 	);
// };

// export default NowPlaying;
