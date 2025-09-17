import { useState } from "react";
import { useLocation, Outlet } from "react-router-dom";
import { Box } from "@chakra-ui/react";
import { type MovieFilters as MovieFiltersType } from "@/components/movie/filters/AdvancedMovieFilters";
import { useEnhancedFetcher } from "@/hooks/useEnhancedFetcher";
import { getFetcherAndSource, type RouteConfig } from "@/utils/routeConfigHelper";
import PageHeader from "@/components/movie/collection/PageHeader";
import FilterSection from "@/components/movie/collection/FilterSection";
import { useMovieCollectionUrl } from "@/components/movie/collection/useMovieCollectionUrl";


interface MovieCollectionLayoutProps {
	title?: string;
	fetcher?: RouteConfig['fetcher'];
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

	// Local state for filter UI
	const [isFiltersCollapsed, setIsFiltersCollapsed] = useState(false);
	const [showAdvanced, setShowAdvanced] = useState(false);

	// Use custom hook for URL management
	const {
		unifiedFilters,
		currentPageFromUrl,
		handlePageChange,
		handleUnifiedFiltersChange,
	} = useMovieCollectionUrl(defaultFilters, actualSource);

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
			{/* Page Header */}
			<PageHeader title={actualTitle} />

			{/* Filter Section */}
			<FilterSection
				showFilters={showFilters}
				filterStyle={filterStyle}
				showAdvanced={showAdvanced}
				filters={unifiedFilters}
				onFiltersChange={handleUnifiedFiltersChange}
				onToggleAdvanced={() => setShowAdvanced(!showAdvanced)}
				isFiltersCollapsed={isFiltersCollapsed}
				onToggleCollapse={() => setIsFiltersCollapsed(!isFiltersCollapsed)}
				source={source}
			/>

			{/* Content Container */}
			<Box
				flex="1"
				minHeight="600px"
				display="flex"
				flexDirection="column"
				width="100%"
				position="relative"
			>
				<Outlet
					context={{
						fetcher: actualFetcher,
						source: actualSource,
						query: defaultFilters?.query,
						initialCurrentPage: currentPage || currentPageFromUrl,
						onPageChange: handlePageChange,
						enhancedFetcher,
					}}
				/>
			</Box>
		</Box>
	);
};

export default MovieCollectionLayout;
