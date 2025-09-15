import { useState, useEffect, useCallback } from "react";
import { useLocation, Outlet, useNavigate } from "react-router-dom";
import { Box } from "@chakra-ui/react";
import MovieFilters, {
	type MovieFilters as MovieFiltersType,
} from "@/components/movie/filters/AdvancedMovieFilters";
import LetterboxdStyleFilters, {
	type MinimalMovieFilters,
} from "@/components/movie/filters/LetterboxdStyleFilters";
import { COLORS } from "@/constants/theme";
import type { PaginatedMoviesResponse } from "@/services/movieService";
import { useEnhancedFetcher } from "@/hooks/useEnhancedFetcher";
import { initializeFiltersFromUrl } from "@/utilities/urlSync";
import {
	fetchNowPlayingMoviesService,
	fetchUpcomingMovies,
	fetchTopRatedMoviesService,
	fetchSearchMoviesService,
	fetchDiscoverMoviesService,
} from "@/services/movieService";
import { PAGINATED_SOURCES } from "@/constants/routes";

// Helper function to get fetcher and source based on route
const getFetcherAndSource = (pathname: string) => {
	// Get query parameter for search
	const getQueryParam = () => {
		if (typeof window === "undefined") return "";
		const params = new URLSearchParams(window.location.search);
		return params.get("query") || "";
	};

	if (pathname.includes("/now-playing")) {
		return {
			fetcher: (
				page: number,
				filters?: Record<string, string | number | number[]>
			) =>
				fetchNowPlayingMoviesService.getPaginated<PaginatedMoviesResponse>({
					page,
					...filters,
				}),
			source: PAGINATED_SOURCES.NOW_PLAYING,
			title: "Now Playing",
		};
	}
	if (pathname.includes("/upcoming")) {
		return {
			fetcher: (
				page: number,
				filters?: Record<string, string | number | number[]>
			) =>
				fetchUpcomingMovies().getPaginated<PaginatedMoviesResponse>({
					page,
					...filters,
				}),
			source: PAGINATED_SOURCES.UPCOMING,
			title: "Upcoming",
		};
	}
	if (pathname.includes("/popular")) {
		return {
			fetcher: (
				page: number,
				filters?: Record<string, string | number | number[]>
			) =>
				fetchDiscoverMoviesService.getPaginated<PaginatedMoviesResponse>({
					page,
					sort_by: "popularity.desc",
					...filters,
				}),
			source: PAGINATED_SOURCES.POPULAR,
			title: "Popular",
		};
	}
	if (pathname.includes("/top-rated")) {
		return {
			fetcher: (
				page: number,
				filters?: Record<string, string | number | number[]>
			) =>
				fetchTopRatedMoviesService.getPaginated<PaginatedMoviesResponse>({
					page,
					...filters,
				}),
			source: PAGINATED_SOURCES.TOP_RATED,
			title: "Top Rated",
		};
	}
	if (pathname.includes("/search")) {
		const query = getQueryParam();
		return {
			fetcher: (
				page: number,
				filters?: Record<string, string | number | number[]>
			) =>
				fetchSearchMoviesService.getPaginated<PaginatedMoviesResponse>({
					page,
					query,
					...filters,
				}),
			source: PAGINATED_SOURCES.SEARCH,
			title: `Search Results${query ? ` for "${query}"` : ""}`,
		};
	}
	// Default fallback
	return {
		fetcher: (
			page: number,
			filters?: Record<string, string | number | number[]>
		) =>
			fetchDiscoverMoviesService.getPaginated<PaginatedMoviesResponse>({
				page,
				...filters,
			}),
		source: PAGINATED_SOURCES.POPULAR,
		title: "Movies",
	};
};

