import {
  Box,
  IconButton,
  Listbox,
  Separator,
  Text,
  VStack,
  createListCollection,
  useBreakpointValue,
} from "@chakra-ui/react";
import { NAVIGATION_SECTIONS } from "@/constants/navigation";
import { BsFillPlusCircleFill } from "react-icons/bs";
import { useLocation, useNavigate } from "react-router-dom";
import NavBarSearch from "./NavBarSearch";
import React from "react";

interface SidebarContentProps {
  onNavigate?: () => void; // Optional callback for when navigation occurs (useful for closing drawer)
}

export const SidebarContent: React.FC<SidebarContentProps> = ({
  onNavigate,
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  // useBreakpointValue acceptable here: controls navigation click behavior (close drawer on mobile).
  // See ADR-007 for CSS-vs-JS responsive patterns.
  const isMobile =
    useBreakpointValue({ base: true, lg: false }, { ssr: false }) ?? true;

  // Get current active path to highlight the correct item
  const getCurrentActiveValue = (): string[] => {
    const currentPath = location.pathname;
    // Find the navigation item that matches the current path
    for (const section of NAVIGATION_SECTIONS) {
      const matchingItem = section.items.find(
        (item) => item.path === currentPath
      );
      if (matchingItem) {
        return [matchingItem.value];
      }
    }
    return [];
  };

  // Handle navigation selection
  const handleNavigation = (details: { value: string[] }) => {
    const selectedValue = details.value[0];
    if (!selectedValue) return;

    // Find the navigation item by value
    for (const section of NAVIGATION_SECTIONS) {
      const item = section.items.find(
        (navItem) => navItem.value === selectedValue
      );
      if (item) {
        if (item.isAction) {
          // Handle special action buttons (like Log)
          // TODO: Implement actual log action
          console.log("Log action triggered");
        } else {
          // Navigate to the path
          navigate(item.path);
        }
        // Call optional callback (for closing drawer)
        onNavigate?.();
        break;
      }
    }
  };

  const userSection = NAVIGATION_SECTIONS.find(
    (section) => section.title === "User"
  );
  const browseSection = NAVIGATION_SECTIONS.find(
    (section) => section.title === "Browse"
  );

  return (
    <VStack align="stretch" gap={0} pt={7} pb={6} px={4}>
      {/* Mobile Search - Only show on mobile */}
      {isMobile && (
        <Box mb={5} px={0}>
          <NavBarSearch onSearch={onNavigate} />
        </Box>
      )}

      {/* Log Button - Outside the combined listbox */}
      {userSection && (
        <Box mb={3}>
          <IconButton
            p={2}
            mb={1}
            variant="outline"
            borderWidth="1px"
            borderColor="border"
            aria-label="Log activity"
            size="sm"
            onClick={() => {
              // TODO: Implement actual log action
              console.log("Log action triggered");
              onNavigate?.();
            }}
          >
            <BsFillPlusCircleFill size={14} />
            LOG
          </IconButton>
        </Box>
      )}

      {/* Combined Navigation Section - Single Listbox */}
      {userSection && browseSection && (
        <Listbox.Root
          collection={createListCollection({
            items: [
              // User items (excluding Log action)
              ...userSection.items
                .filter((item) => !item.isAction)
                .map((item) => ({
                  label: item.label,
                  value: item.value,
                  section: "user",
                })),
              // Browse items
              ...browseSection.items.map((item) => ({
                label: item.label,
                value: item.value,
                section: "browse",
              })),
            ],
          })}
          value={getCurrentActiveValue()}
          onValueChange={handleNavigation}
          selectionMode="single"
        >
          <Listbox.Content background="transparent">
            {/* User items */}
            {userSection.items
              .filter((item) => !item.isAction)
              .map((item) => (
                <Listbox.Item
                  key={item.value}
                  item={{ label: item.label, value: item.value }}
                  px={3}
                  py={2}
                  fontSize="sm"
                  fontWeight="normal"
                  color="foreground"
                  _hover={{ bg: "layer-hover-01" }}
                  _selected={{
                    bg: "layer-selected-01",
                    color: "tertiary-foreground",
                    fontWeight: "medium",
                  }}
                  cursor="pointer"
                  borderRadius="md"
                >
                  <Listbox.ItemText>{item.label}</Listbox.ItemText>
                </Listbox.Item>
              ))}

            {/* Separator inside the listbox */}
            <Box px={3} py={2}>
              <Separator borderColor="border" opacity={0.6} />
            </Box>

            {/* Browse section header inside listbox */}
            <Box px={3} py={1}>
              <Text
                fontSize="xs"
                fontWeight="medium"
                color="muted-foreground"
                textTransform="uppercase"
                letterSpacing="wider"
              >
                {browseSection.title}
              </Text>
            </Box>

            {/* Browse items */}
            {browseSection.items.map((item) => (
              <Listbox.Item
                key={item.value}
                item={{ label: item.label, value: item.value }}
                px={3}
                py={2}
                fontSize="sm"
                fontWeight="normal"
                color="foreground"
                _hover={{ bg: "layer-hover-01" }}
                _selected={{
                  bg: "layer-selected-01",
                  color: "tertiary-foreground",
                  fontWeight: "medium",
                }}
                cursor="pointer"
                borderRadius="md"
              >
                <Listbox.ItemText>{item.label}</Listbox.ItemText>
              </Listbox.Item>
            ))}
          </Listbox.Content>
        </Listbox.Root>
      )}
    </VStack>
  );
};

export default SidebarContent;
