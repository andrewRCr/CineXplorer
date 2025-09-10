import { useState, useEffect, useRef } from "react";
import { Text, Box } from "@chakra-ui/react";
import MovieGrid, { type MovieGridRef } from "@/components/movie/MovieGrid";
import MovieFilters, {
	type MovieFilters as MovieFiltersType,
} from "@/components/movie/filters/AdvancedMovieFilters";
import LetterboxdStyleFilters, {
	type MinimalMovieFilters,
} from "@/components/movie/filters/LetterboxdStyleFilters";
import { COLORS } from "@/constants/theme";
import type { PaginatedMoviesResponse } from "@/services/movieService";
import { useEnhancedFetcher } from "@/hooks/useEnhancedFetcher";
import {
	updateUrlFromFilters,
	initializeFiltersFromUrl,
} from "@/utilities/urlSync";

interface MovieGridPageLayoutProps {
	title: string;
	fetcher: (
		page: number,
		filters?: Record<string, string | number | number[]>
	) => {
		request: Promise<{ data: PaginatedMoviesResponse }>;
		cancel: () => void;
	};
	source?: string;
	showFilters?: boolean;
	defaultFilters?: Partial<MovieFiltersType>;
	filterStyle?: "expanded" | "minimal";
}

const MovieGridPageLayout = ({
	title,
	fetcher,
	source,
	showFilters = false,
	defaultFilters,
	filterStyle = "expanded",
}: MovieGridPageLayoutProps) => {
	const [filters, setFilters] = useState<MovieFiltersType>({
		query: "",
		genres: [],
		minYear: "",
		maxYear: "",
		minRating: "",
		maxRating: "",
		minRuntime: "",
		maxRuntime: "",
		sortBy: "popularity.desc",
		...defaultFilters,
	});

	const [minimalFilters, setMinimalFilters] = useState<MinimalMovieFilters>({
		genres: [],
		year: "",
		rating: "",
		runtime: "",
		query: "",
		sortBy: "popularity.desc",
	});

	const [isFiltersCollapsed, setIsFiltersCollapsed] = useState(false);
	const [showAdvanced, setShowAdvanced] = useState(false);
	const movieGridRef = useRef<MovieGridRef>(null);

	// Initialize filters from URL parameters
	useEffect(() => {
		const { filters: urlFilters, minimalFilters: urlMinimalFilters } =
			initializeFiltersFromUrl(filterStyle);
		setFilters(urlFilters);
		setMinimalFilters(urlMinimalFilters);
	}, [filterStyle]);

	// Update URL when filters change
	useEffect(() => {
		updateUrlFromFilters(filters, minimalFilters, filterStyle);
	}, [filters, minimalFilters, filterStyle]);

	// Reset pagination state when filters change
	useEffect(() => {
		console.log("Filters changed - pagination state automatically reset");
		// Reset page to 1 when filters change
		if (typeof window !== "undefined") {
			const url = new URL(window.location.href);
			url.searchParams.delete("page");
			window.history.replaceState({}, "", url.toString());
		}
		// Also reset the MovieGrid component's internal state
		movieGridRef.current?.resetToPageOne();
	}, [filters, minimalFilters, filterStyle]);

	// Use the enhanced fetcher hook
	const enhancedFetcher = useEnhancedFetcher({
		fetcher,
		filters,
		minimalFilters,
		filterStyle,
	});

	return (
		<Box maxW="1400px" mx="auto" px={4}>
			{/* Page Header */}
			<Box mb={6}>
				<Text
					fontSize="3xl"
					fontWeight="bold"
					color={COLORS.text.main}
					textAlign="left"
					mb={1}
				>
					{title}
				</Text>
				<Box
					height="2px"
					width="60px"
					backgroundColor={COLORS.accent.primary}
					borderRadius="1px"
				/>
			</Box>

			{showFilters && filterStyle === "minimal" && (
				<Box mb={6}>
					<LetterboxdStyleFilters
						filters={minimalFilters}
						onFiltersChange={setMinimalFilters}
						showAdvanced={showAdvanced}
						onToggleAdvanced={() => setShowAdvanced(!showAdvanced)}
					/>
				</Box>
			)}

			{showFilters && filterStyle === "expanded" && (
				<Box mb={6}>
					<MovieFilters
						filters={filters}
						onFiltersChange={setFilters}
						isCollapsed={isFiltersCollapsed}
						onToggleCollapse={() => setIsFiltersCollapsed(!isFiltersCollapsed)}
					/>
				</Box>
			)}

			{showFilters && showAdvanced && filterStyle === "minimal" && (
				<Box mb={6}>
					<MovieFilters
						filters={filters}
						onFiltersChange={setFilters}
						isCollapsed={false}
						onToggleCollapse={() => setShowAdvanced(false)}
					/>
				</Box>
			)}

			{/* Movie Grid Section */}
			<MovieGrid ref={movieGridRef} fetcher={enhancedFetcher} source={source} />
		</Box>
	);
};

export default MovieGridPageLayout;
