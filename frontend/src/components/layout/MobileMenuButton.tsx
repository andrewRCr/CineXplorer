import { IconButton } from "@chakra-ui/react";
import { LuMenu } from "react-icons/lu";
import { COLORS } from "@/constants/theme";
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
				color={COLORS.text.main}
				_hover={{
					bg: `${COLORS.background.subItem}80`,
					color: COLORS.accent.primary
				}}
			>
				<LuMenu />
			</IconButton>
		);
};

export default MobileMenuButton;