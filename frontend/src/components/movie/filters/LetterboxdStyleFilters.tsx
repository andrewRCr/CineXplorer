import { useEffect, useState, useRef } from "react";
import {
	Box,
	Text,
	HStack,
	Button,
	Input,
	VStack,
	Select,
	createListCollection,
} from "@chakra-ui/react";
import { FiFilter, FiSearch, FiX } from "react-icons/fi";
import { COLORS } from "@/constants/theme";
import {
	coreGenreOptions,
	genreOptions,
	yearOptions,
	runtimeOptions,
	minimalSortOptions,
} from "@/constants/movieFilterOptions";
import type { MovieFilters as UnifiedMovieFilters } from "./AdvancedMovieFilters";

const GENRE_WIDTH = "140px";
const YEAR_WIDTH = "110px";
const RUNTIME_WIDTH = "130px";
const SORT_WIDTH = "170px";

export interface MinimalMovieFilters {
	genres: number[];
	year: string;
	rating: string;
	runtime: string;
	query: string;
	sortBy: string;
}

interface LetterboxdStyleFiltersProps {
	filters: UnifiedMovieFilters;
	onFiltersChange: (
		filters:
			| Partial<UnifiedMovieFilters>
			| ((prev: UnifiedMovieFilters) => UnifiedMovieFilters)
	) => void;
	showAdvanced?: boolean;
	onToggleAdvanced?: () => void;
	pageSource?: string; // Add page context for smart disabling
}

