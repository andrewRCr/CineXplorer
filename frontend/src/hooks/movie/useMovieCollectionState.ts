import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import type { BrowseParams } from "@/types/browseTypes";
import {
    DEFAULT_BROWSE_PARAMS,
    DEFAULT_SORT,
} from "@/constants/browseDefaults";
import { useMovieCollectionUrl } from "@/hooks/movie/useMovieCollectionUrl";
import {
    isLatinScriptLanguage,
    isTitleSort,
} from "@/utilities/sortAvailabilityUtils";
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
        params: Partial<BrowseParams> | ((prev: BrowseParams) => BrowseParams),
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
    const initialLocalBrowseParams = useMemo(
        () => ({
            ...DEFAULT_BROWSE_PARAMS,
            ...defaultBrowseParams,
        }),
        [defaultBrowseParams],
    );

    // For non-URL-synced mode, maintain local browse params
    const [localBrowseParams, setLocalBrowseParams] = useState<BrowseParams>(
        initialLocalBrowseParams,
    );

    // Choose between URL-synced or local state
    const rawBrowseParams = enableUrlSync ? urlBrowseParams : localBrowseParams;
    const needsSortReset =
        isTitleSort(rawBrowseParams.sortBy) &&
        !isLatinScriptLanguage(rawBrowseParams.language);
    const browseParams = useMemo(
        () =>
            needsSortReset
                ? { ...rawBrowseParams, sortBy: DEFAULT_SORT }
                : rawBrowseParams,
        [rawBrowseParams, needsSortReset],
    );
    if (!enableUrlSync && needsSortReset) setLocalBrowseParams(browseParams);
    // The URL is external state; render the normalized values while replacing it.
    useEffect(() => {
        if (enableUrlSync && needsSortReset)
            urlHandleBrowseParamsChange({ sortBy: DEFAULT_SORT });
    }, [enableUrlSync, needsSortReset, urlHandleBrowseParamsChange]);

    // Track previous filter hash to detect filter changes (not initial mount)
    const prevFilterHashRef = useRef<string | null>(null);

    const [panel, setPanel] = useState(() => ({
        params: browseParams,
        enabled: enableAdvancedFilters,
        lastHash:
            enableAdvancedFilters && hasAdvancedFilterValues(browseParams)
                ? getAdvancedFilterHash(browseParams)
                : null,
        open:
            enableAdvancedFilters &&
            hasAdvancedFilterValues(browseParams) &&
            !hasUserOverride(browseParams),
    }));
    let panelOpen = panel.open;
    if (
        panel.params !== browseParams ||
        panel.enabled !== enableAdvancedFilters
    ) {
        const hash =
            enableAdvancedFilters && hasAdvancedFilterValues(browseParams)
                ? getAdvancedFilterHash(browseParams)
                : null;
        if (
            hash !== null &&
            ((panel.lastHash !== null && hash !== panel.lastHash) ||
                !hasUserOverride(browseParams))
        ) {
            panelOpen = true;
        }
        setPanel({
            params: browseParams,
            enabled: enableAdvancedFilters,
            lastHash: hash ?? panel.lastHash,
            open: panelOpen,
        });
    }

    // Persist override changes after the render has committed.
    useEffect(() => {
        if (enableAdvancedFilters && hasAdvancedFilterValues(browseParams)) {
            const hash = getAdvancedFilterHash(browseParams);
            if (
                prevFilterHashRef.current !== null &&
                prevFilterHashRef.current !== hash
            )
                clearUserOverride();
            prevFilterHashRef.current = hash;
        }
    }, [browseParams, enableAdvancedFilters]);

    // Optimize onBrowseParamsChange with stable references
    const onBrowseParamsChange = useCallback(
        (
            newParams:
                Partial<BrowseParams> | ((prev: BrowseParams) => BrowseParams),
        ) => {
            if (enableUrlSync) {
                urlHandleBrowseParamsChange(newParams);
            } else {
                if (typeof newParams === "function") {
                    setLocalBrowseParams(newParams);
                } else {
                    setLocalBrowseParams((prev) => ({ ...prev, ...newParams }));
                }
            }
        },
        [enableUrlSync, urlHandleBrowseParamsChange],
    );

    // Advanced panel toggle with better UX
    const isAdvancedPanelOpen = enableAdvancedFilters ? panelOpen : false;
    const setIsAdvancedPanelOpen = useCallback(
        (open: boolean) => {
            if (enableAdvancedFilters) {
                setPanel((current) => ({ ...current, open }));
            }
        },
        [enableAdvancedFilters],
    );

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
