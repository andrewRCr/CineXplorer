import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { BrowseParams } from "@/types/browseTypes";
import { DEFAULT_BROWSE_PARAMS } from "@/constants/browseDefaults";
import { parseBrowseParamsFromUrl } from "@/utilities/browseUrlSync";
import { parsePaginationFromUrl, mergePaginationIntoUrl } from "@/utilities/paginationUrlSync";
import { isDefaultSort } from "@/utilities/browseParamUtils";

// Deep comparison function for filters to prevent unnecessary re-renders
// Added fix to prevent continuous API requests - updated with navigation loop fix
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

export const useMovieCollectionUrl = (
  defaultBrowseParams?: Partial<BrowseParams>,
  actualSource?: string
) => {
  const location = useLocation();
  const navigate = useNavigate();

  // This is now the single source of truth for all browse params.
  const [browseParams, setBrowseParams] = useState<BrowseParams>({
    ...DEFAULT_BROWSE_PARAMS,
    ...defaultBrowseParams,
  });

  // Parse pagination params from URL - using useCallback to memoize and reduce recreations
  const getPaginationFromUrl = useCallback(() => {
    if (typeof window === "undefined") return { page: undefined, tmdb_page_start: undefined };
    const parsed = parsePaginationFromUrl(location.search);
    // Return undefined for page=1 to match existing behavior (page 1 is default)
    return {
      page: parsed.page > 1 ? parsed.page : undefined,
      tmdb_page_start: parsed.tmdb_page_start,
    };
  }, [location.search]);

  const [currentPageFromUrl, setCurrentPageFromUrl] = useState<
    number | undefined
  >(getPaginationFromUrl().page);

  const [tmdbPageStartFromUrl, setTmdbPageStartFromUrl] = useState<
    number | undefined
  >(getPaginationFromUrl().tmdb_page_start);

  // This effect is the SINGLE SOURCE OF TRUTH for browse params and pagination.
  // It runs whenever the URL's search parameters change.
  useEffect(() => {
    const pagination = getPaginationFromUrl();
    setCurrentPageFromUrl(pagination.page);
    setTmdbPageStartFromUrl(pagination.tmdb_page_start);

    const urlBrowseParams = parseBrowseParamsFromUrl(location.search);

    // Only update state if the params have actually changed to prevent unnecessary re-renders
    if (!deepEqual(browseParams, urlBrowseParams)) {
      setBrowseParams(urlBrowseParams);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, getPaginationFromUrl]); // browseParams intentionally omitted to prevent infinite loop

  // This callback is passed to the grid to handle page changes
  // The callback includes location.pathname and location.search in deps to avoid stale closures,
  // so it will be recreated when those change
  const handlePageChange = useCallback(
    (page: number, tmdb_page_start?: number) => {
      const newSearch = mergePaginationIntoUrl(location.search, {
        page,
        tmdb_page_start,
      });
      const newUrl = `${location.pathname}${newSearch ? `?${newSearch}` : ""}`;
      navigate(newUrl, {});
    },
    [location.pathname, location.search, navigate]
  );

  // This callback is passed to ALL browse param components.
  // It constructs a new URL and uses navigate() to update it.
  // When filters change, pagination is reset (page=1, no tmdb_page_start)
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
      // Reset pagination when filters change (invalidates buffer metadata)
      searchParams.delete("page");
      searchParams.delete("tmdb_page_start");

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

  // Reset pagination state when route/source changes (but not on browser back/forward)
  // We use a ref to track the previous route to distinguish between programmatic navigation
  // and browser back/forward navigation
  const previousRouteRef = useRef<string | null>(null);

  useEffect(() => {
    const currentRouteKey = `${location.pathname}:${actualSource}`;

    // If this is the first visit to this component, just store the route
    if (previousRouteRef.current === null) {
      previousRouteRef.current = currentRouteKey;
      return;
    }

    // If the route/source has changed, this might be a forward navigation
    if (previousRouteRef.current !== currentRouteKey) {
      // Check if this looks like browser back/forward navigation
      // Browser navigation typically preserves the full URL including query params
      const hasPageParam = new URLSearchParams(location.search).has("page");

      // If we have page param, this is likely browser back/forward navigation
      // If no page param, this is likely a fresh navigation that should reset to page 1
      if (!hasPageParam) {
        // This appears to be a fresh navigation (clicking nav links, etc.)
        // Reset all pagination state (page and tmdb_page_start)
        const searchParams = new URLSearchParams(location.search);
        searchParams.delete("page");
        searchParams.delete("tmdb_page_start");

        // Only navigate if the URL would actually change
        const newSearch = searchParams.toString();
        const currentSearch = location.search.startsWith('?') ? location.search.slice(1) : location.search;

        if (currentSearch !== newSearch) {
          navigate(`${location.pathname}?${newSearch}`, {
            replace: true,
          });
        }
      }
      // If hasPageParam is true, we preserve it (likely browser navigation)
    }

    previousRouteRef.current = currentRouteKey;
  }, [actualSource, location.pathname, location.search, navigate]);

  return {
    browseParams,
    currentPageFromUrl,
    tmdbPageStartFromUrl,
    handlePageChange,
    handleBrowseParamsChange,
  };
};
