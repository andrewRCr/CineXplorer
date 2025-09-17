import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, Outlet, useNavigate } from "react-router-dom";
import { Box } from "@chakra-ui/react";
import MovieFilters, {
	type MovieFilters as MovieFiltersType,
} from "@/components/movie/filters/AdvancedMovieFilters";
import LetterboxdStyleFilters from "@/components/movie/filters/LetterboxdStyleFilters";
import { COLORS } from "@/constants/theme";
import { useEnhancedFetcher } from "@/hooks/useEnhancedFetcher";
import { initializeFiltersFromUrl } from "@/utilities/urlSync";
import {
	fetchNowPlayingMoviesService,
	fetchUpcomingMovies,
	fetchTopRatedMoviesService,
	fetchSearchMoviesService,
	fetchDiscoverMoviesService,
	type PaginatedMoviesResponse,
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

	// This is now the single source of truth for all filters.
	const [unifiedFilters, setUnifiedFilters] = useState<MovieFiltersType>({
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
		const newPage = getCurrentPageFromUrl();
		setCurrentPageFromUrl(newPage);

		const { filters: urlFilters, minimalFilters: urlMinimalFilters } =
			initializeFiltersFromUrl(location.search);

		// Combine the filters. Note: This is a shallow merge.
		// You might need a more sophisticated merge strategy if there are overlapping fields
		// that need to be handled in a specific way (e.g., `year` vs `minYear`/`maxYear`).
		const newUnifiedFilters = {
			...unifiedFilters, // Start with existing state to not lose anything
			...urlFilters,
			...urlMinimalFilters,
			// Explicitly handle sortBy to ensure it's correctly typed and prioritized.
			sortBy: (urlMinimalFilters.sortBy ||
				urlFilters.sortBy) as MovieFiltersType["sortBy"],
		};

		setUnifiedFilters(newUnifiedFilters);
	}, [location.search, getCurrentPageFromUrl]);

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

	// This callback is passed to ALL filter components.
	// It constructs a new URL and uses navigate() to update it.
	const handleUnifiedFiltersChange = useCallback(
		(
			newFiltersOrUpdater:
				| Partial<MovieFiltersType>
				| ((prev: MovieFiltersType) => MovieFiltersType)
		) => {
			const newFilters =
				typeof newFiltersOrUpdater === "function"
					? newFiltersOrUpdater(unifiedFilters)
					: { ...unifiedFilters, ...newFiltersOrUpdater };

			const searchParams = new URLSearchParams(location.search);
			searchParams.delete("page");

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
		[unifiedFilters, location.pathname, location.search, navigate]
	);

	// Reset pagination state when route/source changes (but not on browser back/forward)
	// We use a ref to track the previous route to distinguish between programmatic navigation
	// and browser back/forward navigation
	const previousRouteRef = useRef<string | null>(null);
	
	useEffect(() => {
		const currentRouteKey = `${location.pathname}:${actualSource}`;
		
		// If this is the first visit to this component, just store the route
		if (previousRouteRef.current === null) {
			previousRouteRef.current = currentRouteKey;
			return;
		}
		
		// If the route/source has changed, this might be a forward navigation
		if (previousRouteRef.current !== currentRouteKey) {
			// Check if this looks like browser back/forward navigation
			// Browser navigation typically preserves the full URL including query params
			const hasPageParam = new URLSearchParams(location.search).has("page");
			
			// If we have page param, this is likely browser back/forward navigation
			// If no page param, this is likely a fresh navigation that should reset to page 1
			if (!hasPageParam) {
				// This appears to be a fresh navigation (clicking nav links, etc.)
				// Reset pagination state
				const searchParams = new URLSearchParams(location.search);
				searchParams.delete("page");
				navigate(`${location.pathname}?${searchParams.toString()}`, {
					replace: true,
				});
			}
			// If hasPageParam is true, we preserve it (likely browser navigation)
		}
		
		previousRouteRef.current = currentRouteKey;
	}, [actualSource, location.pathname, location.search, navigate]);

	// Use the enhanced fetcher hook
	const enhancedFetcher = useEnhancedFetcher({
		fetcher: actualFetcher,
		filters: unifiedFilters,
		filterStyle,
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
						filters={unifiedFilters}
						onFiltersChange={handleUnifiedFiltersChange}
						showAdvanced={showAdvanced}
						onToggleAdvanced={() => setShowAdvanced(!showAdvanced)}
						pageSource={source}
					/>
				</Box>
			)}

			{showFilters && filterStyle === "expanded" && (
				<Box flexShrink={0} mb={6} minHeight="200px">
					<MovieFilters
						filters={unifiedFilters}
						onFiltersChange={handleUnifiedFiltersChange}
						isCollapsed={isFiltersCollapsed}
						onToggleCollapse={() => setIsFiltersCollapsed(!isFiltersCollapsed)}
					/>
				</Box>
			)}

			{showFilters && showAdvanced && filterStyle === "minimal" && (
				<Box flexShrink={0} mb={6}>
					<MovieFilters
						filters={unifiedFilters}
						onFiltersChange={handleUnifiedFiltersChange}
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
