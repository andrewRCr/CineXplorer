import { useCallback } from "react";
import { Box, VStack, Button, HStack, Text } from "@chakra-ui/react";
import { FiFilter, FiX } from "react-icons/fi";
import { COLORS } from "@/constants/theme";
import GenreSelector from "./GenreSelector";
import YearSelector from "./YearSelector";
import RatingSelector from "./RatingSelector";
import RuntimeSelector from "./RuntimeSelector";
import SortSelector, { type SortOption } from "./SortSelector";

export interface MovieFilters {
	query: string;
	genres: number[];
	minYear: string;
	maxYear: string;
	minRating: string;
	maxRating: string;
	minRuntime: string;
	maxRuntime: string;
	sortBy: SortOption;
}

interface MovieFiltersProps {
	filters: MovieFilters;
	onFiltersChange: (filters: MovieFilters) => void;
	isCollapsed?: boolean;
	onToggleCollapse?: () => void;
}

const AdvancedMovieFilters = ({
	filters,
	onFiltersChange,
	isCollapsed = false,
	onToggleCollapse,
}: MovieFiltersProps) => {
	const updateFilter = useCallback(
		<K extends keyof MovieFilters>(key: K, value: MovieFilters[K]) => {
			onFiltersChange({
				...filters,
				[key]: value,
			});
		},
		[filters, onFiltersChange]
	);

	const clearFilters = useCallback(() => {
		onFiltersChange({
			query: "",
			genres: [],
			minYear: "",
			maxYear: "",
			minRating: "",
			maxRating: "",
			minRuntime: "",
			maxRuntime: "",
			sortBy: "popularity.desc",
		});
	}, [onFiltersChange]);

	const hasActiveFilters =
		filters.query ||
		filters.genres.length > 0 ||
		filters.minYear ||
		filters.maxYear ||
		filters.minRating ||
		filters.maxRating ||
		filters.minRuntime ||
		filters.maxRuntime ||
		filters.sortBy !== "popularity.desc";

	if (isCollapsed) {
		return (
			<Box mb={4}>
				<Button
					onClick={onToggleCollapse}
					variant="outline"
					size="sm"
					borderColor={COLORS.border.main}
					_hover={{
						borderColor: COLORS.accent.primary,
						backgroundColor: COLORS.background.subItem,
					}}
				>
					<FiFilter style={{ marginRight: "6px" }} />
					{hasActiveFilters ? "Filters (Active)" : "Filters"}
				</Button>
			</Box>
		);
	}

	return (
		<Box
			mb={6}
			p={4}
			border={`1px solid ${COLORS.border.main}`}
			borderRadius="md"
			backgroundColor={COLORS.background.subItem}
		>
			<HStack justify="space-between" mb={4}>
				<Text fontSize="lg" fontWeight="medium" color={COLORS.text.main}>
					Filters
				</Text>
				<HStack gap={2}>
					{hasActiveFilters && (
						<Button
							onClick={clearFilters}
							size="sm"
							variant="ghost"
							colorScheme="red"
						>
							<FiX style={{ marginRight: "6px" }} />
							Clear All
						</Button>
					)}
					{onToggleCollapse && (
						<Button onClick={onToggleCollapse} size="sm" variant="ghost">
							<FiFilter style={{ marginRight: "6px" }} />
							Collapse
						</Button>
					)}
				</HStack>
			</HStack>

			<VStack gap={4} align="stretch">
				<GenreSelector
					selectedGenres={filters.genres}
					onChange={(genres) => updateFilter("genres", genres)}
				/>

				<YearSelector
					minYear={filters.minYear}
					maxYear={filters.maxYear}
					onMinYearChange={(year) => updateFilter("minYear", year)}
					onMaxYearChange={(year) => updateFilter("maxYear", year)}
				/>

				<RatingSelector
					minRating={filters.minRating}
					maxRating={filters.maxRating}
					onMinRatingChange={(rating) => updateFilter("minRating", rating)}
					onMaxRatingChange={(rating) => updateFilter("maxRating", rating)}
				/>

				<RuntimeSelector
					minRuntime={filters.minRuntime}
					maxRuntime={filters.maxRuntime}
					onMinRuntimeChange={(runtime) => updateFilter("minRuntime", runtime)}
					onMaxRuntimeChange={(runtime) => updateFilter("maxRuntime", runtime)}
				/>

				<SortSelector
					value={filters.sortBy}
					onChange={(sort) => updateFilter("sortBy", sort)}
				/>
			</VStack>
		</Box>
	);
};

export default AdvancedMovieFilters;
