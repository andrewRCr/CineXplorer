import { Box, Text, HStack, Input } from "@chakra-ui/react";
import { COLORS } from "@/constants/theme";

interface YearSelectorProps {
	minYear: string;
	maxYear: string;
	onMinYearChange: (year: string) => void;
	onMaxYearChange: (year: string) => void;
}

const YearSelector = ({
	minYear,
	maxYear,
	onMinYearChange,
	onMaxYearChange,
}: YearSelectorProps) => {
	const currentYear = new Date().getFullYear();

	return (
		<Box>
			<Text fontSize="sm" fontWeight="medium" mb={2} color={COLORS.text.main}>
				Release Year
			</Text>
			<HStack gap={2}>
				<Input
					placeholder="From"
					value={minYear}
					onChange={(e) => onMinYearChange(e.target.value)}
					type="number"
					min="1900"
					max={currentYear}
					size="sm"
					borderColor={COLORS.border.main}
					_focus={{
						borderColor: COLORS.accent.primary,
						boxShadow: `0 0 0 1px ${COLORS.accent.primary}`,
					}}
					_hover={{
						borderColor: COLORS.accent.secondary,
					}}
				/>
				<Text fontSize="sm" color={COLORS.text.secondary}>
					to
				</Text>
				<Input
					placeholder="To"
					value={maxYear}
					onChange={(e) => onMaxYearChange(e.target.value)}
					type="number"
					min="1900"
					max={currentYear}
					size="sm"
					borderColor={COLORS.border.main}
					_focus={{
						borderColor: COLORS.accent.primary,
						boxShadow: `0 0 0 1px ${COLORS.accent.primary}`,
					}}
					_hover={{
						borderColor: COLORS.accent.secondary,
					}}
				/>
			</HStack>
		</Box>
	);
};

export default YearSelector;
