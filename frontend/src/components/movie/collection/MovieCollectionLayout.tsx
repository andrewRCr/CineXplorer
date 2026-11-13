import { useMemo, type ReactNode } from "react";
import { useLocation, Outlet } from "react-router";
import { Box } from "@chakra-ui/react";
import type { BrowseParams } from "@/types/browseTypes";
import { useMovieFetchRouter } from "@/hooks/movie/useMovieFetchRouter";
import {
  getFetcherAndSource,
  type RouteConfig,
} from "@/utilities/routeConfigResolver";
import { catalogTitle } from "@/utilities/catalogTitle";
import { catalogWindow } from "@/utilities/catalogWindow";
import { parseSearchParamsFromUrl } from "@/utilities/searchUrlSync";
import PageHeader from "@/components/movie/collection/PageHeader";
import BrowseControlsSection from "@/components/movie/collection/BrowseControlsSection";
import { useMovieCollectionState } from "@/hooks/movie/useMovieCollectionState";

// Better prop patterns with discriminated unions and required/optional groups
type BrowseControlsConfig =
  | { showBrowseControls?: false; defaultBrowseParams?: never }
  | {
      showBrowseControls: true;
      defaultBrowseParams?: Partial<BrowseParams>;
    };

type MovieCollectionLayoutProps = {
  // Core props - can be provided or auto-detected from route
  title?: string;
  fetcher?: RouteConfig["fetcher"];
  source?: string;
  // Layout customization
  size?: "sm" | "md" | "lg" | "xl";
  /** Whether to render PageHeader (default: true). Set false for grids that handle their own title. */
  renderPageHeader?: boolean;
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
  size = "xl",
  renderPageHeader = true,
  headerProps,
  containerProps,
}: MovieCollectionLayoutProps) => {
  const location = useLocation();

  // Get fetcher and source based on current route
  // Pass location.search to ensure React Router location is the source of truth
  const {
    fetcher: routeFetcher,
    source: routeSource,
    title: routeTitle,
  } = getFetcherAndSource(location.pathname, location.search);

  // Use provided props or route-based defaults
  const actualFetcher = fetcher || routeFetcher;
  const actualSource = source || routeSource;
  const currentWindow = catalogWindow(location.pathname);

  // Extract search query from URL for search routes
  // This is needed for TanStack Query cache key and scroll position persistence
  const searchQuery = useMemo(() => {
    if (location.pathname.startsWith("/search")) {
      return parseSearchParamsFromUrl(location.search).query || undefined;
    }
    return undefined;
  }, [location.pathname, location.search]);

  // Use custom hook for state management with auto-expand
  // Note: Pagination is handled internally by TanStack Query (infinite scroll)
  const {
    browseParams,
    onBrowseParamsChange,
    isAdvancedPanelOpen,
    setIsAdvancedPanelOpen,
    toggleAdvancedPanel,
    hasActiveAdvancedFilters,
  } = useMovieCollectionState({
    defaultBrowseParams,
    releaseWindow: currentWindow,
  });

  const actualTitle =
    title ||
    (currentWindow ? catalogTitle(currentWindow, browseParams) : routeTitle);

  // Use the movie fetch router hook to route between search/discover endpoints
  const enhancedFetcher = useMovieFetchRouter({
    fetcher: actualFetcher,
    browseParams,
  });

  // Memoized container configuration for better performance
  const containerConfig = useMemo(() => {
    const sizeMap = {
      sm: { maxW: "600px", px: 3, pt: 2, pb: 3 },
      md: { maxW: "800px", px: 3, pt: 2, pb: 3 },
      lg: { maxW: "1200px", px: 4, pt: 3, pb: 4 },
      xl: { maxW: "1400px", px: 4, pt: 3, pb: 4 },
    };
    const baseConfig = { ...sizeMap[size], ...containerProps };

    // When browse controls are shown, add extra top padding for the fixed sub-nav
    // Uses layout-subnav token via CSS variable
    // When advanced panel is open, add drawer height to push content below
    if (showBrowseControls) {
      baseConfig.pt = isAdvancedPanelOpen
        ? "calc(var(--chakra-sizes-layout-subnav) + var(--chakra-sizes-subnav-advanced-drawer-height))"
        : "var(--chakra-sizes-layout-subnav)";
    }

    return baseConfig;
  }, [size, containerProps, showBrowseControls, isAdvancedPanelOpen]);

  // Memoized outlet context to prevent unnecessary re-renders
  // Note: Pagination is handled internally by child components via TanStack Query
  const outletContext = useMemo(() => {
    return {
      fetcher: actualFetcher,
      source: actualSource,
      // searchQuery is extracted from URL ?query= param for search routes
      query: searchQuery,
      title: actualTitle,
      renderPageHeader,
      enhancedFetcher,
      // browseParams for TanStack Query cache key (filter changes invalidate cache)
      browseParams,
    };
  }, [
    actualFetcher,
    actualSource,
    searchQuery,
    actualTitle,
    renderPageHeader,
    enhancedFetcher,
    browseParams,
  ]);

  return (
    <Box
      width="100%"
      mx="auto"
      minHeight="100vh"
      display="flex"
      flexDirection="column"
      alignItems="flex-start"
      // Smooth transition for padding change when advanced panel opens/closes
      transition={showBrowseControls ? "padding-top 220ms ease" : undefined}
      {...containerConfig}
    >
      {/* Page Header - conditionally rendered (grids can handle their own title) */}
      {renderPageHeader && (
        <PageHeader
          title={actualTitle}
          size={headerProps?.size || "lg"}
          showAccent={headerProps?.showAccent ?? true}
        >
          {headerProps?.children}
        </PageHeader>
      )}

      {/* Conditionally rendered Browse Controls Section */}
      {showBrowseControls && (
        <BrowseControlsSection
          showControls={showBrowseControls}
          isAdvancedPanelOpen={isAdvancedPanelOpen}
          hasActiveAdvancedFilters={hasActiveAdvancedFilters}
          browseParams={browseParams}
          onBrowseParamsChange={onBrowseParamsChange}
          onToggleAdvancedPanel={toggleAdvancedPanel}
          onSetAdvancedPanelOpen={setIsAdvancedPanelOpen}
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
