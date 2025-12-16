import type { BrowseParams, SortOptionValue } from "@/types/browseTypes";
import { DEFAULT_SORT } from "@/constants/browseDefaults";

/**
 * Parses browse parameters from URL search string
 *
 * Extracts all browse state from URL query parameters, returning a complete
 * BrowseParams object. Missing parameters receive their default values.
 *
 * @param search - The URL search string (e.g., location.search)
 * @returns Complete BrowseParams object populated from URL (or defaults for missing params)
 */
export function parseBrowseParamsFromUrl(search: string): BrowseParams {
  const params = new URLSearchParams(search);

  // Note: Search query is NOT parsed here - it flows through a separate path
  // (URL ?query= → searchQuery memo in MovieCollectionLayout → context.query)
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
  const language = params.get("language") || "";
  const certifications =
    params.get("certifications")?.split(",").filter(Boolean) || [];

  return {
    genres,
    minYear,
    maxYear,
    minRating,
    maxRating,
    sortBy,
    language,
    certifications,
  };
}
