import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import type { BrowseParams } from "@/types/browseTypes";
import { DEFAULT_BROWSE_PARAMS, DEFAULT_SORT } from "@/constants/browseDefaults";
import { sortOptions } from "@/constants/browseOptions";
import { useMovieCollectionUrl } from "./useMovieCollectionUrl";
import {
  isLatinScriptLanguage,
  isTitleSort,
} from "@/utilities/sortAvailability";
import {
  hasActiveBrowseParams as checkHasActiveBrowseParams,
  countActiveParams,
} from "@/utilities/browseParamUtils";

// Better hook composition with multiple related concerns
interface UseMovieCollectionStateConfig {
  defaultBrowseParams?: Partial<BrowseParams>;
  source?: string;
  // Hook configuration
  enableUrlSync?: boolean;
  enableAdvancedFilters?: boolean;
  enableCollapsibleFilters?: boolean;
}

interface MovieCollectionState {
  // Browse params state
  browseParams: BrowseParams;
  onBrowseParamsChange: (
    params:
      | Partial<BrowseParams>
      | ((prev: BrowseParams) => BrowseParams)
  ) => void;

  // UI state
  isAdvancedPanelOpen: boolean;
  setIsAdvancedPanelOpen: (open: boolean) => void;
  toggleAdvancedPanel: () => void;

  isFiltersCollapsed: boolean;
  setIsFiltersCollapsed: (collapsed: boolean) => void;
  toggleFiltersCollapsed: () => void;

  // Pagination state
  currentPage: number | undefined;
  onPageChange: (page: number) => void;

  // Derived state
  hasActiveBrowseParams: boolean;
  hasAdvancedFilters: boolean;
  activeParamCount: number;

  // Actions
  resetBrowseParams: () => void;
}

// Minimal filter capabilities (Letterboxd-style UI)
const CORE_GENRE_IDS = [
  "28", // Action
  "35", // Comedy
  "99", // Documentary
  "18", // Drama
  "10751", // Family
  "27", // Horror
  "878", // Science Fiction
  "53", // Thriller
];

// Helper: Check if filters contain advanced filter values
// Exported for use in parent components to determine API filter style
export const hasAdvancedFilterValues = (filters: BrowseParams): boolean => {
  // Rating filters are advanced-only
  if (filters.minRating || filters.maxRating) return true;

  // Custom year range (not single year) is advanced-only
  if (filters.minYear && filters.maxYear && filters.minYear !== filters.maxYear) {
    return true;
  }

  // Multiple genres are advanced-only (minimal supports single genre only)
  if (filters.genres.length > 1) return true;

  // Non-core genres are advanced-only
  if (filters.genres.length === 1) {
    const genreId = String(filters.genres[0]);
    if (!CORE_GENRE_IDS.includes(genreId)) {
      return true;
    }
  }

  // Check for invalid sort options (uses sortOptions from browseOptions.ts)
  if (filters.sortBy && !sortOptions.some(opt => opt.value === filters.sortBy)) {
    return true;
  }

  return false;
};

