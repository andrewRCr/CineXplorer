import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Box } from "@chakra-ui/react";
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
	currentPage?: number;
}

const MovieGridPageLayout = ({
	title,
	fetcher,
	source,
	showFilters = false,
	defaultFilters,
	filterStyle = "expanded",
	currentPage,
}: MovieGridPageLayoutProps) => {
	console.log(
		"🎬 MovieGridPageLayout: COMPONENT STARTED with currentPage:",
		currentPage
	);

	const location = useLocation();
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

	// Parse current page from URL
	const getCurrentPageFromUrl = (): number | undefined => {
		if (typeof window === "undefined") return undefined;
		const params = new URLSearchParams(window.location.search);
		const pageParam = params.get("page");
		const page = pageParam ? parseInt(pageParam, 10) : undefined;
		return page && !isNaN(page) && page > 0 ? page : undefined;
	};

	const [currentPageFromUrl, setCurrentPageFromUrl] = useState<
		number | undefined
	>(getCurrentPageFromUrl());

	// Update currentPageFromUrl when URL changes
	useEffect(() => {
		const newPage = getCurrentPageFromUrl();
		console.log("MovieGridPageLayout: URL changed, new page:", newPage);
		setCurrentPageFromUrl(newPage);
	}, [location.search]); // React to URL search parameter changes

	// Initialize filters from URL parameters
	useEffect(() => {
		const { filters: urlFilters, minimalFilters: urlMinimalFilters } =
			initializeFiltersFromUrl(filterStyle);
		console.log("MovieGridPageLayout: Initializing filters from URL", {
			urlFilters,
			urlMinimalFilters,
		});
		setFilters(urlFilters);
		setMinimalFilters(urlMinimalFilters);
	}, [filterStyle]);

	// Update URL when filters change
	useEffect(() => {
		console.log("MovieGridPageLayout: Filters changed, updating URL", {
			filters,
			minimalFilters,
		});
		updateUrlFromFilters(
			filters,
			minimalFilters,
			filterStyle,
			source === "search"
		);
	}, [filters, minimalFilters, filterStyle, source]);

	// Reset pagination state when route/source changes
	useEffect(() => {
		console.log(
			"MovieGridPageLayout: Route/source changed - resetting pagination",
			{ source }
		);

		// Check if there's already a page parameter in the URL
		const hasPageParam =
			typeof window !== "undefined" &&
			new URLSearchParams(window.location.search).has("page");

		if (hasPageParam) {
			console.log(
				"MovieGridPageLayout: Page parameter exists in URL, preserving it"
			);
			// Don't reset if there's already a page parameter (user navigated directly to a page)
			return;
		}

		// Reset page to 1 when route changes (but not when navigating to a specific page)
		if (typeof window !== "undefined") {
			const url = new URL(window.location.href);
			url.searchParams.delete("page");
			window.history.replaceState({}, "", url.toString());
		}
		// Also reset the MovieGrid component's internal state
		movieGridRef.current?.resetToPageOne();
	}, [source]); // Only depend on source, not currentPage

	// Use the enhanced fetcher hook
	const enhancedFetcher = useEnhancedFetcher({
		fetcher,
		filters,
		minimalFilters,
		filterStyle,
	});

	console.log("MovieGridPageLayout: defaultFilters", defaultFilters);
	console.log("MovieGridPageLayout: currentPage", currentPage);
	console.log("MovieGridPageLayout: currentPageFromUrl", currentPageFromUrl);
	console.log("MovieGridPageLayout: Passing to MovieGrid", {
		source,
		query: defaultFilters?.query,
		initialCurrentPage: currentPage || currentPageFromUrl,
	});

	return (
		<Box maxW="1400px" mx="auto" px={4} pt={3} pb={4}>
			{/* Page Header */}
			<Box mb={6}>
				<Box
					fontSize="3xl"
					fontWeight="normal"
					fontStyle="italic"
					color={COLORS.text.main}
					textAlign="left"
					mb={1}
					position="relative"
					display="inline-block"
				>
					{title}
					<Box
						position="absolute"
						bottom="-2px"
						left="0"
						right="0"
						height="2px"
						backgroundColor={COLORS.accent.primary}
						borderRadius="1px"
					/>
				</Box>
			</Box>

			{showFilters && filterStyle === "minimal" && (
				<Box mb={6}>
					<LetterboxdStyleFilters
						filters={minimalFilters}
						onFiltersChange={setMinimalFilters}
						showAdvanced={showAdvanced}
						onToggleAdvanced={() => setShowAdvanced(!showAdvanced)}
						pageSource={source}
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
			<MovieGrid
				ref={movieGridRef}
				fetcher={enhancedFetcher}
				source={source}
				query={defaultFilters?.query}
				{...((currentPage || currentPageFromUrl) && {
					initialCurrentPage: currentPage || currentPageFromUrl,
				})}
			/>
		</Box>
	);
};

export default MovieGridPageLayout;
