import { Box } from "@chakra-ui/react";
import MovieFilters, { type MovieFilters as MovieFiltersType } from "@/components/movie/filters/AdvancedMovieFilters";
import LetterboxdStyleFilters from "@/components/movie/filters/LetterboxdStyleFilters";

interface FilterSectionProps {
	showFilters: boolean;
	filterStyle: "expanded" | "minimal";
	showAdvanced: boolean;
	filters: MovieFiltersType;
	onFiltersChange: (
		filters:
			| Partial<MovieFiltersType>
			| ((prev: MovieFiltersType) => MovieFiltersType)
	) => void;
	onToggleAdvanced: () => void;
	isFiltersCollapsed: boolean;
	onToggleCollapse: () => void;
	source?: string;
}

const FilterSection = ({
	showFilters,
	filterStyle,
	showAdvanced,
	filters,
	onFiltersChange,
	onToggleAdvanced,
	isFiltersCollapsed,
	onToggleCollapse,
	source,
}: FilterSectionProps) => {
	if (!showFilters) return null;

	return (
		<>
			{/* Minimal filter style */}
			{filterStyle === "minimal" && (
				<Box flexShrink={0} mb={2} minHeight="40px">
					<LetterboxdStyleFilters
						filters={filters}
						onFiltersChange={onFiltersChange}
						showAdvanced={showAdvanced}
						onToggleAdvanced={onToggleAdvanced}
						pageSource={source}
					/>
				</Box>
			)}

			{/* Expanded filter style */}
			{filterStyle === "expanded" && (
				<Box flexShrink={0} mb={6} minHeight="200px">
					<MovieFilters
						filters={filters}
						onFiltersChange={onFiltersChange}
						isCollapsed={isFiltersCollapsed}
						onToggleCollapse={onToggleCollapse}
						pageSource={source}
					/>
				</Box>
			)}

			{/* Advanced filters overlay for minimal style */}
			{showAdvanced && filterStyle === "minimal" && (
				<Box flexShrink={0} mb={6}>
					<MovieFilters
						filters={filters}
						onFiltersChange={onFiltersChange}
						isCollapsed={false}
						onToggleCollapse={() => onToggleAdvanced()}
						pageSource={source}
					/>
				</Box>
			)}
		</>
	);
};

export default FilterSection;