// Custom hook with better composition and TypeScript
export const useMovieCollectionState = ({
  defaultBrowseParams,
  source,
  enableUrlSync = true,
  enableAdvancedFilters = true,
  enableCollapsibleFilters = true,
}: UseMovieCollectionStateConfig = {}): MovieCollectionState => {

  // URL management (only if enabled)
  const urlState = useMovieCollectionUrl(
    enableUrlSync ? defaultBrowseParams : undefined,
    enableUrlSync ? source : undefined
  );

  // Extract specific functions for stable dependencies
  const {
    browseParams: urlBrowseParams,
    handleBrowseParamsChange: urlHandleBrowseParamsChange,
    currentPageFromUrl: urlCurrentPage,
    handlePageChange: urlHandlePageChange
  } = urlState;

  // Memoize initial local browse params to prevent recreation
  const initialLocalBrowseParams = useMemo(() => ({
    ...DEFAULT_BROWSE_PARAMS,
    ...defaultBrowseParams,
  }), [defaultBrowseParams]);

  // Local UI state for non-URL-synced features
  const [localIsAdvancedPanelOpen, setLocalIsAdvancedPanelOpen] = useState(false);
  const [localIsFiltersCollapsed, setLocalIsFiltersCollapsed] = useState(false);

  // For non-URL-synced mode, maintain local browse params
  const [localBrowseParams, setLocalBrowseParams] = useState<BrowseParams>(initialLocalBrowseParams);

  // Local pagination state for non-URL-synced mode
  const [localCurrentPage, setLocalCurrentPage] = useState<number | undefined>(1);

  // Choose between URL-synced or local state
  const browseParams = enableUrlSync ? urlBrowseParams : localBrowseParams;

  // Auto-expand advanced panel when advanced filters become active (from URL or user input)
  // This ensures panel stays expanded after navigation (remount reads params from URL → effect detects → expands)
  useEffect(() => {
    if (enableAdvancedFilters && hasAdvancedFilterValues(browseParams)) {
      setLocalIsAdvancedPanelOpen(true);
    }
  }, [browseParams, enableAdvancedFilters]);

  // Auto-reset title sort when language changes to non-Latin or "All Languages"
  // Title sorts (A-Z, Z-A) only make sense for Latin-script languages
  useEffect(() => {
    if (isTitleSort(browseParams.sortBy) && !isLatinScriptLanguage(browseParams.language)) {
      urlHandleBrowseParamsChange({ sortBy: DEFAULT_SORT });
    }
  }, [browseParams.language, browseParams.sortBy, urlHandleBrowseParamsChange]);

  // Optimize onBrowseParamsChange with stable references
  const onBrowseParamsChange = useCallback((newParams: Partial<BrowseParams> | ((prev: BrowseParams) => BrowseParams)) => {
    if (enableUrlSync) {
      urlHandleBrowseParamsChange(newParams);
    } else {
      if (typeof newParams === 'function') {
        setLocalBrowseParams(newParams);
      } else {
        setLocalBrowseParams(prev => ({ ...prev, ...newParams }));
      }
    }
  }, [enableUrlSync, urlHandleBrowseParamsChange]);

  const currentPage = enableUrlSync ? urlCurrentPage : localCurrentPage;
  const onPageChange = enableUrlSync ? urlHandlePageChange : setLocalCurrentPage;

  // Advanced panel toggle with better UX
  const isAdvancedPanelOpen = enableAdvancedFilters ? localIsAdvancedPanelOpen : false;
  const setIsAdvancedPanelOpen = useCallback((open: boolean) => {
    if (enableAdvancedFilters) {
      setLocalIsAdvancedPanelOpen(open);
    }
  }, [enableAdvancedFilters]);

  const toggleAdvancedPanel = useCallback(() => {
    setIsAdvancedPanelOpen(!isAdvancedPanelOpen);
  }, [isAdvancedPanelOpen, setIsAdvancedPanelOpen]);
  
  // Collapsible filters with better UX
  const isFiltersCollapsed = enableCollapsibleFilters ? localIsFiltersCollapsed : false;
  const setIsFiltersCollapsed = useCallback((collapsed: boolean) => {
    if (enableCollapsibleFilters) {
      setLocalIsFiltersCollapsed(collapsed);
    }
  }, [enableCollapsibleFilters]);
  
  const toggleFiltersCollapsed = useCallback(() => {
    setIsFiltersCollapsed(!isFiltersCollapsed);
  }, [isFiltersCollapsed, setIsFiltersCollapsed]);
  
  // Derived state using centralized utilities
  const hasActiveBrowseParams = useMemo(() => {
    return checkHasActiveBrowseParams(browseParams);
  }, [browseParams]);

  const hasAdvancedFilters = useMemo(() => {
    // Check rating filters
    if (browseParams.minRating || browseParams.maxRating) return true;

    // Check custom year range (not single year)
    if (browseParams.minYear && browseParams.maxYear && browseParams.minYear !== browseParams.maxYear) {
      return true;
    }

    return false;
  }, [
    browseParams.minRating,
    browseParams.maxRating,
    browseParams.minYear,
    browseParams.maxYear,
  ]);

  const activeParamCount = useMemo(() => {
    return countActiveParams(browseParams);
  }, [browseParams]);

  // Combined derived state for compatibility
  const derivedState = useMemo(() => ({
    hasActiveBrowseParams,
    hasAdvancedFilters,
    activeParamCount,
  }), [hasActiveBrowseParams, hasAdvancedFilters, activeParamCount]);
  
  // Memoize default params object to prevent recreation
  const defaultParamsRef = useRef<BrowseParams>(DEFAULT_BROWSE_PARAMS);

  // Actions with optimized object references
  const resetBrowseParams = useCallback(() => {
    onBrowseParamsChange(defaultParamsRef.current);
    setIsAdvancedPanelOpen(false);
  }, [onBrowseParamsChange, setIsAdvancedPanelOpen]);

  return {
    // State
    browseParams,
    onBrowseParamsChange,
    isAdvancedPanelOpen,
    setIsAdvancedPanelOpen,
    toggleAdvancedPanel,
    isFiltersCollapsed,
    setIsFiltersCollapsed,
    toggleFiltersCollapsed,
    currentPage,
    onPageChange,

    // Derived state
    ...derivedState,

    // Actions
    resetBrowseParams,
  };
};
