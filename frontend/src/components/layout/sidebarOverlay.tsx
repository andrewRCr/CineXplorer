"use client";

import {
	HStack,
	IconButton,
	Drawer,
	Portal,
	Text,
	createOverlay,
} from "@chakra-ui/react";
import { LuX } from "react-icons/lu";
import SidebarContent from "./SidebarContent";
import type { Drawer as DrawerType } from "@chakra-ui/react";

interface SidebarDrawerProps {
	placement?: DrawerType.RootProps["placement"];
}

// Create the sidebar drawer using Chakra v3 overlay manager
export const sidebarDrawer = createOverlay<SidebarDrawerProps>((props) => {
	const { placement = "start", ...rest } = props;

	// Callback to close drawer after navigation
	const handleNavigationCallback = () => {
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
							pb={4}
						>
							<HStack justify="space-between" align="center">
								<Text fontSize="lg" fontWeight="bold" color="text.main">
									CineXplorer
								</Text>
								<IconButton
									variant="ghost"
									size="sm"
									color="text.main"
									onClick={() => sidebarDrawer.close("sidebar")}
									aria-label="Close menu"
								>
									<LuX />
								</IconButton>
							</HStack>
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
