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

	return (
		<VStack align="stretch" gap={0} pt={7} pb={6} px={4}>
			{/* Mobile Search - Only show on mobile */}
			{isMobile && (
				<Box mb={5} px={0}>
					{/* <Text
            fontSize="sm"
            fontWeight="medium"
            color={COLORS.text.secondary}
            mb={3}
          >
            Search
          </Text> */}
					<NavBarSearch onSearch={onNavigate} />
				</Box>
			)}
			{NAVIGATION_SECTIONS.map((section, sectionIndex) => (
				<Box key={section.title}>
					{/* Only show section title for non-User sections */}
					{section.title !== "User" && (
						<Text
							fontSize="sm"
							fontWeight="medium"
							color="text.secondary"
							mb={3}
						>
							{section.title}
						</Text>
					)}

					{/* Special handling for User section with Log button */}
					{section.title === "User" && (
						<>
							{/* Log Button - IconButton with outline variant */}
							<Box mb={3}>
								<IconButton
									p={2}
									mb={1}
									variant="outline"
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
							{/* Other user navigation items (excluding Log) */}
							<Listbox.Root
								collection={createListCollection({
									items: section.items
										.filter((item) => !item.isAction)
										.map((item) => ({
											label: item.label,
											value: item.value,
										})),
								})}
								value={getCurrentActiveValue()}
								onValueChange={handleNavigation}
								selectionMode="single"
							>
								<Listbox.Content>
									{section.items
										.filter((item) => !item.isAction)
										.map((item) => (
											<Listbox.Item
												key={item.value}
												item={{ label: item.label, value: item.value }}
												px={3}
												py={2}
												fontSize="sm"
												fontWeight="normal"
												color="text.main"
												_hover={{ bg: "background.subItem" }}
												_selected={{
													bg: "background.subItem",
													color: "text.main",
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
						</>
					)}

					{/* Regular sections without special Log button handling */}
					{section.title !== "User" && (
						<Listbox.Root
							collection={createListCollection({
								items: section.items.map((item) => ({
									label: item.label,
									value: item.value,
								})),
							})}
							value={getCurrentActiveValue()}
							onValueChange={handleNavigation}
							selectionMode="single"
						>
							<Listbox.Content>
								{section.items.map((item) => (
									<Listbox.Item
										key={item.value}
										item={{ label: item.label, value: item.value }}
										px={3}
										py={2}
										fontSize="sm"
										fontWeight="normal"
										color="text.main"
										_hover={{ bg: "background.subItem" }}
										_selected={{
											bg: "background.subItem",
											color: "text.main",
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

					{/* Add separator between sections (except last one) */}
					{sectionIndex < NAVIGATION_SECTIONS.length - 1 && (
						<Box pt={8} pb={5}>
							<Separator
								borderColor="border.separator"
								alignSelf="center"
							/>
						</Box>
					)}
				</Box>
			))}
		</VStack>
	);
};

export default SidebarContent;