const LetterboxdStyleFilters = ({
	filters,
	onFiltersChange,
	showAdvanced = false,
	onToggleAdvanced,
	pageSource,
}: LetterboxdStyleFiltersProps) => {
	const [localQuery, setLocalQuery] = useState(filters.query);
	const [isSearchExpanded, setIsSearchExpanded] = useState(false);
	const searchInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		setLocalQuery(filters.query);
	}, [filters.query]);

	// Close search bar when page source changes (e.g., via sidebar navigation)
	useEffect(() => {
		setIsSearchExpanded(false);
	}, [pageSource]);

	const updateFilter = <K extends keyof UnifiedMovieFilters>(
		key: K,
		value: UnifiedMovieFilters[K]
	) => {
		onFiltersChange((prevFilters) => {
			const newFilters = { ...prevFilters, [key]: value };
			return newFilters;
		});
	};

	const clearFilters = () => {
		setLocalQuery("");
		setIsSearchExpanded(false);
		onFiltersChange({
			genres: [],
			minYear: "",
			maxYear: "",
			minRating: "",
			maxRating: "",
			minRuntime: "",
			maxRuntime: "",
			query: "",
			sortBy: "popularity.desc",
		});
	};

	const handleSearchSubmit = () => {
		updateFilter("query", localQuery);
		// Don't close the search bar after submitting - let user close manually
		// setIsSearchExpanded(false);
	};

	const toggleSearch = () => {
		setIsSearchExpanded(!isSearchExpanded);
		// Focus the input when expanding
		if (!isSearchExpanded) {
			setTimeout(() => {
				searchInputRef.current?.focus();
			}, 100);
		}
	};

	const closeSearch = () => {
		setIsSearchExpanded(false);
		// Don't clear the query on close, only on clearFilters
		// setLocalQuery("");
	};

	const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			handleSearchSubmit();
		} else if (e.key === "Escape") {
			setIsSearchExpanded(false);
		}
	};

	const getCurrentSortValue = () => {
		// This function maps the API sort value (from filters.sortBy)
		// back to the value used by the minimal dropdown's sortOptions.
		const apiValue = filters.sortBy;
		switch (apiValue) {
			case "vote_average.desc":
				return "vote_average.desc";
			case "vote_average.asc":
				return "vote_average.asc";
			case "popularity.desc":
				return "popularity.desc";
			case "original_title.asc":
				return "original_title.asc";
			case "original_title.desc":
				return "original_title.desc";
			default:
				return apiValue;
		}
	};

	const hasActiveFilters =
		filters.genres.length > 0 ||
		filters.minYear !== "" ||
		filters.maxYear !== "" ||
		filters.minRuntime !== "" ||
		filters.maxRuntime !== "";

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

	// --- Sort Display Logic ---
	const currentSortValue = getCurrentSortValue();
	const isSortCustom = !minimalSortOptions.some(
		(opt) => opt.value === currentSortValue
	);

	const sortDisplayValue = () => {
		if (isSortCustom) return "custom";
		return currentSortValue;
	};

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

	const sortCollection = createListCollection({
		items: [
			...(isSortCustom ? [{ label: "Custom", value: "custom" }] : []),
			...minimalSortOptions.map((option) => {
				const isDisabled =
					(pageSource === "popular" && option.value === "popularity.desc") ||
					(pageSource === "top-rated" && option.value === "vote_average.desc");
				return {
					label: option.label + (isDisabled ? " (current)" : ""),
					value: option.value,
					disabled: isDisabled,
				};
			}),
		],
	});

	return (
		<VStack
			w="100%"
			p={4}
			bg={COLORS.background.main}
			gap={4} // Use gap instead of spacing
			align="stretch"
			overflow="visible" // Allow content (like the advanced menu) to overflow
		>
			<Box
				maxW="1200px"
				w="100%"
				mx="auto"
				display="flex"
				flexDirection="column"
				gap={4}
			>
				{/* Main filter controls container */}
				<HStack justify="center" align="stretch" w="100%">
					{/* Browse by label */}
					<Text
						fontSize="sm"
						fontWeight="medium"
						color={COLORS.text.secondary}
						mr={2}
						alignSelf="center"
						flexShrink={0}
					>
						Browse by
					</Text>

					{/* Connected dropdowns and search */}
					<HStack gap={1} align="center" flex="1" maxW="1000px">
						{/* Wrapper for dropdowns and clear button */}
						<Box position="relative">
							{/* Filter dropdowns */}
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
											borderColor={COLORS.border.subtle}
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
											borderColor={COLORS.border.subtle}
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
											borderColor={COLORS.border.subtle}
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
										borderColor={COLORS.border.subtle}
										minW="auto"
										px={3}
										height="32px"
									>
										<FiFilter size={14} />
									</Button>
								)}
							</HStack>
							{/* Absolutely positioned container for the clear filters button */}
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
									onClick={clearFilters}
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
						</Box>

						{/* Spacer to separate filters from sort */}
						<Box width="20px" flexShrink={0} />

						{/* Sort by label */}
						<Text
							fontSize="sm"
							fontWeight="medium"
							color={COLORS.text.secondary}
							alignSelf="center"
							flexShrink={0}
							mr={2}
						>
							Sort by
						</Text>

						{/* Sort dropdown */}
						<Box position="relative">
							<Select.Root
								collection={sortCollection}
								value={[sortDisplayValue()]}
								onValueChange={(details) => {
									const selectedItem = sortCollection.items.find(
										(item) => item.value === details.value[0]
									);
									if (
										selectedItem &&
										"disabled" in selectedItem &&
										!selectedItem.disabled
									) {
										updateFilter(
											"sortBy",
											details.value[0] as UnifiedMovieFilters["sortBy"]
										);
									}
								}}
								disabled={isSortCustom}
								positioning={{ placement: "bottom-start", gutter: 2 }}
							>
								<Select.Trigger
									w={SORT_WIDTH}
									minH="32px"
									h="32px"
									fontSize="14px"
									lineHeight="1.2"
									borderRadius="4px"
									border="1px solid"
									borderColor={COLORS.border.subtle}
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
											fontStyle: isSortCustom ? "italic" : "normal",
											color: isSortCustom
												? COLORS.text.secondary
												: COLORS.text.main,
										},
										"& [data-part='indicator']": {
											width: "16px",
											height: "16px",
										},
									}}
								>
									<Select.ValueText placeholder="Sort by" />
									<Select.Indicator />
								</Select.Trigger>
								<Select.Positioner>
									<Select.Content
										w={SORT_WIDTH}
										bg={COLORS.background.subItem}
										borderColor={COLORS.border.main}
									>
										{sortCollection.items.map((item) => (
											<Select.Item
												key={item.value}
												item={item}
												style={{
													color:
														"disabled" in item && item.disabled
															? COLORS.text.secondary
															: COLORS.text.main,
													fontStyle:
														"disabled" in item && item.disabled
															? "italic"
															: "normal",
												}}
												_hover={
													"disabled" in item && item.disabled
														? {}
														: { bg: COLORS.accent.primary }
												}
											>
												{item.label}
											</Select.Item>
										))}
									</Select.Content>
								</Select.Positioner>
							</Select.Root>
						</Box>

						{/* Spacer before search */}
						<Box width="20px" flexShrink={0} />

						{/* --- Unified Collapsible Search Component (Final) --- */}
						<HStack
							alignSelf="center"
							gap={0}
							align="stretch"
							border="1px solid"
							borderColor={COLORS.border.subtle}
							borderRadius="4px"
							width={isSearchExpanded ? "260px" : "32px"}
							height="32px"
							transition="width 0.3s ease-in-out"
							overflow="hidden" // Prevents content from spilling during animation
						>
							<Input
								ref={searchInputRef}
								placeholder="Search results..."
								value={localQuery}
								onChange={(e) => setLocalQuery(e.target.value)}
								onKeyDown={handleSearchKeyDown}
								size="sm"
								border="none"
								borderRadius="0"
								backgroundColor={COLORS.background.main}
								color={COLORS.text.main}
								_focus={{ boxShadow: "none" }}
								fontSize="14px"
								height="30px"
								flex="1"
								p={isSearchExpanded ? 2 : 0} // No padding when collapsed
								minW="0" // Allows input to shrink to 0
								opacity={isSearchExpanded ? 1 : 0}
								visibility={isSearchExpanded ? "visible" : "hidden"}
								transition="opacity 0.2s 0.1s, visibility 0.2s 0.1s, padding 0.3s"
								disabled={!isSearchExpanded}
							/>
							<Button
								aria-label={isSearchExpanded ? "Submit search" : "Open search"}
								onClick={isSearchExpanded ? handleSearchSubmit : toggleSearch}
								size="sm"
								variant="ghost"
								borderRadius={0}
								backgroundColor={COLORS.background.main}
								color={COLORS.text.main}
								_hover={{
									backgroundColor: COLORS.background.subItem,
								}}
								height="30px"
								minW="30px"
								p={0}
								flexShrink={0}
							>
								<FiSearch size={14} />
							</Button>
							{isSearchExpanded && (
								<Button
									aria-label="Close search"
									onClick={closeSearch}
									size="sm"
									variant="ghost"
									borderRadius="0 4px 4px 0"
									backgroundColor="transparent"
									color={COLORS.text.secondary}
									_hover={{
										backgroundColor: COLORS.background.subItem,
										color: COLORS.text.main,
									}}
									height="30px"
									minW="30px"
									p={0}
									flexShrink={0}
									opacity={isSearchExpanded ? 1 : 0}
									transition="opacity 0.2s ease-in-out 0.1s"
								>
									<FiX size={16} />
								</Button>
							)}
						</HStack>
					</HStack>
				</HStack>
			</Box>
		</VStack>
	);
};

export default LetterboxdStyleFilters;
