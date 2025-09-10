import { Input, Box } from "@chakra-ui/react";
import { FiSearch } from "react-icons/fi";
import { COLORS } from "@/constants/theme";

interface SearchBarProps {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
}

const SearchBar = ({
	value,
	onChange,
	placeholder = "Search movies...",
}: SearchBarProps) => {
	return (
		<Box position="relative" maxW="400px">
			<FiSearch
				style={{
					position: "absolute",
					left: "12px",
					top: "50%",
					transform: "translateY(-50%)",
					color: COLORS.text.secondary,
					zIndex: 1,
				}}
			/>
			<Input
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				borderColor={COLORS.border.main}
				pl="40px"
				_focus={{
					borderColor: COLORS.accent.primary,
					boxShadow: `0 0 0 1px ${COLORS.accent.primary}`,
				}}
				_hover={{
					borderColor: COLORS.accent.secondary,
				}}
			/>
		</Box>
	);
};

export default SearchBar;
