import { Box, Button } from "@chakra-ui/react";
import type { MovieFilters as UnifiedMovieFilters } from "./AdvancedMovieFilters";

interface ClearFiltersButtonProps {
	filters: UnifiedMovieFilters;
	onClearFilters: () => void;
	showAdvanced: boolean;
}

const ClearFiltersButton = ({
	filters,
	onClearFilters,
	showAdvanced,
}: ClearFiltersButtonProps) => {
	const hasActiveFilters =
		filters.genres.length > 0 ||
		filters.minYear !== "" ||
		filters.maxYear !== "" ||
		filters.minRuntime !== "" ||
		filters.maxRuntime !== "";

	return (
		<Box
			position="absolute"
			bottom="-28px" // Position it below the dropdowns
			left="0"
			right="0"
			height="25px"
			display="flex"
			justifyContent="center"
			alignItems="center"
		>
			<Button
				onClick={onClearFilters}
				size="xs"
				variant="ghost"
				colorScheme="red"
				fontSize="xs"
				visibility={
					hasActiveFilters && !showAdvanced ? "visible" : "hidden"
				}
				opacity={hasActiveFilters && !showAdvanced ? 1 : 0}
				transition="visibility 0s, opacity 0.2s ease-in-out"
				mt={4} // Nudge the button down further
			>
				Clear filters
			</Button>
		</Box>
	);
};

export default ClearFiltersButton;
