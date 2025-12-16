import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { BrowseParams } from "@/types/browseTypes";
import { DEFAULT_BROWSE_PARAMS } from "@/constants/browseDefaults";
import { parseBrowseParamsFromUrl } from "@/utilities/browseUrlSync";
import { isDefaultSort } from "@/utilities/browseParamUtils";

// Deep comparison function for filters to prevent unnecessary re-renders
function deepEqual(obj1: BrowseParams, obj2: BrowseParams): boolean {
  const keys1 = Object.keys(obj1) as (keyof BrowseParams)[];
  const keys2 = Object.keys(obj2) as (keyof BrowseParams)[];

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (const key of keys1) {
    const val1 = obj1[key];
    const val2 = obj2[key];

    if (Array.isArray(val1) && Array.isArray(val2)) {
      if (val1.length !== val2.length || !val1.every((item, index) => item === val2[index])) {
        return false;
      }
    } else if (val1 !== val2) {
      return false;
    }
  }

  return true;
}

/**
 * useMovieCollectionUrl
 *
 * Synchronizes browse params (filters, sort) with URL query string.
 * Provides two-way binding: URL changes update state, state changes update URL.
 *
 * Note: Pagination is handled internally by TanStack Query (infinite scroll),
 * not via URL params.
 */
export const useMovieCollectionUrl = (
  defaultBrowseParams?: Partial<BrowseParams>,
  _actualSource?: string // Kept for API compatibility, no longer used
) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Single source of truth for browse params (filters, sort)
  const [browseParams, setBrowseParams] = useState<BrowseParams>({
    ...DEFAULT_BROWSE_PARAMS,
    ...defaultBrowseParams,
  });

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
        | Partial<BrowseParams>
        | ((prev: BrowseParams) => BrowseParams)
    ) => {
      const newParams =
        typeof newParamsOrUpdater === "function"
          ? newParamsOrUpdater(browseParams)
          : { ...browseParams, ...newParamsOrUpdater };

      const searchParams = new URLSearchParams(location.search);

      Object.entries(newParams).forEach(([key, value]) => {
        if (
          value === "" ||
          (Array.isArray(value) && value.length === 0) ||
          (key === "sortBy" && isDefaultSort(String(value)))
        ) {
          searchParams.delete(key);
        } else if (Array.isArray(value)) {
          searchParams.set(key, value.join(","));
        } else {
          searchParams.set(key, String(value));
        }
      });

      navigate(`${location.pathname}?${searchParams.toString()}`, {
        replace: true,
      });
    },
    [browseParams, location.pathname, location.search, navigate]
  );

  return {
    browseParams,
    handleBrowseParamsChange,
  };
};
