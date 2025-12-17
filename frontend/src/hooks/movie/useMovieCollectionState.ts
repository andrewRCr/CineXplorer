import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import type { BrowseParams } from "@/types/browseTypes";
import { DEFAULT_BROWSE_PARAMS, DEFAULT_SORT } from "@/constants/browseDefaults";
import { useMovieCollectionUrl } from "@/hooks/movie/useMovieCollectionUrl";
import {
  isLatinScriptLanguage,
  isTitleSort,
} from "@/utilities/sortAvailability";
import {
  hasActiveFilters as checkHasActiveFilters,
  hasActiveBrowseParams as checkHasActiveBrowseParams,
  countActiveParams,
  hasAdvancedFilterValues,
} from "@/utilities/browseParamUtils";
import {
  getAdvancedFilterHash,
  hasUserOverride,
  setUserOverride,
  clearUserOverride,
} from "@/utilities/advancedPanelOverride";

// Better hook composition with multiple related concerns
interface UseMovieCollectionStateConfig {
  defaultBrowseParams?: Partial<BrowseParams>;
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

  // Derived state
  hasActiveFilters: boolean; // Excludes sort (for "Clear Filters" button visibility)
  hasActiveBrowseParams: boolean; // Includes sort (for full param detection)
  hasActiveAdvancedFilters: boolean; // Whether advanced filters are currently applied
  activeParamCount: number;

  // Actions
  resetBrowseParams: () => void; // Clears filters but preserves sort
}

/**
 * useMovieCollectionState
 *
 * Manages browse/filter state for movie collection views.
 * Handles URL synchronization, advanced panel state, and derived filter states.
 *
 * Note: Pagination is handled internally by TanStack Query (infinite scroll),
 * not managed by this hook.
 */
export const useMovieCollectionState = ({
  defaultBrowseParams,
  enableUrlSync = true,
  enableAdvancedFilters = true,
}: UseMovieCollectionStateConfig = {}): MovieCollectionState => {

  // URL management (only if enabled)
  const urlState = useMovieCollectionUrl();

  // Extract specific functions for stable dependencies
  const {
    browseParams: urlBrowseParams,
    handleBrowseParamsChange: urlHandleBrowseParamsChange,
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

  // Auto-reset title sort when language changes to non-Latin or "All Languages"
  // Title sorts (A-Z, Z-A) only make sense for Latin-script languages
  useEffect(() => {
    if (isTitleSort(browseParams.sortBy) && !isLatinScriptLanguage(browseParams.language)) {
      onBrowseParamsChange({ sortBy: DEFAULT_SORT });
    }
  }, [browseParams.language, browseParams.sortBy, onBrowseParamsChange]);

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
  const hasActiveAdvancedFilters = useMemo(() => {
    return hasAdvancedFilterValues(browseParams);
  }, [browseParams]);

  const activeParamCount = useMemo(() => {
    return countActiveParams(browseParams);
  }, [browseParams]);

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

    // Derived state
    hasActiveFilters,
    hasActiveBrowseParams,
    hasActiveAdvancedFilters,
    activeParamCount,

    // Actions
    resetBrowseParams,
  };
};
