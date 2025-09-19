import { IconButton } from "@chakra-ui/react";
import { LuMenu } from "react-icons/lu";
import { sidebarDrawer } from "./sidebarOverlay";

interface MobileMenuButtonProps {
	size?: "sm" | "md" | "lg";
	variant?: "ghost" | "solid" | "outline";
}

/**
 * Mobile hamburger menu button that opens the sidebar drawer.
 * Uses Chakra v3's overlay manager pattern for drawer control.
 */
const MobileMenuButton: React.FC<MobileMenuButtonProps> = ({ 
	size = "md", 
	variant = "ghost" 
}) => {
	const handleOpen = () => {
		sidebarDrawer.open("sidebar", {
			placement: "start"
		});
	};

		return (
			<IconButton
				aria-label="Open navigation menu"
				onClick={handleOpen}
				size={size}
				variant={variant}
				color="text.main"
				_hover={{
					bg: "background.subItem",
					opacity: 0.8,
					color: "accent.primary"
				}}
			>
				<LuMenu />
			</IconButton>
		);
};

export default MobileMenuButton;