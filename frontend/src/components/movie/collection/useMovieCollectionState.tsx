import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import type { BrowseParams } from "@/types/browseTypes";
import { DEFAULT_BROWSE_PARAMS, DEFAULT_SORT } from "@/constants/browseDefaults";
import { sortOptions } from "@/constants/browseOptions";
import { useMovieCollectionUrl } from "./useMovieCollectionUrl";
import {
  isLatinScriptLanguage,
  isTitleSort,
} from "@/utilities/sortAvailability";
import {
  hasActiveFilters as checkHasActiveFilters,
  hasActiveBrowseParams as checkHasActiveBrowseParams,
  countActiveParams,
} from "@/utilities/browseParamUtils";

// SessionStorage key for user panel override
const PANEL_OVERRIDE_KEY = "advancedPanelUserClosed";

// Core genre IDs - must match CORE_GENRE_IDS defined below (strings for comparison)
const CORE_GENRE_IDS_SET = new Set([
  "28", "35", "99", "18", "10751", "27", "878", "53"
]);

// Generate a hash of the advanced filter values for override tracking
// Includes all filters that trigger auto-expand (see hasAdvancedFilterValues)
const getAdvancedFilterHash = (params: BrowseParams): string => {
  const parts: string[] = [];

  // Rating filters
  if (params.minRating) parts.push(`mr:${params.minRating}`);
  if (params.maxRating) parts.push(`xr:${params.maxRating}`);

  // Custom year ranges (not decade presets)
  if (params.minYear && params.maxYear && params.minYear !== params.maxYear) {
    const isDecadeRange =
      parseInt(params.maxYear) - parseInt(params.minYear) === 9 &&
      params.minYear.endsWith("0");
    if (!isDecadeRange) {
      parts.push(`yr:${params.minYear}-${params.maxYear}`);
    }
  }

  // Language filter
  if (params.language) parts.push(`lg:${params.language}`);

  // Genres: multiple genres OR non-core genre (advanced filters)
  if (params.genres.length > 1) {
    parts.push(`gn:${[...params.genres].sort((a, b) => a - b).join(",")}`);
  } else if (params.genres.length === 1 && !CORE_GENRE_IDS_SET.has(String(params.genres[0]))) {
    parts.push(`gn:${params.genres[0]}`);
  }

  // Certifications
  if (params.certifications?.length) {
    parts.push(`ct:${[...params.certifications].sort().join(",")}`);
  }

  return parts.join("|");
};

// Check if user has overridden auto-expand for current filter combination
const hasUserOverride = (params: BrowseParams): boolean => {
  try {
    const hash = getAdvancedFilterHash(params);
    if (!hash) return false; // No advanced filters = no override possible
    const stored = sessionStorage.getItem(PANEL_OVERRIDE_KEY);
    return stored === hash;
  } catch {
    return false; // SSR or sessionStorage unavailable
  }
};

// Set user override for current filter combination
const setUserOverride = (params: BrowseParams): void => {
  try {
    const hash = getAdvancedFilterHash(params);
    if (hash) {
      sessionStorage.setItem(PANEL_OVERRIDE_KEY, hash);
    }
  } catch {
    // SSR or sessionStorage unavailable - silently fail
  }
};

// Clear user override (when filters change)
const clearUserOverride = (): void => {
  try {
    sessionStorage.removeItem(PANEL_OVERRIDE_KEY);
  } catch {
    // SSR or sessionStorage unavailable - silently fail
  }
};

// Better hook composition with multiple related concerns
interface UseMovieCollectionStateConfig {
  defaultBrowseParams?: Partial<BrowseParams>;
  source?: string;
  // Hook configuration
  enableUrlSync?: boolean;
  enableAdvancedFilters?: boolean;
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

  // Pagination state
  currentPage: number | undefined;
  onPageChange: (page: number) => void;

  // Derived state
  hasActiveFilters: boolean; // Excludes sort (for "Clear Filters" button visibility)
  hasActiveBrowseParams: boolean; // Includes sort (for full param detection)
  hasAdvancedFilters: boolean;
  activeParamCount: number;

  // Actions
  resetBrowseParams: () => void; // Clears filters but preserves sort
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

