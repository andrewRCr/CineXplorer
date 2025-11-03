import React from "react";
import SidebarContent from "./SidebarContent";
import { Box } from "@chakra-ui/react";

/**
 * Sticky positioning offset for sidebar to eliminate visual "jump" when scrolling starts.
 *
 * This value is empirically determined to position the sidebar such that when it becomes
 * sticky, the visible content appears in the exact same position as when naturally positioned.
 *
 * DEPENDENCIES:
 * - NavBar height (~76px): Logo (60px) + padding (py={2} = 16px) + borders
 * - SidebarContent padding (pt={9} = 36px): Top padding that would cause visual jump
 * - Browser rendering: Additional ~2px for borders/margins
 *
 * IF YOU CHANGE:
 * - NavBar height or styling
 * - SidebarContent padding (py prop)
 * - Container or layout structure
 *
 * THEN UPDATE: This value may need adjustment. Test by scrolling and checking for
 * any visual "jump" of the sidebar content when sticky positioning activates.
 */
const SIDEBAR_STICKY_TOP_OFFSET = "82px";

// Static sidebar component for desktop use
const Sidebar: React.FC = () => {
	return (
		<Box
			as="aside"
			w="280px"
			bg="card"
			boxShadow="2px 0 8px 0 rgba(0,0,0,0.08)"
			position="sticky"
			top={SIDEBAR_STICKY_TOP_OFFSET}
			alignSelf="flex-start"
			maxH="100vh"
			overflowY="auto"
			zIndex={1}
		>
			<SidebarContent />
		</Box>
	);
};

export default Sidebar;
