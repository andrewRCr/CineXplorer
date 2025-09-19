import { useState } from "react";
import { Box, Input, IconButton } from "@chakra-ui/react";
import { FiSearch } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { COLORS } from "@/constants/theme";
import { ROUTES } from "@/constants/routes";

interface NavBarSearchProps {
	onSearch?: () => void; // Optional callback for when search is performed (useful for mobile drawer closing)
}

const NavBarSearch = ({ onSearch }: NavBarSearchProps = {}) => {
	const [query, setQuery] = useState("");
	const [isHovered, setIsHovered] = useState(false);
	const navigate = useNavigate();

	const handleSearch = () => {
		if (query.trim()) {
			// Navigate to search results page with the query parameter
			navigate(
				`${ROUTES.SEARCH_RESULTS}?query=${encodeURIComponent(query.trim())}`
			);
			// Call optional callback (useful for closing mobile drawer)
			onSearch?.();
		}
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			handleSearch();
		}
	};

	return (
		<Box
			display="flex"
			alignItems="center"
			maxW="300px"
			w="100%"
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
			borderRadius="md"
			border="1px solid"
			borderColor="border.separator"
			backgroundColor={isHovered ? COLORS.background.subItem : "transparent"}
			transition="all 0.2s ease"
			_focusWithin={{
				borderColor: COLORS.background.subItem,
				boxShadow: `0 0 0 1px ${COLORS.background.subItem}`,
				backgroundColor: "transparent",
			}}
		>
			<Input
				value={query}
				onChange={(e) => setQuery(e.target.value)}
				onKeyPress={handleKeyPress}
				placeholder="Search movies..."
				size="sm"
				border="none"
				outline="none"
				backgroundColor="transparent"
				borderRadius="md 0 0 md"
				_focus={{
					border: "none",
					boxShadow: "none",
					outline: "none",
				}}
				_hover={{}}
			/>
			<IconButton
				onClick={handleSearch}
				size="sm"
				variant="ghost"
				aria-label="Search"
				borderRadius="0 md md 0"
				backgroundColor="transparent"
				border="none"
				_hover={{
					backgroundColor: "transparent",
				}}
				_active={{
					backgroundColor: "transparent",
				}}
				disabled={!query.trim()}
				color={!query.trim() ? COLORS.text.secondary : COLORS.text.main}
			>
				<FiSearch />
			</IconButton>
		</Box>
	);
};

export default NavBarSearch;
