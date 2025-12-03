/**
 * Centralized filter defaults - Single source of truth for filter state
 *
 * These constants define the default/empty state for movie filters used throughout
 * the application. Import from here rather than hardcoding defaults in components.
 */
import type { SortOptionValue } from "./movieFilterOptions";

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
export const DEFAULT_FILTERS = {
  query: "",
  genres: [] as number[],
  minYear: "",
  maxYear: "",
  minRating: "",
  maxRating: "",
  minRuntime: "",
  maxRuntime: "",
  sortBy: DEFAULT_SORT,
  language: "",
} as const;

/**
 * MovieFilters type derived from the default constant
 *
 * This ensures the type stays in sync with the actual defaults.
 * Use this type for filter state throughout the application.
 */
export type MovieFilters = {
  query: string;
  genres: number[];
  minYear: string;
  maxYear: string;
  minRating: string;
  maxRating: string;
  minRuntime: string;
  maxRuntime: string;
  sortBy: SortOptionValue;
  language: string;
};
