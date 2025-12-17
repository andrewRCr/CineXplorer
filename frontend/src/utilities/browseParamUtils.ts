/**
 * Browse Parameter Utilities
 *
 * Centralized utilities for checking browse parameter state. These functions
 * provide consistent logic for determining if params are active, counting
 * active params, and checking default states.
 *
 * Key Design Decision: Sort vs Filters
 * - Sort is a user PREFERENCE, not a filter
 * - "Clear Filters" should NOT reset sort (user expects sort to persist)
 * - hasActiveFilters() excludes sort (for button visibility)
 * - hasActiveBrowseParams() includes sort (for full param detection)
 *
 * Active vs Inactive States:
 * - String fields: empty string ("") = inactive, any other value = active
 * - Array fields: empty array ([]) = inactive, non-empty = active
 * - sortBy: DEFAULT_SORT value = inactive, any other value = active
 *
 * @see browseTypes.ts for BrowseParams type definition
 * @see browseDefaults.ts for DEFAULT_SORT and DEFAULT_BROWSE_PARAMS
 */

import type { BrowseParams } from "@/types/browseTypes";
import { DEFAULT_SORT, CORE_GENRE_IDS_SET } from "@/constants/browseDefaults";
import { sortOptions } from "@/constants/browseOptions";
import { isYearFilterAdvanced } from "@/utilities/yearFilterAnalysis";

/**
 * Checks if any FILTER parameters are active (excludes sort).
 *
 * This is the base filter check used by "Clear Filters" button visibility.
 * Sort is intentionally excluded because it's a user preference, not a filter.
 *
 * Covers 7 filter fields:
 * - genres: genre filter array
 * - minYear/maxYear: year range
 * - minRating/maxRating: rating range
 * - language: language filter
 * - certifications: certification filter array
 *
 * Note: Search query is NOT part of BrowseParams - it flows through a separate path.
 *
 * @param params - The browse parameters to check
 * @returns true if any FILTER is active (non-default)
 */
export function hasActiveFilters(params: BrowseParams): boolean {
  return (
    params.genres.length > 0 ||
    params.minYear !== "" ||
    params.maxYear !== "" ||
    params.minRating !== "" ||
    params.maxRating !== "" ||
    params.language !== "" ||
    (params.certifications?.length ?? 0) > 0
  );
}

/**
 * Checks if any browse parameters are active (non-default), INCLUDING sort.
 *
 * Builds on hasActiveFilters() and adds sort check.
 * Use this when you need to know if ANY param differs from default.
 *
 * @param params - The browse parameters to check
 * @returns true if any parameter is active (non-default)
 */
export function hasActiveBrowseParams(params: BrowseParams): boolean {
  return hasActiveFilters(params) || params.sortBy !== DEFAULT_SORT;
}

/**
 * Counts the number of active FILTER parameters (excludes sort).
 *
 * Sort is intentionally excluded because it's a user preference, not a filter.
 * This count is used for UI indicators like "X filters active".
 *
 * Counting logic:
 * - genres: counts as 1 if any selected (not per-genre)
 * - year range: counts as 1 if either min or max is set
 * - rating range: counts as 1 if either min or max is set
 * - language: counts as 1 if set
 * - certifications: counts as 1 if any selected
 *
 * Note: Search query is NOT part of BrowseParams - it flows through a separate path.
 *
 * This groups related fields (min/max pairs) to provide a user-friendly count.
 * Maximum possible count: 5 (genres, year, rating, language, certifications)
 *
 * @param params - The browse parameters to count
 * @returns Number of active filter groups (0-5)
 */
export function countActiveParams(params: BrowseParams): number {
  let count = 0;

  if (params.genres.length > 0) count++;
  if (params.minYear !== "" || params.maxYear !== "") count++;
  if (params.minRating !== "" || params.maxRating !== "") count++;
  // Sort intentionally excluded - it's a preference, not a filter
  if (params.language !== "") count++;
  if ((params.certifications?.length ?? 0) > 0) count++;

  return count;
}

/**
 * Checks if the sort value is the default sort order.
 *
 * @param sortBy - The sort value to check
 * @returns true if it matches DEFAULT_SORT ("popularity.desc")
 */
export function isDefaultSort(sortBy: string): boolean {
  return sortBy === DEFAULT_SORT;
}

/**
 * Checks if filters contain advanced filter values.
 *
 * "Advanced" filters are those only accessible through the expanded
 * advanced filters panel, not the minimal QuickBrowseBar.
 *
 * Used to:
 * - Auto-expand the advanced panel when URL contains advanced filters
 * - Determine API filter style in parent components
 *
 * Advanced filter criteria:
 * - Rating filters (minRating/maxRating)
 * - Year filters that aren't QuickBrowseBar presets (uses yearFilterAnalysis)
 * - Multiple genres (QuickBrowseBar supports single genre only)
 * - Non-core genres (Documentary, History, etc.)
 * - Invalid/custom sort options not in standard sortOptions
 * - Language filter
 * - Certification filter
 *
 * @param filters - The browse parameters to check
 * @returns true if any advanced filter values are present
 */
export function hasAdvancedFilterValues(filters: BrowseParams): boolean {
  // Rating filters are advanced-only
  if (filters.minRating || filters.maxRating) return true;

  // Year filters that are not QuickBrowseBar presets are advanced
  if (isYearFilterAdvanced(filters.minYear, filters.maxYear)) return true;

  // Multiple genres are advanced-only (minimal supports single genre only)
  if (filters.genres.length > 1) return true;

  // Non-core genres are advanced-only
  if (filters.genres.length === 1) {
    const genreId = String(filters.genres[0]);
    if (!CORE_GENRE_IDS_SET.has(genreId)) {
      return true;
    }
  }

  // Check for invalid sort options (uses sortOptions from browseOptions.ts)
  if (filters.sortBy && !sortOptions.some((opt) => opt.value === filters.sortBy)) {
    return true;
  }

  // Language filter is advanced-only (only visible in expanded panel)
  if (filters.language) return true;

  // Certification filter is advanced-only
  if (filters.certifications?.length) return true;

  return false;
}
