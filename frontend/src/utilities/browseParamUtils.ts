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
import { DEFAULT_SORT } from "@/constants/browseDefaults";

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
