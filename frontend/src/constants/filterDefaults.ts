/**
 * Centralized filter defaults - Single source of truth for filter state
 *
 * These constants define the default/empty state for movie filters used throughout
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
 * Default filter state - all filters inactive
 *
 * Used for:
 * - Initial state in filter hooks
 * - clearFilters() reset target
 * - Comparing against to detect "has active filters"
 */
export const DEFAULT_FILTERS: BrowseParams = {
  query: "",
  genres: [],
  minYear: "",
  maxYear: "",
  minRating: "",
  maxRating: "",
  minRuntime: "",
  maxRuntime: "",
  sortBy: DEFAULT_SORT,
  language: "",
};
