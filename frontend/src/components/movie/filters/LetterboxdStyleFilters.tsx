import { useEffect, useState, useRef } from "react";
import { Box, Text, HStack, Button, Input, VStack } from "@chakra-ui/react";
import { FiFilter, FiSearch, FiX } from "react-icons/fi";
import { COLORS } from "@/constants/theme";
import {
	coreGenreOptions,
	yearOptions,
	runtimeOptions,
	sortOptions,
} from "@/constants/movieFilterOptions";

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

	const updateFilter = <K extends keyof MinimalMovieFilters>(
		key: K,
		value: MinimalMovieFilters[K]
	) => {
		if (key === "sortBy") {
			const sortValue = value as string;
			if (sortValue === "rating_desc") {
				onFiltersChange({
					...filters,
					sortBy: "vote_average.desc",
				});
				return;
			} else if (sortValue === "rating_asc") {
				onFiltersChange({
					...filters,
					sortBy: "vote_average.asc",
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
		setIsSearchExpanded(false);
		onFiltersChange({
			genres: [],
			year: "",
			rating: "",
			runtime: "",
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
		if (filters.sortBy.startsWith("vote_average")) {
			return filters.sortBy.endsWith(".desc") ? "rating_desc" : "rating_asc";
		}
		return filters.sortBy;
	};

	const hasActiveFilters =
		filters.genres.length > 0 || filters.year !== "" || filters.runtime !== "";

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
						mr={4}
						alignSelf="center"
						flexShrink={0}
					>
						Browse by
					</Text>

					{/* Connected dropdowns and search */}
					<HStack gap={0} align="center" flex="1" maxW="1000px">
						{/* Wrapper for dropdowns and clear button */}
						<Box position="relative">
							{/* Filter dropdowns */}
							<HStack gap={0} align="stretch">
								{/* Genre dropdown */}
								<Box position="relative">
									<select
										value={
											filters.genres.length > 0
												? filters.genres[0].toString()
												: ""
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
											height: "32px",
										}}
									>
										{coreGenreOptions.map((option) => (
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
											height: "32px",
										}}
									>
										{yearOptions.map((option) => (
											<option key={option.value} value={option.value}>
												{option.label}
											</option>
										))}
									</select>
								</Box>

								{/* Runtime dropdown */}
								<Box position="relative">
									<select
										value={filters.runtime}
										onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
											updateFilter("runtime", e.target.value)
										}
										style={{
											width: "120px",
											padding: "6px 12px",
											border: `1px solid ${COLORS.border.input}`,
											borderRadius: "0",
											backgroundColor: COLORS.background.main,
											color: COLORS.text.main,
											fontSize: "14px",
											outline: "none",
											cursor: "pointer",
											height: "32px",
										}}
									>
										{runtimeOptions.map((option) => (
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
											showAdvanced
												? COLORS.accent.primary
												: COLORS.background.main
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
						<Box position="relative" alignSelf="center">
							<select
								value={getCurrentSortValue()}
								onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
									updateFilter("sortBy", e.target.value)
								}
								style={{
									width: "140px",
									padding: "6px 12px",
									border: `1px solid ${COLORS.border.input}`,
									borderRadius: "4px",
									backgroundColor: COLORS.background.main,
									color: COLORS.text.main,
									fontSize: "14px",
									outline: "none",
									cursor: "pointer",
									height: "32px",
								}}
							>
								{sortOptions.map((option) => {
									// Smart disabling based on page context
									const isDisabled =
										(pageSource === "popular" &&
											option.value === "popularity.desc") ||
										(pageSource === "top-rated" &&
											option.value === "vote_average.desc");

									return (
										<option
											key={option.value}
											value={option.value}
											disabled={isDisabled}
											style={{
												color: isDisabled
													? COLORS.text.secondary
													: COLORS.text.main,
												fontStyle: isDisabled ? "italic" : "normal",
											}}
										>
											{option.label}
											{isDisabled ? " (current)" : ""}
										</option>
									);
								})}
							</select>
						</Box>

						{/* Spacer before search */}
						<Box width="20px" flexShrink={0} />

						{/* --- Unified Collapsible Search Component (Final) --- */}
						<HStack
							alignSelf="center"
							gap={0}
							align="stretch"
							border="1px solid"
							borderColor={COLORS.border.input}
							borderRadius="4px"
							width={isSearchExpanded ? "260px" : "32px"}
							height="32px"
							transition="width 0.3s ease-in-out"
							_hover={{
								borderColor: isSearchExpanded
									? COLORS.border.input
									: COLORS.accent.secondary,
							}}
							overflow="hidden" // Prevents content from spilling during animation
						>
							<Input
								ref={searchInputRef}
								placeholder="Search..."
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
