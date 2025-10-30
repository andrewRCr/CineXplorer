import { useMemo, type ReactNode } from "react";
import { useLocation, Outlet } from "react-router-dom";
import { Box } from "@chakra-ui/react";
import { type MovieFilters as MovieFiltersType } from "@/components/movie/filters/AdvancedMovieFilters";
import { useMovieFetchRouter } from "@/hooks/useMovieFetchRouter";
import {
	getFetcherAndSource,
	type RouteConfig,
} from "@/utilities/routeConfigHelper";
import PageHeader from "@/components/movie/collection/PageHeader";
import FilterSection from "@/components/movie/collection/FilterSection";
import {
	useMovieCollectionState,
	hasAdvancedFilterValues,
} from "@/components/movie/collection/useMovieCollectionState";

// Better prop patterns with discriminated unions and required/optional groups
type FilterConfig =
	| { showFilters?: false; filterStyle?: never; defaultFilters?: never }
	| {
			showFilters: true;
			filterStyle?: "expanded" | "minimal";
			defaultFilters?: Partial<MovieFiltersType>;
	  };

type MovieCollectionLayoutProps = {
	// Core props - can be provided or auto-detected from route
	title?: string;
	fetcher?: RouteConfig["fetcher"];
	source?: string;
	currentPage?: number;
	// Layout customization
	size?: "sm" | "md" | "lg" | "xl";
	// Header customization
	headerProps?: {
		size?: "sm" | "md" | "lg" | "xl";
		showAccent?: boolean;
		children?: ReactNode;
	};
	// Container customization
	containerProps?: {
		maxW?: string;
		px?: number | string;
		pt?: number | string;
		pb?: number | string;
	};
} & FilterConfig;

const MovieCollectionLayout = ({
	title,
	fetcher,
	source,
	showFilters = false,
	defaultFilters,
	filterStyle = "expanded",
	currentPage,
	size = "xl",
	headerProps,
	containerProps,
}: MovieCollectionLayoutProps) => {
	const location = useLocation();

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

	// Use custom hook for state management with auto-expand
	const {
		filters: unifiedFilters,
		onFiltersChange: handleUnifiedFiltersChange,
		currentPage: currentPageFromUrl,
		onPageChange: handlePageChange,
		showAdvanced,
		toggleAdvanced,
		isFiltersCollapsed,
		toggleFiltersCollapsed,
	} = useMovieCollectionState({
		defaultFilters,
		source: actualSource,
	});

	/**
	 * Filter Style Split: API vs UI Rendering
	 *
	 * CONTEXT: The backend has two filter parameter modes:
	 * - "minimal": Only sends basic params (year, genres, sortBy) - simpler query strings
	 * - "expanded": Sends all params including rating ranges - needed for advanced filters
	 *
	 * PROBLEM: We want to keep the minimal filter UI visible even when advanced filters
	 * are expanded (Letterboxd-style UX), but API needs "expanded" mode to receive rating params.
	 *
	 * SOLUTION: Split the filterStyle concept into two separate concerns:
	 *
	 * 1. API Filter Style (apiFilterStyle):
	 *    - Determines which params are sent to backend
	 *    - Based on ACTUAL FILTER VALUES, not UI visibility state
	 *    - "expanded" when rating filters or custom year ranges are active
	 *    - "minimal" otherwise
	 *    - Used by: useMovieFetchRouter hook for API calls
	 *
	 * 2. UI Filter Style (filterStyle prop):
	 *    - Determines which UI components are rendered
	 *    - Based on page configuration (discover pages use "minimal" by default)
	 *    - Stays constant regardless of advanced panel visibility
	 *    - Used by: FilterSection component for rendering logic
	 *
	 * WHY THIS MATTERS:
	 * - Prevents unnecessary re-renders when toggling advanced panel with no filters applied
	 * - Ensures API receives correct params when advanced filters ARE applied
	 * - Preserves minimal filter visibility (UX requirement)
	 */
	const apiFilterStyle = hasAdvancedFilterValues(unifiedFilters) ? "expanded" : filterStyle;

	// Use the movie fetch router hook to route between search/discover endpoints
	const enhancedFetcher = useMovieFetchRouter({
		fetcher: actualFetcher,
		filters: unifiedFilters,
		filterStyle: apiFilterStyle,
	});

	// Memoized container configuration for better performance
	const containerConfig = useMemo(() => {
		const sizeMap = {
			sm: { maxW: "600px", px: 3, pt: 2, pb: 3 },
			md: { maxW: "800px", px: 3, pt: 2, pb: 3 },
			lg: { maxW: "1200px", px: 4, pt: 3, pb: 4 },
			xl: { maxW: "1400px", px: 4, pt: 3, pb: 4 },
		};
		return { ...sizeMap[size], ...containerProps };
	}, [size, containerProps]);

	// Memoized outlet context to prevent unnecessary re-renders
	const outletContext = useMemo(
		() => {
			return {
				fetcher: actualFetcher,
				source: actualSource,
				query: defaultFilters?.query,
				initialCurrentPage: currentPage || currentPageFromUrl,
				onPageChange: handlePageChange,
				enhancedFetcher,
			};
		},
		[
			actualFetcher,
			actualSource,
			defaultFilters?.query,
			currentPage,
			currentPageFromUrl,
			handlePageChange,
			enhancedFetcher,
		]
	);

	return (
		<Box
			width="100%"
			mx="auto"
			minHeight="100vh"
			display="flex"
			flexDirection="column"
			alignItems="flex-start"
			{...containerConfig}
		>
			{/* Enhanced Page Header with better composition */}
			<PageHeader
				title={actualTitle}
				size={headerProps?.size || "lg"}
				showAccent={headerProps?.showAccent ?? true}
			>
				{headerProps?.children}
			</PageHeader>

			{/* Conditionally rendered Filter Section */}
			{showFilters && (
				<FilterSection
					showFilters={showFilters}
					filterStyle={filterStyle}
					showAdvanced={showAdvanced}
					filters={unifiedFilters}
					onFiltersChange={handleUnifiedFiltersChange}
					onToggleAdvanced={toggleAdvanced}
					isFiltersCollapsed={isFiltersCollapsed}
					onToggleCollapse={toggleFiltersCollapsed}
					source={source}
				/>
			)}

			{/* Content Container with consistent flex behavior */}
			<Box
				flex="1"
				minHeight="600px"
				display="flex"
				flexDirection="column"
				width="100%"
				position="relative"
			>
				<Outlet context={outletContext} />
			</Box>
		</Box>
	);
};

export default MovieCollectionLayout;
