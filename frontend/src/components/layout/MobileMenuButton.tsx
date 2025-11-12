import { IconButton } from "@chakra-ui/react";
import { LuMenu } from "react-icons/lu";
import { sidebarDrawer } from "./sidebarOverlay";

interface MobileMenuButtonProps {
  size?: "sm" | "md" | "lg";
}

/**
 * Mobile hamburger menu button that opens the sidebar drawer.
 * Uses Chakra v3's overlay manager pattern for drawer control.
 */
const MobileMenuButton: React.FC<MobileMenuButtonProps> = ({ size = "md" }) => {
  const handleOpen = () => {
    sidebarDrawer.open("sidebar", {
      placement: "start",
    });
  };

  return (
    <IconButton
      aria-label="Open navigation menu"
      onClick={handleOpen}
      size={size}
      variant="outline"
      color="on-button-outline"
      border="1px solid"
      borderColor="button-outline"
      borderRadius="md"
      _hover={{
        bg: "tertiary/8",
        borderColor: "tertiary",
        color: "tertiary",
      }}
    >
      <LuMenu />
    </IconButton>
  );
};

export default MobileMenuButton;
