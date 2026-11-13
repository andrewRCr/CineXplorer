import { useMemo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router";
import { type BrowseParams, BROWSE_PARAM_KEYS } from "@/types/browseTypes";
import {
    parseBrowseParamsFromUrl,
    generateBrowseUrl,
} from "@/utilities/browseUrlSync";

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

    const browseParams = useMemo(
        () => parseBrowseParamsFromUrl(location.search),
        [location.search],
    );

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
