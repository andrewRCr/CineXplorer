import { useMemo, type ReactNode } from "react";
import { useLocation, Outlet } from "react-router-dom";
import { Box } from "@chakra-ui/react";
import type { BrowseParams } from "@/types/browseTypes";
import { useMovieFetchRouter } from "@/hooks/useMovieFetchRouter";
import {
  getFetcherAndSource,
  type RouteConfig,
} from "@/utilities/routeConfigHelper";
import PageHeader from "@/components/movie/collection/PageHeader";
import BrowseControlsSection from "@/components/movie/collection/BrowseControlsSection";
import {
  useMovieCollectionState,
  hasAdvancedFilterValues,
} from "@/components/movie/collection/useMovieCollectionState";

// Better prop patterns with discriminated unions and required/optional groups
type BrowseControlsConfig =
  | { showBrowseControls?: false; browseLayout?: never; defaultBrowseParams?: never }
  | {
      showBrowseControls: true;
      browseLayout?: "expanded" | "compact";
      defaultBrowseParams?: Partial<BrowseParams>;
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
} & BrowseControlsConfig;

const MovieCollectionLayout = ({
  title,
  fetcher,
  source,
  showBrowseControls = false,
  defaultBrowseParams,
  browseLayout = "expanded",
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
    browseParams,
    onBrowseParamsChange,
    currentPage: currentPageFromUrl,
    onPageChange: handlePageChange,
    isAdvancedPanelOpen,
    toggleAdvancedPanel,
    isFiltersCollapsed,
    toggleFiltersCollapsed,
  } = useMovieCollectionState({
    defaultBrowseParams,
    source: actualSource,
  });

  /**
   * Browse Layout Split: API vs UI Rendering
   *
   * CONTEXT: The backend has two filter parameter modes:
   * - "compact": Only sends basic params (year, genres, sortBy) - simpler query strings
   * - "expanded": Sends all params including rating ranges - needed for advanced filters
   *
   * PROBLEM: We want to keep the compact browse UI visible even when advanced filters
   * are expanded (Letterboxd-style UX), but API needs "expanded" mode to receive rating params.
   *
   * SOLUTION: Split the browseLayout concept into two separate concerns:
   *
   * 1. API Browse Layout (apiBrowseLayout):
   *    - Determines which params are sent to backend
   *    - Based on ACTUAL FILTER VALUES, not UI visibility state
   *    - "expanded" when rating filters or custom year ranges are active
   *    - "compact" otherwise
   *    - Used by: useMovieFetchRouter hook for API calls
   *
   * 2. UI Browse Layout (browseLayout prop):
   *    - Determines which UI components are rendered
   *    - Based on page configuration (discover pages use "compact" by default)
   *    - Stays constant regardless of advanced panel visibility
   *    - Used by: BrowseControlsSection component for rendering logic
   *
   * WHY THIS MATTERS:
   * - Prevents unnecessary re-renders when toggling advanced panel with no filters applied
   * - Ensures API receives correct params when advanced filters ARE applied
   * - Preserves compact browse visibility (UX requirement)
   */
  const apiBrowseLayout = hasAdvancedFilterValues(browseParams) ? "expanded" : browseLayout;

  // Use the movie fetch router hook to route between search/discover endpoints
  const enhancedFetcher = useMovieFetchRouter({
    fetcher: actualFetcher,
    browseParams,
    browseLayout: apiBrowseLayout,
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
        query: defaultBrowseParams?.query,
        initialCurrentPage: currentPage || currentPageFromUrl,
        onPageChange: handlePageChange,
        enhancedFetcher,
      };
    },
    [
      actualFetcher,
      actualSource,
      defaultBrowseParams?.query,
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

      {/* Conditionally rendered Browse Controls Section */}
      {showBrowseControls && (
        <BrowseControlsSection
          showControls={showBrowseControls}
          browseLayout={browseLayout}
          isAdvancedPanelOpen={isAdvancedPanelOpen}
          browseParams={browseParams}
          onBrowseParamsChange={onBrowseParamsChange}
          onToggleAdvancedPanel={toggleAdvancedPanel}
          isFiltersCollapsed={isFiltersCollapsed}
          onToggleCollapse={toggleFiltersCollapsed}
          source={actualSource}
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
