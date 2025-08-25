import { COLORS } from "@/constants/theme";
import tmdbLogo from "../../assets/tmdb_logo_alt_short.svg";
import NavBar from "./NavBar";
import Sidebar from "./Sidebar";
import {
	Grid,
	GridItem,
	useBreakpointValue,
	Box,
	Container,
	Text,
	VStack,
} from "@chakra-ui/react";
import { Outlet } from "react-router-dom";
import { colorSwatchRecipe } from "@chakra-ui/react/theme";

const AppLayout = () => {
	const showSidebar = useBreakpointValue({
		base: false,
		md: true,
		lg: true,
	});

	return (
		<Box
			minH="100vh"
			display="flex"
			flexDirection="column"
			bg={COLORS.background.main}
		>
			{/* NavBar */}
			<NavBar />
			<Box flex="1">
				<Container maxW="container.xl" px={{ base: 2, md: 6, lg: 8 }} w="100%">
					<Grid
						templateAreas={{
							base: `"main"`,
							lg: `"sidebar main"`,
						}}
						templateColumns={{
							base: "1fr",
							lg: "240px 1fr",
						}}
						alignItems="stretch"
						gap={6}
						minH="calc(100vh - 64px)" // adjust for navbar height
					>
						{/* Sidebar */}
						<GridItem
							area="sidebar"
							position="sticky"
							top="72px" // 64px navbar + 8px margin
							zIndex={1}
							alignSelf="start"
							boxShadow="2px 0 8px 0 rgba(0,0,0,0.08)"
						>
							<Sidebar />
						</GridItem>
						<GridItem area="main" h="100%">
							<Outlet />
						</GridItem>
					</Grid>
				</Container>
			</Box>
			{/* Footer */}
			<Box
				as="footer"
				w="100%"
				bg={COLORS.background.footer}
				py={2}
				mt={8}
				textAlign="center"
				borderTop="1px solid"
				borderColor={COLORS.border.main}
				aria-label="Application footer with TMDB attribution"
			>
				<VStack gap={2} alignItems="center">
					<Box display="inline-flex" alignItems="center" gap={2}>
						<Text fontSize="sm" color={COLORS.text.muted}>
							© 2025 CineXplorer. All rights reserved.
						</Text>
					</Box>
					{/* TMDB Attribution */}
					<Box display="inline-flex" alignItems="center" gap={2}>
						<a
							href="https://www.themoviedb.org/documentation/api"
							target="_blank"
							rel="noopener noreferrer"
							aria-label="TMDB API Documentation"
						>
							<img
								src={tmdbLogo}
								alt="TMDB Logo"
								style={{ height: "18px", opacity: 0.7 }}
							/>
						</a>
						<Text fontSize="sm" color={COLORS.text.muted}>
							This product uses the TMDB API but is not endorsed or certified by
							TMDB.
						</Text>
					</Box>
				</VStack>
			</Box>
		</Box>
	);
};

export default AppLayout;
