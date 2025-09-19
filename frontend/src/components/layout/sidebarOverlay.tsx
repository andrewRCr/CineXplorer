"use client";

import {
	HStack,
	IconButton,
	Drawer,
	Portal,
	Text,
	Image,
	Box,
	createOverlay,
} from "@chakra-ui/react";
import { LuX } from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import SidebarContent from "./SidebarContent";
import type { Drawer as DrawerType } from "@chakra-ui/react";
import logo from "../../assets/icons8-movie-64.webp";

interface SidebarDrawerProps {
	placement?: DrawerType.RootProps["placement"];
}

// Create the sidebar drawer using Chakra v3 overlay manager
export const sidebarDrawer = createOverlay<SidebarDrawerProps>((props) => {
	const { placement = "start", ...rest } = props;
	const navigate = useNavigate();

	// Callback to close drawer after navigation
	const handleNavigationCallback = () => {
		sidebarDrawer.close("sidebar");
	};

	// Handler for navigating to home from logo/text
	const handleHomeNavigation = () => {
		navigate("/");
		sidebarDrawer.close("sidebar");
	};

	return (
		<Drawer.Root placement={placement} {...rest}>
			<Portal>
				<Drawer.Backdrop />
				<Drawer.Positioner>
					<Drawer.Content
						bg="background.sidebar"
						borderRight="1px solid"
						borderColor="border.sidebar"
						width="280px"
					>
						<Drawer.Header
							borderBottom="1px solid"
							borderColor="border.separator"
							p={0}
							m={0}
						>
							<Box
								pt={2}
								pb={2}
								px={4}
								h="64px"
								display="flex"
								alignItems="center"
								justifyContent="space-between"
								w="100%"
							>
								{/* Left-aligned Logo and Text */}
								<HStack
									gap={3}
									alignItems="center"
									cursor="pointer"
									transition="all 0.2s"
									_hover={{
										"& > *": {
											filter:
												"brightness(1.1) drop-shadow(0 0 8px rgba(99, 179, 237, 0.3))",
										},
										"& p": {
											textShadow: "0 0 8px rgba(99, 179, 237, 0.3)",
											"&::after": {
												width: "100%",
											},
										},
									}}
									onClick={handleHomeNavigation}
								>
									<Image
										src={logo}
										boxSize="24px"
										transition="all 0.2s"
										alt="CineXplorer Logo"
									/>
									<Text
										fontSize="xl"
										fontFamily="heading"
										fontWeight="bold"
										color="text.main"
										transition="all 0.2s"
										position="relative"
										_after={{
											content: '""',
											position: "absolute",
											bottom: "-5px",
											left: "50%",
											transform: "translateX(-50%)",
											width: "0%",
											height: "2px",
											backgroundColor: "accent.secondary",
											transition: "width 0.3s ease",
											borderRadius: "1px",
										}}
									>
										CineXplorer
									</Text>
								</HStack>

								{/* Right-aligned Close Button */}
								<IconButton
									variant="ghost"
									size="xs"
									color="text.main"
									flexShrink={0}
									onClick={() => sidebarDrawer.close("sidebar")}
									aria-label="Close menu"
									mt="1px"
								>
									<LuX />
								</IconButton>
							</Box>
						</Drawer.Header>

						<Drawer.Body p={0}>
							<SidebarContent onNavigate={handleNavigationCallback} />
						</Drawer.Body>
					</Drawer.Content>
				</Drawer.Positioner>
			</Portal>
		</Drawer.Root>
	);
});
