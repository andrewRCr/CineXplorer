import { useCallback } from "react";
import { Box, VStack, Button, HStack, Text, Separator } from "@chakra-ui/react";
import { FiFilter, FiX } from "react-icons/fi";
import GenreSelector from "./GenreSelector";
import YearSelector from "./YearSelector";
import RatingSelector from "./RatingSelector";
import SortSelector from "./SortSelector";
import type { SortOptionValue } from "@/constants/movieFilterOptions";
import type { MinimalMovieFilters } from "./LetterboxdStyleFilters";

export interface MovieFilters {
	query: string;
	genres: number[];
	minYear: string;
	maxYear: string;
	minRating: string;
	maxRating: string;
	minRuntime: string;
	maxRuntime: string;
	sortBy: SortOptionValue;
}

interface MovieFiltersProps {
	filters: MovieFilters;
	minimalFilters?: MinimalMovieFilters;
	onFiltersChange: (
		filtersOrUpdater:
			| Partial<MovieFilters>
			| ((prevFilters: MovieFilters) => MovieFilters)
	) => void;
	isCollapsed?: boolean;
	onToggleCollapse?: () => void;
}

const AdvancedMovieFilters = ({
	filters,
	minimalFilters,
	onFiltersChange,
	isCollapsed = false,
	onToggleCollapse,
}: MovieFiltersProps) => {
	const updateFilter = useCallback(
		<K extends keyof MovieFilters>(key: K, value: MovieFilters[K]) => {
			onFiltersChange((prevFilters) => ({
				...prevFilters,
				[key]: value,
			}));
		},
		[onFiltersChange]
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

	const hasAdvancedActiveFilters =
		filters.query ||
		filters.genres.length > 0 ||
		filters.minYear ||
		filters.maxYear ||
		filters.minRating ||
		filters.maxRating ||
		filters.minRuntime ||
		filters.maxRuntime ||
		filters.sortBy !== "popularity.desc";

	const hasMinimalActiveFilters = minimalFilters
		? minimalFilters.genres.length > 0 || minimalFilters.year !== ""
		: false;

	const hasActiveFilters = hasAdvancedActiveFilters || hasMinimalActiveFilters;

	if (isCollapsed) {
		return (
			<Box mb={4}>
				<Button
					onClick={onToggleCollapse}
					variant="outline"
					size="sm"
				borderColor="border.separator"
				_hover={{
					borderColor: "accent.primary",
					backgroundColor: "background.subItem",
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
			mb={0}
			ml={4}
			p={6}
		border="1px solid"
		borderColor="border.input"
		borderRadius="md"
		backgroundColor="background.subItem"
		>
			<HStack justify="space-between" mb={4}>
			<Text fontSize="lg" fontWeight="medium" color="text.main">
					Advanced Filters
				</Text>
				<HStack>
					{hasActiveFilters && (
						<Button
							onClick={clearFilters}
							size="sm"
							variant="ghost"
							colorScheme="red"
						>
							<FiX style={{ marginRight: "6px" }} />
							Clear Filters
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

				<Separator />

				<HStack gap={8} align="end">
					<Box>
						<YearSelector
							minYear={filters.minYear}
							maxYear={filters.maxYear}
							onMinYearChange={(year) => updateFilter("minYear", year)}
							onMaxYearChange={(year) => updateFilter("maxYear", year)}
						/>
					</Box>
					<Box>
						<RatingSelector
							minRating={filters.minRating}
							maxRating={filters.maxRating}
							onMinRatingChange={(rating) => updateFilter("minRating", rating)}
							onMaxRatingChange={(rating) => updateFilter("maxRating", rating)}
						/>
					</Box>
					<Box>
						<SortSelector
							value={filters.sortBy}
							onChange={(sort) => updateFilter("sortBy", sort)}
						/>
					</Box>
				</HStack>
			</VStack>
		</Box>
	);
};

export default AdvancedMovieFilters;
