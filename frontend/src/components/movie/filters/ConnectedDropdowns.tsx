import { Box, HStack, Select, createListCollection, Button } from "@chakra-ui/react";
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
	const updateFilter = <K extends keyof UnifiedMovieFilters>(
		key: K,
		value: UnifiedMovieFilters[K]
	) => {
		onFiltersChange((prevFilters) => {
			const newFilters = { ...prevFilters, [key]: value };
			return newFilters;
		});
	};

	// --- Genre Display Logic ---
	const isMultipleGenres = filters.genres.length > 1;
	const selectedGenreId =
		filters.genres.length === 1 ? filters.genres[0] : null;
	const isAdvancedGenre =
		selectedGenreId !== null &&
		!coreGenreOptions.some((g) => String(g.value) === String(selectedGenreId));

	const getGenreDisplay = () => {
		if (isMultipleGenres) {
			return { value: "multiple", label: "Multiple" };
		}
		if (isAdvancedGenre) {
			const genre = genreOptions.find(
				(g) => String(g.value) === String(selectedGenreId)
			);
			return {
				value: String(selectedGenreId),
				label: genre ? genre.label : "Custom",
			};
		}
		return null;
	};

	const genreDisplay = getGenreDisplay();
	const isGenreDisabled = isMultipleGenres || isAdvancedGenre;

	// --- Year Display Logic ---
	const isDecadeRange =
		!!filters.minYear &&
		!!filters.maxYear &&
		parseInt(filters.maxYear) - parseInt(filters.minYear) === 9 &&
		filters.minYear.endsWith("0");

	const isYearCustom =
		!!filters.minYear &&
		!!filters.maxYear &&
		filters.minYear !== filters.maxYear && // It's a range...
		!isDecadeRange; // ...and it's NOT a pre-defined decade range.
	
	const yearDisplayValue = () => {
		if (isYearCustom) return "custom";
		if (
			filters.minYear &&
			filters.maxYear &&
			filters.minYear === filters.maxYear
		)
			return filters.minYear;
		if (
			filters.minYear &&
			filters.maxYear &&
			parseInt(filters.maxYear) - parseInt(filters.minYear) === 9
		)
			return `${filters.minYear.slice(0, 4)}'s`;
		return "";
	};

	// --- Runtime Display Logic ---
	const isRuntimeComplex =
		!!filters.minRuntime &&
		!!filters.maxRuntime &&
		`${filters.minRuntime}-${filters.maxRuntime}` !== "0-90" &&
		`${filters.minRuntime}-${filters.maxRuntime}` !== "90-120" &&
		`${filters.minRuntime}-${filters.maxRuntime}` !== "120-150" &&
		filters.maxRuntime !== "999";
	
	const runtimeDisplayValue = () => {
		if (isRuntimeComplex) return "custom";
		if (filters.minRuntime && filters.maxRuntime === "999")
			return `${filters.minRuntime}+`;
		if (filters.minRuntime && filters.maxRuntime)
			return `${filters.minRuntime}-${filters.maxRuntime}`;
		return "";
	};

	// Collections
	const genreCollection = createListCollection({
		items: [
			...(genreDisplay && genreDisplay.value !== "multiple"
				? [
						{
							label: genreDisplay.label,
							value: genreDisplay.value,
						},
				  ]
				: []),
			...(isMultipleGenres ? [{ label: "Multiple", value: "multiple" }] : []),
			...coreGenreOptions.map((option) => ({
				label: option.label,
				value: String(option.value),
			})),
		],
	});

	const yearCollection = createListCollection({
		items: [
			...(isYearCustom ? [{ label: "Custom", value: "custom" }] : []),
			...yearOptions.map((option) => ({
				label: option.label,
				value: option.value,
			})),
		],
	});

	const runtimeCollection = createListCollection({
		items: [
			...(isRuntimeComplex ? [{ label: "Custom", value: "custom" }] : []),
			...runtimeOptions.map((option) => ({
				label: option.label,
				value: option.value,
			})),
		],
	});

	return (
		<HStack gap={0} align="stretch">
			{/* Genre dropdown */}
			<Box position="relative">
				<Select.Root
					collection={genreCollection}
					value={
						genreDisplay
							? [genreDisplay.value]
							: filters.genres.map(String)
					}
					onValueChange={(details) => {
						const value = details.value[0];
						updateFilter(
							"genres",
							value ? [parseInt(value, 10)] : []
						);
					}}
					disabled={isGenreDisabled}
					positioning={{ placement: "bottom-start", gutter: 2 }}
				>
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
								fontStyle: isGenreDisabled ? "italic" : "normal",
								color: isGenreDisabled
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
					value={[yearDisplayValue()]}
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
					disabled={isYearCustom}
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
								fontStyle: isYearCustom ? "italic" : "normal",
								color: isYearCustom
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

			{/* Runtime dropdown */}
			<Box position="relative">
				<Select.Root
					collection={runtimeCollection}
					value={[runtimeDisplayValue()]}
					onValueChange={(details) => {
						const value = details.value[0];
						if (value.includes("+")) {
							const min = value.replace("+", "");
							onFiltersChange((prev) => ({
								...prev,
								minRuntime: min,
								maxRuntime: "999",
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
					disabled={isRuntimeComplex}
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
								fontStyle: isRuntimeComplex ? "italic" : "normal",
								color: isRuntimeComplex
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

export default ConnectedDropdowns;