interface MovieCollectionLayoutProps {
	title?: string;
	fetcher?: (
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

const MovieCollectionLayout = ({
	title,
	fetcher,
	source,
	showFilters = false,
	defaultFilters,
	filterStyle = "expanded",
	currentPage,
}: MovieCollectionLayoutProps) => {
	console.log(
		"🎬 MovieCollectionLayout: COMPONENT STARTED with currentPage:",
		currentPage
	);

	const location = useLocation();
	const navigate = useNavigate();

	// Get fetcher and source based on current route
	const {
		fetcher: routeFetcher,
		source: routeSource,
		title: routeTitle,
	} = getFetcherAndSource(location.pathname);

	// Use provided props or route-based defaults
	const actualFetcher = fetcher || routeFetcher;
	const actualSource = source || routeSource;
	const actualTitle = title || routeTitle;
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

	// Parse current page from URL
	const getCurrentPageFromUrl = useCallback((): number | undefined => {
		if (typeof window === "undefined") return undefined;
		const params = new URLSearchParams(location.search);
		const pageParam = params.get("page");
		const page = pageParam ? parseInt(pageParam, 10) : undefined;
		return page && !isNaN(page) && page > 0 ? page : undefined;
	}, [location.search]);

	const [currentPageFromUrl, setCurrentPageFromUrl] = useState<
		number | undefined
	>(getCurrentPageFromUrl());

	// This effect is the SINGLE SOURCE OF TRUTH for filters and page number.
	// It runs whenever the URL's search parameters change.
	useEffect(() => {
		console.log(
			"MovieCollectionLayout: URL changed, re-initializing state from URL.",
			location.search
		);
		const newPage = getCurrentPageFromUrl();
		setCurrentPageFromUrl(newPage);

		const { filters: urlFilters, minimalFilters: urlMinimalFilters } =
			initializeFiltersFromUrl(filterStyle, location.search);
		setFilters(urlFilters);
		setMinimalFilters(urlMinimalFilters);
	}, [location.search, filterStyle, getCurrentPageFromUrl]);

	// This callback is passed to the grid to handle page changes
	const handlePageChange = useCallback(
		(page: number) => {
			const searchParams = new URLSearchParams(location.search);
			if (page === 1) {
				searchParams.delete("page");
			} else {
				searchParams.set("page", page.toString());
			}
			navigate(`${location.pathname}?${searchParams.toString()}`, {});
		},
		[location.pathname, location.search, navigate]
	);

	// This callback is passed to filter components.
	// It constructs a new URL and uses navigate() to update it.
	const handleFiltersChange = useCallback(
		(
			newFiltersOrUpdater:
				| Partial<MovieFiltersType>
				| ((prev: MovieFiltersType) => MovieFiltersType)
		) => {
			const newFilters =
				typeof newFiltersOrUpdater === "function"
					? newFiltersOrUpdater(filters)
					: { ...filters, ...newFiltersOrUpdater };

			const searchParams = new URLSearchParams(location.search);

			// Reset page to 1 when filters change
			searchParams.delete("page");

			// Update params from new filters
			Object.entries(newFilters).forEach(([key, value]) => {
				if (
					value === "" ||
					(Array.isArray(value) && value.length === 0) ||
					(key === "sortBy" && value === "popularity.desc")
				) {
					searchParams.delete(key);
				} else if (Array.isArray(value)) {
					searchParams.set(key, value.join(","));
				} else {
					searchParams.set(key, String(value));
				}
			});

			navigate(`${location.pathname}?${searchParams.toString()}`, {
				replace: true,
			});
		},
		[filters, location.pathname, location.search, navigate]
	);

	// Reset pagination state when route/source changes
	useEffect(() => {
		console.log(
			"MovieCollectionLayout: Route/source changed - resetting pagination",
			{ source: actualSource }
		);

		const searchParams = new URLSearchParams(location.search);
		const hasPageParam = searchParams.has("page");

		if (hasPageParam) {
			console.log(
				"MovieCollectionLayout: Page parameter exists, removing it on route change."
			);
			searchParams.delete("page");
			navigate(`${location.pathname}?${searchParams.toString()}`, {
				replace: true,
			});
		}
	}, [actualSource, location.pathname, navigate]); // Only depend on pathname and source

	// Use the enhanced fetcher hook
	const enhancedFetcher = useEnhancedFetcher({
		fetcher: actualFetcher,
		filters,
		minimalFilters,
		filterStyle,
	});

	console.log("MovieCollectionLayout: defaultFilters", defaultFilters);
	console.log("MovieCollectionLayout: currentPage", currentPage);
	console.log("MovieCollectionLayout: currentPageFromUrl", currentPageFromUrl);
	console.log("MovieCollectionLayout: Passing to MovieCollectionGrid", {
		source: actualSource,
		query: defaultFilters?.query,
	});

	return (
		<Box
			width="100%"
			maxW="1400px"
			mx="auto"
			px={4}
			pt={3}
			pb={4}
			minHeight="100vh"
			display="flex"
			flexDirection="column"
			alignItems="flex-start"
		>
			{/* Fixed Header Section - Never shrinks or moves */}
			<Box
				flexShrink={0}
				mb={6}
				minHeight="60px"
				display="flex"
				alignItems="flex-end"
				width="100%"
			>
				<Box
					fontSize="3xl"
					fontWeight="normal"
					fontStyle="italic"
					color={COLORS.text.main}
					textAlign="left"
					mb={1}
					position="relative"
					display="block"
				>
					{actualTitle}
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

			{/* Fixed Filters Section - Never shrinks or moves */}
			{showFilters && filterStyle === "minimal" && (
				<Box flexShrink={0} mb={2} minHeight="40px">
					<LetterboxdStyleFilters
						filters={minimalFilters}
						onFiltersChange={handleFiltersChange}
						showAdvanced={showAdvanced}
						onToggleAdvanced={() => setShowAdvanced(!showAdvanced)}
						pageSource={source}
					/>
				</Box>
			)}

			{showFilters && filterStyle === "expanded" && (
				<Box flexShrink={0} mb={6} minHeight="200px">
					<MovieFilters
						filters={filters}
						onFiltersChange={handleFiltersChange}
						isCollapsed={isFiltersCollapsed}
						onToggleCollapse={() => setIsFiltersCollapsed(!isFiltersCollapsed)}
					/>
				</Box>
			)}

			{showFilters && showAdvanced && filterStyle === "minimal" && (
				<Box flexShrink={0} mb={6}>
					<MovieFilters
						filters={filters}
						minimalFilters={minimalFilters}
						onFiltersChange={handleFiltersChange}
						isCollapsed={false}
						onToggleCollapse={() => setShowAdvanced(false)}
					/>
				</Box>
			)}

			{/* Fixed Content Container - Takes remaining space, never shrinks below minHeight */}
			<Box
				flex="1"
				minHeight="600px"
				display="flex"
				flexDirection="column"
				width="100%"
				position={"relative"}
			>
				<Outlet
					context={{
						fetcher: actualFetcher,
						source: actualSource,
						query: defaultFilters?.query,
						initialCurrentPage: currentPage || currentPageFromUrl,
						onPageChange: handlePageChange, // Pass the handler down
						enhancedFetcher,
					}}
				/>
			</Box>
		</Box>
	);
};

export default MovieCollectionLayout;