  // Custom year range (not single year and not decade preset) is advanced-only
  // Decade presets (1990's, 2020's, etc.) are available in QuickBrowseBar, so not advanced
  if (filters.minYear && filters.maxYear && filters.minYear !== filters.maxYear) {
    const isDecadeRange =
      parseInt(filters.maxYear) - parseInt(filters.minYear) === 9 &&
      filters.minYear.endsWith("0");
    if (!isDecadeRange) return true;
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

  // Language filter is advanced-only (only visible in expanded panel)
  if (filters.language) return true;

  // Certification filter is advanced-only
  if (filters.certifications?.length) return true;

  return false;
};

// Custom hook with better composition and TypeScript
export const useMovieCollectionState = ({
  defaultBrowseParams,
  source,
  enableUrlSync = true,
  enableAdvancedFilters = true,
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

  // For non-URL-synced mode, maintain local browse params
  const [localBrowseParams, setLocalBrowseParams] = useState<BrowseParams>(initialLocalBrowseParams);

  // Local pagination state for non-URL-synced mode
  const [localCurrentPage, setLocalCurrentPage] = useState<number | undefined>(1);

  // Choose between URL-synced or local state
  const browseParams = enableUrlSync ? urlBrowseParams : localBrowseParams;

  // Track previous filter hash to detect filter changes (not initial mount)
  const prevFilterHashRef = useRef<string | null>(null);

  // Auto-expand advanced panel when advanced filters become active (from URL or user input)
  // Respects user override: if user manually closed panel with these filters, don't re-expand
  useEffect(() => {
    if (enableAdvancedFilters && hasAdvancedFilterValues(browseParams)) {
      const currentHash = getAdvancedFilterHash(browseParams);

      // Check if filters changed (not initial mount, and different hash)
      // prevFilterHashRef.current === null means initial mount - don't clear override
      if (prevFilterHashRef.current !== null && currentHash !== prevFilterHashRef.current) {
        // Filters actually changed during this session - clear override
        clearUserOverride();
      }

      // Update ref for next comparison
      prevFilterHashRef.current = currentHash;

      // Only auto-expand if user hasn't overridden for this filter combination
      if (!hasUserOverride(browseParams)) {
        setLocalIsAdvancedPanelOpen(true);
      }
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
    const newState = !isAdvancedPanelOpen;
    setIsAdvancedPanelOpen(newState);

    // If user is closing panel while advanced filters are active, set override
    // This prevents auto-expand from re-opening on remount
    if (!newState && hasAdvancedFilterValues(browseParams)) {
      setUserOverride(browseParams);
    }
  }, [isAdvancedPanelOpen, setIsAdvancedPanelOpen, browseParams]);

  // Derived state using centralized utilities
  // hasActiveFilters excludes sort (for "Clear Filters" button visibility)
  const hasActiveFilters = useMemo(() => {
    return checkHasActiveFilters(browseParams);
  }, [browseParams]);

  // hasActiveBrowseParams includes sort (for full param detection)
  const hasActiveBrowseParams = useMemo(() => {
    return checkHasActiveBrowseParams(browseParams);
  }, [browseParams]);

  // Use centralized function to avoid duplicate logic
  const hasAdvancedFilters = useMemo(() => {
    return hasAdvancedFilterValues(browseParams);
  }, [browseParams]);

  const activeParamCount = useMemo(() => {
    return countActiveParams(browseParams);
  }, [browseParams]);

  // Combined derived state for compatibility
  const derivedState = useMemo(() => ({
    hasActiveFilters,
    hasActiveBrowseParams,
    hasAdvancedFilters,
    activeParamCount,
  }), [hasActiveFilters, hasActiveBrowseParams, hasAdvancedFilters, activeParamCount]);

  // Actions: Clear filters but preserve sort (sort is user preference, not a filter)
  const resetBrowseParams = useCallback(() => {
    onBrowseParamsChange({
      ...DEFAULT_BROWSE_PARAMS,
      sortBy: browseParams.sortBy, // Preserve current sort preference
    });
    setIsAdvancedPanelOpen(false);
  }, [onBrowseParamsChange, browseParams.sortBy, setIsAdvancedPanelOpen]);

  return {
    // State
    browseParams,
    onBrowseParamsChange,
    isAdvancedPanelOpen,
    setIsAdvancedPanelOpen,
    toggleAdvancedPanel,
    currentPage,
    onPageChange,

    // Derived state
    ...derivedState,

    // Actions
    resetBrowseParams,
  };
};
