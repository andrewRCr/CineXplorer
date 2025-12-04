/**
 * Browse Parameter Utilities
 *
 * Centralized utilities for checking browse parameter state. These functions
 * provide consistent logic for determining if params are active, counting
 * active params, and checking default states.
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
 * Checks if any browse parameters are active (non-default).
 *
 * This is the comprehensive check covering all 8 BrowseParams fields:
 * - query: search text (reserved for future use)
 * - genres: genre filter array
 * - minYear/maxYear: year range
 * - minRating/maxRating: rating range
 * - sortBy: sort order (active if not DEFAULT_SORT)
 * - language: language filter
 *
 * @param params - The browse parameters to check
 * @returns true if any parameter is active (non-default)
 */
export function hasActiveBrowseParams(params: BrowseParams): boolean {
  return (
    params.query !== "" ||
    params.genres.length > 0 ||
    params.minYear !== "" ||
    params.maxYear !== "" ||
    params.minRating !== "" ||
    params.maxRating !== "" ||
    params.sortBy !== DEFAULT_SORT ||
    params.language !== ""
  );
}

/**
 * Counts the number of active browse parameters.
 *
 * Counting logic:
 * - query: counts as 1 if non-empty
 * - genres: counts as 1 if any selected (not per-genre)
 * - year range: counts as 1 if either min or max is set
 * - rating range: counts as 1 if either min or max is set
 * - sortBy: counts as 1 if not DEFAULT_SORT
 * - language: counts as 1 if set
 *
 * This groups related fields (min/max pairs) to provide a user-friendly count.
 * Maximum possible count: 6 (query, genres, year, rating, sort, language)
 *
 * @param params - The browse parameters to count
 * @returns Number of active parameter groups (0-6)
 */
export function countActiveParams(params: BrowseParams): number {
  let count = 0;

  if (params.query !== "") count++;
  if (params.genres.length > 0) count++;
  if (params.minYear !== "" || params.maxYear !== "") count++;
  if (params.minRating !== "" || params.maxRating !== "") count++;
  if (params.sortBy !== DEFAULT_SORT) count++;
  if (params.language !== "") count++;

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
