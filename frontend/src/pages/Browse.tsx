import { Grid, GridItem, Show, useBreakpointValue } from "@chakra-ui/react";
import NavBar from "@/components/NavBar";
import MovieGrid from "@/components/MovieGrid";

const Browse = () => {
	const showSidebar = useBreakpointValue({
		base: false,
		lg: true,
	});

	return (
		<Grid
			templateAreas={{
				base: `"nav" "main"`,
				lg: `"nav nav" "sidebar main"`,
			}}
		>
			<GridItem area="nav" bg="gray">
				<NavBar />
			</GridItem>
			<Show when={showSidebar}>
				<GridItem area="sidebar" bg="goldenrod">
					Sidebar
				</GridItem>
			</Show>
			<GridItem area="main" bg="dodgerblue">
				<MovieGrid />
			</GridItem>
		</Grid>
	);
};

export default Browse;
