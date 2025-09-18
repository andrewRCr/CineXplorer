import { Box, HStack, Select, createListCollection, Button } from "@chakra-ui/react";
import { memo, useMemo, useCallback } from "react";
import { FiFilter } from "react-icons/fi";
import { COLORS } from "@/constants/theme";
import {
	coreGenreOptions,
	genreOptions,
	yearOptions,
	runtimeOptions,
} from "@/constants/movieFilterOptions";
import type { MovieFilters as UnifiedMovieFilters } from "./AdvancedMovieFilters";

const GENRE_WIDTH = "140px";
const YEAR_WIDTH = "110px";
const RUNTIME_WIDTH = "130px";

interface ConnectedDropdownsProps {
	filters: UnifiedMovieFilters;
	onFiltersChange: (
		filters:
			| Partial<UnifiedMovieFilters>
			| ((prev: UnifiedMovieFilters) => UnifiedMovieFilters)
	) => void;
	onToggleAdvanced?: () => void;
}

const ConnectedDropdowns = ({
	filters,
	onFiltersChange,
	onToggleAdvanced,
}: ConnectedDropdownsProps) => {
	// Memoize the filter update function to prevent recreation
	const updateFilter = useCallback(<K extends keyof UnifiedMovieFilters>(
		key: K,
		value: UnifiedMovieFilters[K]
	) => {
		onFiltersChange((prevFilters) => {
			const newFilters = { ...prevFilters, [key]: value };
			return newFilters;
		});
	}, [onFiltersChange]);

	// Memoize expensive genre display calculations
	const genreDisplayData = useMemo(() => {
		const isMultipleGenres = filters.genres.length > 1;
		const selectedGenreId = filters.genres.length === 1 ? filters.genres[0] : null;
		const isAdvancedGenre = selectedGenreId !== null && 
			!coreGenreOptions.some((g) => String(g.value) === String(selectedGenreId));

		let genreDisplay = null;
		if (isMultipleGenres) {
			genreDisplay = { value: "multiple", label: "Multiple" };
		} else if (isAdvancedGenre) {
			const genre = genreOptions.find(
				(g) => String(g.value) === String(selectedGenreId)
			);
			genreDisplay = {
				value: String(selectedGenreId),
				label: genre ? genre.label : "Custom",
			};
		}

		return {
			isMultipleGenres,
			selectedGenreId,
			isAdvancedGenre,
			genreDisplay,
			isGenreDisabled: isMultipleGenres || isAdvancedGenre,
		};
	}, [filters.genres]);

	// Memoize year display calculations
	const yearDisplayData = useMemo(() => {
		const isDecadeRange = !!filters.minYear &&
			!!filters.maxYear &&
			parseInt(filters.maxYear) - parseInt(filters.minYear) === 9 &&
			filters.minYear.endsWith("0");

		const isYearCustom = !!filters.minYear &&
			!!filters.maxYear &&
			filters.minYear !== filters.maxYear &&
			!isDecadeRange;

		let yearDisplayValue = "";
		if (isYearCustom) {
			yearDisplayValue = "custom";
		} else if (filters.minYear && filters.maxYear && filters.minYear === filters.maxYear) {
			yearDisplayValue = filters.minYear;
		} else if (filters.minYear && filters.maxYear && 
					 parseInt(filters.maxYear) - parseInt(filters.minYear) === 9) {
			yearDisplayValue = `${filters.minYear.slice(0, 4)}'s`;
		}

		return {
			isDecadeRange,
			isYearCustom,
			yearDisplayValue,
		};
	}, [filters.minYear, filters.maxYear]);

	// Memoize runtime display calculations
	const runtimeDisplayData = useMemo(() => {
		const isRuntimeComplex = !!filters.minRuntime &&
			!!filters.maxRuntime &&
			`${filters.minRuntime}-${filters.maxRuntime}` !== "0-90" &&
			`${filters.minRuntime}-${filters.maxRuntime}` !== "90-120" &&
			`${filters.minRuntime}-${filters.maxRuntime}` !== "120-150" &&
			filters.maxRuntime !== "999";

		let runtimeDisplayValue = "";
		if (isRuntimeComplex) {
			runtimeDisplayValue = "custom";
		} else if (filters.minRuntime && filters.maxRuntime === "999") {
			runtimeDisplayValue = `${filters.minRuntime}+`;
		} else if (filters.minRuntime && filters.maxRuntime) {
			runtimeDisplayValue = `${filters.minRuntime}-${filters.maxRuntime}`;
		}

		return {
			isRuntimeComplex,
			runtimeDisplayValue,
		};
	}, [filters.minRuntime, filters.maxRuntime]);

	// Memoize collections to prevent array recreation on every render
	const genreCollection = useMemo(() => createListCollection({
		items: [
			...(genreDisplayData.genreDisplay && genreDisplayData.genreDisplay.value !== "multiple"
				? [{
						label: genreDisplayData.genreDisplay.label,
						value: genreDisplayData.genreDisplay.value,
				  }]
				: []),
			...(genreDisplayData.isMultipleGenres ? [{ label: "Multiple", value: "multiple" }] : []),
			...coreGenreOptions.map((option) => ({
				label: option.label,
				value: String(option.value),
			})),
		],
	}), [genreDisplayData]);

	const yearCollection = useMemo(() => createListCollection({
		items: [
			...(yearDisplayData.isYearCustom ? [{ label: "Custom", value: "custom" }] : []),
			...yearOptions.map((option) => ({
				label: option.label,
				value: option.value,
			})),
		],
	}), [yearDisplayData.isYearCustom]);

	const runtimeCollection = useMemo(() => createListCollection({
		items: [
			...(runtimeDisplayData.isRuntimeComplex ? [{ label: "Custom", value: "custom" }] : []),
			...runtimeOptions.map((option) => ({
				label: option.label,
				value: option.value,
			})),
		],
	}), [runtimeDisplayData.isRuntimeComplex]);

	return (
		<HStack gap={0} align="stretch">
			{/* Genre dropdown */}
			<Box position="relative">
				<Select.Root
					collection={genreCollection}
					value={
						genreDisplayData.genreDisplay
							? [genreDisplayData.genreDisplay.value]
							: filters.genres.map(String)
					}
					onValueChange={(details) => {
						const value = details.value[0];
						updateFilter(
							"genres",
							value ? [parseInt(value, 10)] : []
						);
					}}
					disabled={genreDisplayData.isGenreDisabled}
					positioning={{ placement: "bottom-start", gutter: 2 }}>
					<Select.Trigger
						w={GENRE_WIDTH}
						minH="32px"
						h="32px"
						fontSize="14px"
						lineHeight="1.2"
				borderRadius="4px 0 0 4px"
						border="1px solid"
						borderColor="gray.200"
						backgroundColor="transparent"
						_hover={{
							backgroundColor: COLORS.background.subItem,
						}}
						_disabled={{
							opacity: 1,
							cursor: "not-allowed",
						}}
						css={{
							padding: "6px 12px",
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							"& > span": {
								fontStyle: genreDisplayData.isGenreDisabled ? "italic" : "normal",
								color: genreDisplayData.isGenreDisabled
									? COLORS.text.secondary
									: COLORS.text.main,
							},
							"& [data-part='indicator']": {
								width: "16px",
								height: "16px",
							},
						}}
					>
						<Select.ValueText placeholder="Any Genre" />
						<Select.Indicator />
					</Select.Trigger>
					<Select.Positioner>
						<Select.Content
							w={GENRE_WIDTH}
							bg={COLORS.background.subItem}
							borderColor={COLORS.border.main}
						>
							{genreCollection.items.map((item) => (
								<Select.Item
									key={item.value}
									item={item}
									_hover={{ bg: COLORS.accent.primary }}
								>
									{item.label}
								</Select.Item>
							))}
						</Select.Content>
					</Select.Positioner>
				</Select.Root>
			</Box>

			{/* Year dropdown */}
			<Box position="relative">
				<Select.Root
					collection={yearCollection}
					value={[yearDisplayData.yearDisplayValue]}
					onValueChange={(details) => {
						const value = details.value[0];
						if (value.endsWith("'s")) {
							const startYear = parseInt(value.slice(0, 4));
							const endYear = startYear + 9;
							onFiltersChange((prev) => ({
								...prev,
								minYear: startYear.toString(),
								maxYear: endYear.toString(),
							}));
						} else if (value) {
							onFiltersChange((prev) => ({
								...prev,
								minYear: value,
								maxYear: value,
							}));
						} else {
							onFiltersChange((prev) => ({
								...prev,
								minYear: "",
								maxYear: "",
							}));
						}
					}}
					disabled={yearDisplayData.isYearCustom}
					positioning={{ placement: "bottom-start", gutter: 2 }}
				>
					<Select.Trigger
						w={YEAR_WIDTH}
						minH="32px"
						h="32px"
						fontSize="14px"
						lineHeight="1.2"
				borderRadius="0"
						border="1px solid"
						borderColor="gray.200"
						backgroundColor="transparent"
						_hover={{
							backgroundColor: COLORS.background.subItem,
						}}
						_disabled={{
							opacity: 1,
							cursor: "not-allowed",
						}}
						css={{
							padding: "6px 12px",
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							"& > span": {
								fontStyle: yearDisplayData.isYearCustom ? "italic" : "normal",
								color: yearDisplayData.isYearCustom
									? COLORS.text.secondary
									: COLORS.text.main,
							},
							"& [data-part='indicator']": {
								width: "16px",
								height: "16px",
							},
						}}
					>
						<Select.ValueText placeholder="Year" />
						<Select.Indicator />
					</Select.Trigger>
					<Select.Positioner>
						<Select.Content
							w={YEAR_WIDTH}
							bg={COLORS.background.subItem}
							borderColor={COLORS.border.main}
						>
							{yearCollection.items.map((item) => (
								<Select.Item
									key={item.value}
									item={item}
									_hover={{ bg: COLORS.accent.primary }}
								>
									{item.label}
								</Select.Item>
							))}
						</Select.Content>
					</Select.Positioner>
				</Select.Root>
			</Box>

			{/* Runtime dropdown - DISABLED due to TMDB API limitations */}
			{/* 
				TMDB's runtime filtering is fundamentally broken due to data contamination
				from user-submitted translations. TMDB has acknowledged this issue but won't fix it.
				
				To re-enable runtime filtering, you would need to:
				1. Implement client-side runtime filtering with individual movie detail API calls
				2. Add caching layer to avoid performance issues
				3. Accept 2-5 second page load delays for runtime-filtered results
				
				Preserved code below for future implementation:
			*/}
			{false && (
				<Box position="relative">
					<Select.Root
						collection={runtimeCollection}
						value={[runtimeDisplayData.runtimeDisplayValue]}
						onValueChange={(details) => {
							const value = details.value[0];
							if (value.includes("+")) {
								const min = value.replace("+", "");
								onFiltersChange((prev) => ({
									...prev,
									minRuntime: min,
									maxRuntime: "400", // Fixed from 999
								}));
							} else if (value) {
								const [min, max] = value.split("-");
								onFiltersChange((prev) => ({
									...prev,
									minRuntime: min,
									maxRuntime: max,
								}));
							} else {
								onFiltersChange((prev) => ({
									...prev,
									minRuntime: "",
									maxRuntime: "",
								}));
							}
						}}
						disabled={runtimeDisplayData.isRuntimeComplex}
						positioning={{ placement: "bottom-start", gutter: 2 }}
					>
						<Select.Trigger
							w={RUNTIME_WIDTH}
							minH="32px"
							h="32px"
							fontSize="14px"
							lineHeight="1.2"
					borderRadius="0"
							border="1px solid"
							borderColor="gray.200"
							backgroundColor="transparent"
							_hover={{
								backgroundColor: COLORS.background.subItem,
							}}
							_disabled={{
								opacity: 1,
								cursor: "not-allowed",
							}}
							css={{
								padding: "6px 12px",
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								"& > span": {
									fontStyle: runtimeDisplayData.isRuntimeComplex ? "italic" : "normal",
									color: runtimeDisplayData.isRuntimeComplex
										? COLORS.text.secondary
										: COLORS.text.main,
								},
								"& [data-part='indicator']": {
									width: "16px",
									height: "16px",
								},
							}}
						>
							<Select.ValueText placeholder="Runtime" />
							<Select.Indicator />
						</Select.Trigger>
						<Select.Positioner>
							<Select.Content
								w={RUNTIME_WIDTH}
								bg={COLORS.background.subItem}
								borderColor={COLORS.border.main}
							>
								{runtimeCollection.items.map((item) => (
									<Select.Item
										key={item.value}
										item={item}
										_hover={{ bg: COLORS.accent.primary }}
									>
										{item.label}
									</Select.Item>
								))}
							</Select.Content>
						</Select.Positioner>
				</Select.Root>
				</Box>
			)}

			{/* Advanced filters toggle */}
			{onToggleAdvanced && (
				<Button
					onClick={onToggleAdvanced}
					size="sm"
					variant="outline"
					borderRadius="0 4px 4px 0"
					borderColor="gray.200"
					minW="auto"
					px={3}
					height="32px"
				>
					<FiFilter size={14} />
				</Button>
			)}
		</HStack>
	);
};

// Memoize the component to prevent unnecessary re-renders
const MemoizedConnectedDropdowns = memo(ConnectedDropdowns, (prevProps, nextProps) => {
	// Custom comparison function for optimal performance
	return (
		// Compare filter values that actually affect this component
		prevProps.filters.genres.length === nextProps.filters.genres.length &&
		prevProps.filters.genres.every((genre, index) => genre === nextProps.filters.genres[index]) &&
		prevProps.filters.minYear === nextProps.filters.minYear &&
		prevProps.filters.maxYear === nextProps.filters.maxYear &&
		prevProps.filters.minRuntime === nextProps.filters.minRuntime &&
		prevProps.filters.maxRuntime === nextProps.filters.maxRuntime &&
		// Compare function references
		prevProps.onFiltersChange === nextProps.onFiltersChange &&
		prevProps.onToggleAdvanced === nextProps.onToggleAdvanced
	);
});

MemoizedConnectedDropdowns.displayName = "ConnectedDropdowns";

export default MemoizedConnectedDropdowns;
