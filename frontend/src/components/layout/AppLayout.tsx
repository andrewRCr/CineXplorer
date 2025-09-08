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
import { Outlet, useLocation } from "react-router-dom";
import { ROUTES } from "@/constants/routes";

const AppLayout = () => {
	const location = useLocation();
	const isAuthPage = [ROUTES.LOGIN, ROUTES.REGISTER].includes(
		location.pathname
	);

	const showSidebar = useBreakpointValue({
		base: false,
		md: !isAuthPage,
		lg: !isAuthPage,
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

			{/* Main Content Area */}
			<Box flex="1" display="flex" flexDirection="column">
				<Container
					maxW="container.xl"
					px={{ base: 2, md: 6, lg: 8 }}
					w="100%"
					flex="1"
					display="flex"
				>
					<Grid
						w="100%"
						templateAreas={{
							base: `"main"`,
							lg: showSidebar ? `"sidebar main"` : `"main"`,
						}}
						templateColumns={{
							base: "1fr",
							lg: showSidebar ? "240px 1fr" : "1fr",
						}}
						gap={6}
					>
						{/* Sidebar */}
						{showSidebar && (
							<GridItem
								area="sidebar"
								position="sticky"
								top="72px"
								zIndex={1}
								alignSelf="start"
								boxShadow="2px 0 8px 0 rgba(0,0,0,0.08)"
							>
								<Sidebar />
							</GridItem>
						)}
						{/* The Outlet needs to be inside a flex container to fill height */}
						<GridItem area="main" display="flex" flexDirection="column">
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
