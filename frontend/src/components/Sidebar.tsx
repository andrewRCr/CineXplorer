import React from "react";
import { Box, VStack, Link, List, Separator } from "@chakra-ui/react";

const pageLinks = [
	{ name: "Now Playing", path: "/now-playing" },
	{ name: "Upcoming", path: "/upcoming" },
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

const Sidebar: React.FC = () => (
	<Box
		as="aside"
		width="240px"
		bg="gray.900"
		color="white"
		display="flex"
		flexDirection="column"
		height="100vh"
		py={6}
	>
		<VStack align="stretch" px={6}>
			<Box>
				<List.Root listStyleType="none">
					{pageLinks.map((link) => (
						<List.Item key={link.path} textAlign="left">
							<Link
								href={link.path}
								color="white"
								_hover={{ textDecoration: "none", color: "blue.300" }}
							>
								{link.name}
							</Link>
						</List.Item>
					))}
				</List.Root>
			</Box>
			<Separator borderColor="gray.700" mt="2" mb="1" />
			<Box>
				<List.Root listStyleType="none">
					<List.Item
						// fontStyle="italic"
						fontWeight="semibold"
						color="gray.400"
						textAlign="left"
						mb={2}
					>
						Genres
					</List.Item>
					{genres.map((genre) => (
						<List.Item key={genre} textAlign="left">
							<Link
								href={`/genre/${genre.toLowerCase()}`}
								color="white"
								_hover={{ textDecoration: "none", color: "blue.300" }}
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

export default Sidebar;
