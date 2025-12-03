import type { BrowseParams, SortOptionValue } from "@/types/browseTypes";
import { DEFAULT_SORT } from "@/constants/browseDefaults";

/**
 * Parses browse parameters from URL search string
 *
 * @param search - The URL search string (e.g., location.search)
 * @returns Populated BrowseParams from URL parameters
 */
export function initializeFiltersFromUrl(search: string): BrowseParams {
  const params = new URLSearchParams(search);

  const query = params.get("query") || "";
  const genres =
    params
      .get("genres")
      ?.split(",")
      .filter(Boolean)
      .map((g) => parseInt(g))
      .filter((g) => !isNaN(g)) || [];
  const sortBy = (params.get("sortBy") as SortOptionValue) || DEFAULT_SORT;
  const minYear = params.get("minYear") || "";
  const maxYear = params.get("maxYear") || "";
  const minRating = params.get("minRating") || "";
  const maxRating = params.get("maxRating") || "";
  const minRuntime = params.get("minRuntime") || "";
  const maxRuntime = params.get("maxRuntime") || "";
  const language = params.get("language") || "";

  return {
    query,
    genres,
    minYear,
    maxYear,
    minRating,
    maxRating,
    minRuntime,
    maxRuntime,
    sortBy,
    language,
  };
}
