/**
 * Centralized browse defaults - Single source of truth for browse parameter state
 *
 * These constants define the default/empty state for browse parameters used throughout
 * the application. Import from here rather than hardcoding defaults in components.
 *
 * For type definitions, see @/types/browseTypes.ts
 */
import type { SortOptionValue, BrowseParams } from "@/types/browseTypes";

/**
 * Default sort order for movie browsing
 */
export const DEFAULT_SORT: SortOptionValue = "popularity.desc";

/**
 * Default browse parameter state - all parameters inactive
 *
 * Used for:
 * - Initial state in browse hooks
 * - resetBrowseParams() reset target
 * - Comparing against to detect "has active browse params"
 */
export const DEFAULT_BROWSE_PARAMS: BrowseParams = {
  query: "",
  genres: [],
  minYear: "",
  maxYear: "",
  minRating: "",
  maxRating: "",
  sortBy: DEFAULT_SORT,
  language: "",
  certifications: [],
};
