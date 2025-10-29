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
import { useMovieCollectionState } from "@/components/movie/collection/useMovieCollectionState";

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

	// Determine actual filter style: when advanced filters are shown, use expanded style
	// This ensures maxRating and other advanced filter params are properly sent to API
	const actualFilterStyle = showAdvanced ? "expanded" : filterStyle;

	// Use the movie fetch router hook to route between search/discover endpoints
	const enhancedFetcher = useMovieFetchRouter({
		fetcher: actualFetcher,
		filters: unifiedFilters,
		filterStyle: actualFilterStyle,
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
					filterStyle={actualFilterStyle}
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
