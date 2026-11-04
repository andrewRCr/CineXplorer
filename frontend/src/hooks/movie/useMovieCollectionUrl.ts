import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { type BrowseParams, BROWSE_PARAM_KEYS } from "@/types/browseTypes";
import {
    parseBrowseParamsFromUrl,
    generateBrowseUrl,
} from "@/utilities/browseUrlSync";
import { deepEqual } from "@/utilities/objectComparator";

/**
 * useMovieCollectionUrl
 *
 * Synchronizes browse params (filters, sort) with URL query string.
 * Provides two-way binding: URL changes update state, state changes update URL.
 *
 * Note: Pagination is handled internally by TanStack Query (infinite scroll),
 * not via URL params.
 */
export const useMovieCollectionUrl = () => {
    const location = useLocation();
    const navigate = useNavigate();

    // Single source of truth for browse params (filters, sort)
    // IMPORTANT: Initialize from URL synchronously to ensure scroll restoration
    // uses the correct key on first render. Previously used DEFAULT_BROWSE_PARAMS
    // which caused a timing bug where scroll key was calculated before URL sync.
    const [browseParams, setBrowseParams] = useState<BrowseParams>(() =>
        parseBrowseParamsFromUrl(location.search),
    );

    // Sync browse params from URL when URL changes
    useEffect(() => {
        const urlBrowseParams = parseBrowseParamsFromUrl(location.search);

        // Only update state if params actually changed (prevent unnecessary re-renders)
        if (!deepEqual(browseParams, urlBrowseParams)) {
            setBrowseParams(urlBrowseParams);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.search]); // browseParams intentionally omitted to prevent infinite loop

    // Update URL when browse params change
    const handleBrowseParamsChange = useCallback(
        (
            newParamsOrUpdater:
                Partial<BrowseParams> | ((prev: BrowseParams) => BrowseParams),
        ) => {
            const newParams =
                typeof newParamsOrUpdater === "function"
                    ? newParamsOrUpdater(browseParams)
                    : { ...browseParams, ...newParamsOrUpdater };

            // Generate browse params portion of URL
            const browseQueryString = generateBrowseUrl(newParams);

            // Preserve non-browse params (e.g., "query" for movie search)
            const currentParams = new URLSearchParams(location.search);

            // Build final URL: non-browse params + browse params
            const finalParams = new URLSearchParams();

            // First, add non-browse params from current URL
            currentParams.forEach((value, key) => {
                if (!BROWSE_PARAM_KEYS.includes(key as keyof BrowseParams)) {
                    finalParams.set(key, value);
                }
            });

            // Then, merge in browse params
            const browseParams_ = new URLSearchParams(browseQueryString);
            browseParams_.forEach((value, key) => {
                finalParams.set(key, value);
            });

            void navigate(`${location.pathname}?${finalParams.toString()}`, {
                replace: true,
            });
        },
        [browseParams, location.pathname, location.search, navigate],
    );

    return {
        browseParams,
        handleBrowseParamsChange,
    };
};
