import { ROUTES, ROUTE_NAMES } from "@/constants/routes";
import { COLORS } from "@/constants/theme";
import React from "react";
import { Box, VStack, List, Separator } from "@chakra-ui/react";
import { Link, useNavigate } from "react-router-dom";

const pageLinks = [
	{ name: ROUTE_NAMES.POPULAR, path: ROUTES.POPULAR },
	{ name: ROUTE_NAMES.TOP_RATED, path: ROUTES.TOP_RATED },
	{ name: ROUTE_NAMES.NOW_PLAYING, path: ROUTES.NOW_PLAYING },
	{ name: ROUTE_NAMES.UPCOMING, path: ROUTES.UPCOMING },
];

const genres = [
	"Action",
	"Comedy",
	"Drama",
	"Horror",
	"Romance",
	"Sci-Fi",
	"Thriller",
	// TODO: make match actual backend genres
];

const Sidebar: React.FC = () => {
	const navigate = useNavigate();

	const handleNavigation = (path: string) => {
		// Navigate to the base route without any query parameters to reset to page 1
		// Add a timestamp to force React Router to detect this as a new navigation
		const resetUrl = `${path}?reset=${Date.now()}`;
		console.log(`Sidebar: Navigating to ${resetUrl} (forced reset)`);
		navigate(resetUrl, { replace: true });
	};

	return (
		<Box
			as="aside"
			width="240px"
			bg={COLORS.background.sidebar}
			color={COLORS.text.main}
			borderRight={`1px solid ${COLORS.border.sidebar}`}
			display="flex"
			flexDirection="column"
			height="100vh"
			py={6}
			px={0}
		>
			<VStack align="stretch" px={0}>
				<Box>
					<List.Root listStyleType="none">
						{pageLinks.map((link) => (
							<List.Item key={link.path} textAlign="left">
								<Box
									as="button"
									onClick={() => handleNavigation(link.path)}
									style={{
										color: COLORS.text.main,
										textDecoration: "none",
										background: "none",
										border: "none",
										cursor: "pointer",
										width: "100%",
										textAlign: "left",
										padding: 0,
									}}
									onMouseOver={(e) =>
										(e.currentTarget.style.color = COLORS.accent.highlight)
									}
									onMouseOut={(e) =>
										(e.currentTarget.style.color = COLORS.text.main)
									}
								>
									{link.name}
								</Box>
							</List.Item>
						))}
					</List.Root>
				</Box>
				<Separator
					width="75%"
					borderColor={COLORS.border.separator}
					mt="2"
					mb="1"
				/>
				<Box>
					<List.Root listStyleType="none">
						<List.Item
							// fontStyle="italic"
							fontWeight="semibold"
							color={COLORS.text.secondary}
							textAlign="left"
							mb={2}
						>
							Genres
						</List.Item>
						{genres.map((genre) => (
							<List.Item key={genre} textAlign="left">
								<Link
									to={`/genre/${genre.toLowerCase()}`}
									style={{ color: "white", textDecoration: "none" }}
									onMouseOver={(e) => (e.currentTarget.style.color = "#63b3ed")}
									onMouseOut={(e) => (e.currentTarget.style.color = "white")}
								>
									{genre}
								</Link>
							</List.Item>
						))}
					</List.Root>
				</Box>
			</VStack>
		</Box>
	);
};

export default Sidebar;
