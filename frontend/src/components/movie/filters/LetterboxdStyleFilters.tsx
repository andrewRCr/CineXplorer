import { useEffect, useState } from "react";
import { Box, Text, HStack, Button, Input } from "@chakra-ui/react";
import { FiFilter, FiSearch } from "react-icons/fi";
import { COLORS } from "@/constants/theme";

export interface MinimalMovieFilters {
	genres: number[];
	year: string;
	rating: string;
	runtime: string;
	query: string;
	sortBy: string;
}

interface LetterboxdStyleFiltersProps {
	filters: MinimalMovieFilters;
	onFiltersChange: (filters: MinimalMovieFilters) => void;
	showAdvanced?: boolean;
	onToggleAdvanced?: () => void;
}

const LetterboxdStyleFilters = ({
	filters,
	onFiltersChange,
	showAdvanced = false,
	onToggleAdvanced,
}: LetterboxdStyleFiltersProps) => {
	const [localQuery, setLocalQuery] = useState(filters.query);

	useEffect(() => {
		setLocalQuery(filters.query);
	}, [filters.query]);

	const updateFilter = <K extends keyof MinimalMovieFilters>(
		key: K,
		value: MinimalMovieFilters[K]
	) => {
		if (key === "sortBy") {
			const sortValue = value as string;
			if (sortValue === "runtime_90") {
				onFiltersChange({
					...filters,
					runtime: "90",
					sortBy: "popularity.desc",
				});
				return;
			} else if (sortValue === "runtime_120") {
				onFiltersChange({
					...filters,
					runtime: "120",
					sortBy: "popularity.desc",
				});
				return;
			} else if (sortValue === "rating_desc") {
				onFiltersChange({
					...filters,
					sortBy: "vote_average.desc",
					runtime: "",
				});
				return;
			} else if (sortValue === "rating_asc") {
				onFiltersChange({
					...filters,
					sortBy: "vote_average.asc",
					runtime: "",
				});
				return;
			}
		}
		onFiltersChange({
			...filters,
			[key]: value,
		});
	};

	const clearFilters = () => {
		setLocalQuery("");
		onFiltersChange({
			genres: [],
			year: "",
			rating: "",
			runtime: "",
			query: "",
			sortBy: "popularity.desc",
		});
	};

	const hasActiveFilters =
		filters.genres.length > 0 ||
		filters.year ||
		filters.rating ||
		filters.runtime ||
		filters.query ||
		filters.sortBy !== "popularity.desc";

	const getCurrentSortValue = () => {
		if (filters.runtime === "90") return "runtime_90";
		if (filters.runtime === "120") return "runtime_120";
		if (filters.sortBy === "vote_average.desc") return "rating_desc";
		if (filters.sortBy === "vote_average.asc") return "rating_asc";
		return filters.sortBy;
	};

	// Simplified genre options for the compact view
	const genreOptions = [
		{ value: "", label: "All Genres" },
		{ value: "28", label: "Action" },
		{ value: "12", label: "Adventure" },
		{ value: "16", label: "Animation" },
		{ value: "35", label: "Comedy" },
		{ value: "18", label: "Drama" },
		{ value: "27", label: "Horror" },
		{ value: "878", label: "Sci-Fi" },
		{ value: "53", label: "Thriller" },
	];

	const yearOptions = [
		{ value: "", label: "Any Year" },
		{ value: "2025", label: "2025" },
		{ value: "2024", label: "2024" },
		{ value: "2023", label: "2023" },
		{ value: "2020s", label: "2020s" },
		{ value: "2010s", label: "2010s" },
		{ value: "2000s", label: "2000s" },
		{ value: "1990s", label: "1990s" },
		{ value: "1980s", label: "1980s" },
		{ value: "1970s", label: "1970s" },
		{ value: "1960s", label: "1960s" },
		{ value: "1950s", label: "1950s" },
		{ value: "1940s", label: "1940s" },
		{ value: "1930s", label: "1930s" },
	];

	const sortOptions = [
		{ value: "popularity.desc", label: "Popular" },
		{ value: "release_date.desc", label: "Newest" },
		{ value: "release_date.asc", label: "Oldest" },
		{ value: "title.asc", label: "A-Z" },
		{ value: "runtime_90", label: "Under 90 min" },
		{ value: "runtime_120", label: "Under 2 hrs" },
		{ value: "rating_desc", label: "Highest Rated First" },
		{ value: "rating_asc", label: "Lowest Rated First" },
	];

	return (
		<Box mb={4}>
			{/* Centered filter controls */}
			<HStack justify="center" align="stretch" maxW="1200px" mx="auto">
				{/* Browse by label */}
				<Text
					fontSize="sm"
					fontWeight="medium"
					color={COLORS.text.secondary}
					mr={4}
					alignSelf="center"
					flexShrink={0}
				>
					Browse by
				</Text>

				{/* Connected dropdowns and search */}
				<HStack gap={0} align="stretch" flex="1" maxW="1000px">
					{/* Genre dropdown */}
					<Box position="relative">
						<select
							value={
								filters.genres.length > 0 ? filters.genres[0].toString() : ""
							}
							onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
								updateFilter(
									"genres",
									e.target.value ? [parseInt(e.target.value)] : []
								)
							}
							style={{
								width: "120px",
								padding: "6px 12px",
								border: `1px solid ${COLORS.border.input}`,
								borderRadius: "4px 0 0 4px",
								borderRight: "none",
								backgroundColor: COLORS.background.main,
								color: COLORS.text.main,
								fontSize: "14px",
								outline: "none",
								cursor: "pointer",
							}}
						>
							{genreOptions.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
					</Box>

					{/* Year dropdown */}
					<Box position="relative">
						<select
							value={filters.year}
							onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
								updateFilter("year", e.target.value)
							}
							style={{
								width: "100px",
								padding: "6px 12px",
								border: `1px solid ${COLORS.border.input}`,
								borderRadius: "0",
								backgroundColor: COLORS.background.main,
								color: COLORS.text.main,
								fontSize: "14px",
								outline: "none",
								cursor: "pointer",
							}}
						>
							{yearOptions.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
					</Box>

					{/* Sort dropdown */}
					<Box position="relative">
						<select
							value={getCurrentSortValue()}
							onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
								updateFilter("sortBy", e.target.value)
							}
							style={{
								width: "140px",
								padding: "6px 12px",
								border: `1px solid ${COLORS.border.input}`,
								borderRadius: "0",
								backgroundColor: COLORS.background.main,
								color: COLORS.text.main,
								fontSize: "14px",
								outline: "none",
								cursor: "pointer",
							}}
						>
							{sortOptions.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
					</Box>

					{/* Advanced filters toggle */}
					{onToggleAdvanced && (
						<Button
							onClick={onToggleAdvanced}
							size="sm"
							variant="outline"
							borderRadius="0 4px 4px 0"
							borderColor={COLORS.border.input}
							borderLeft="none"
							backgroundColor={
								showAdvanced ? COLORS.accent.primary : COLORS.background.main
							}
							color={showAdvanced ? "white" : COLORS.text.main}
							_hover={{
								backgroundColor: showAdvanced
									? COLORS.accent.secondary
									: COLORS.background.subItem,
								borderColor: COLORS.accent.primary,
							}}
							minW="auto"
							px={3}
							height="32px"
						>
							<FiFilter size={14} />
						</Button>
					)}

					{/* Spacer */}
					<Box width="20px" flexShrink={0} />

					{/* Search input */}
					<Box position="relative" flex="1" maxW="250px">
						<Input
							placeholder="Search movies..."
							value={localQuery}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
								setLocalQuery(e.target.value)
							}
							onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
								if (e.key === "Enter") {
									updateFilter("query", localQuery);
								}
							}}
							size="sm"
							borderRadius="4px 0 0 4px"
							borderColor={COLORS.border.input}
							borderRight="none"
							backgroundColor={COLORS.background.main}
							color={COLORS.text.main}
							_focus={{
								borderColor: COLORS.accent.primary,
								boxShadow: `0 0 0 1px ${COLORS.accent.primary}`,
								zIndex: 1,
							}}
							_hover={{
								borderColor: COLORS.accent.secondary,
							}}
							fontSize="14px"
							height="32px"
						/>
					</Box>

					{/* Search button */}
					<Button
						aria-label="Search"
						onClick={() => updateFilter("query", localQuery)}
						size="sm"
						borderRadius="0 4px 4px 0"
						borderColor={COLORS.border.input}
						borderLeft="none"
						backgroundColor={COLORS.background.main}
						color={COLORS.text.main}
						_hover={{
							backgroundColor: COLORS.background.subItem,
							borderColor: COLORS.accent.secondary,
						}}
						height="32px"
						minW="32px"
						px={2}
					>
						<FiSearch />
					</Button>
				</HStack>
			</HStack>

			{/* Clear filters button */}
			{hasActiveFilters && (
				<Box textAlign="center" mt={3}>
					<Button
						onClick={clearFilters}
						size="xs"
						variant="ghost"
						colorScheme="red"
						fontSize="xs"
					>
						Clear filters
					</Button>
				</Box>
			)}
		</Box>
	);
};

export default LetterboxdStyleFilters;
