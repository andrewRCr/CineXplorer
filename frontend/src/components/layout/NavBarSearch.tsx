import { useState } from "react";
import { Box, Input, Button } from "@chakra-ui/react";
import { FiSearch } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { COLORS } from "@/constants/theme";

const NavBarSearch = () => {
	const [query, setQuery] = useState("");
	const navigate = useNavigate();

	const handleSearch = () => {
		if (query.trim()) {
			// Navigate to a search results page with the query
			// For now, we'll navigate to the home page with a search param
			// TODO: Create a dedicated search results page
			navigate(`/?search=${encodeURIComponent(query.trim())}`);
		}
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			handleSearch();
		}
	};

	return (
		<Box display="flex" alignItems="center" maxW="300px" w="100%">
			<Input
				value={query}
				onChange={(e) => setQuery(e.target.value)}
				onKeyPress={handleKeyPress}
				placeholder="Search movies..."
				size="sm"
				borderColor={COLORS.border.main}
				_focus={{
					borderColor: COLORS.accent.primary,
					boxShadow: `0 0 0 1px ${COLORS.accent.primary}`,
				}}
				_hover={{
					borderColor: COLORS.accent.secondary,
				}}
				borderRadius="md 0 0 md"
			/>
			<Button
				onClick={handleSearch}
				size="sm"
				borderRadius="0 md md 0"
				border={`1px solid ${COLORS.border.main}`}
				borderLeft="none"
				backgroundColor={COLORS.background.navBar}
				_hover={{
					backgroundColor: COLORS.accent.primary,
					borderColor: COLORS.accent.primary,
				}}
				_active={{
					backgroundColor: COLORS.accent.secondary,
				}}
				disabled={!query.trim()}
			>
				<FiSearch />
			</Button>
		</Box>
	);
};

export default NavBarSearch;
