import BaseLayout from "./BaseLayout";
import Sidebar from "./Sidebar";
import {
	Grid,
	GridItem,
	useBreakpointValue,
	Box,
	Container,
} from "@chakra-ui/react";
import { Outlet } from "react-router-dom";

const AppLayout = () => {
	const showSidebar = useBreakpointValue({
		base: false,
		md: true,
		lg: true,
	});

	return (
		<BaseLayout>
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
						gap={showSidebar ? 6 : 0}
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
		</BaseLayout>
	);
};

export default AppLayout;
