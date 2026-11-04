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
    genres: [],
    minYear: "",
    maxYear: "",
    minRating: "",
    maxRating: "",
    sortBy: DEFAULT_SORT,
    language: "",
    certifications: [],
};

/**
 * Core genre IDs available in the minimal/quick browse UI (Letterboxd-style)
 *
 * These genres appear in the QuickBrowseBar dropdown. All other genres are
 * considered "advanced" and only accessible via the expanded advanced filters panel.
 *
 * Selection criteria: Most popular/recognizable genres that cover common browsing needs
 * without overwhelming the minimal UI.
 *
 * String format used because URL params and form values are strings.
 */
export const CORE_GENRE_IDS = [
    "28", // Action
    "35", // Comedy
    "99", // Documentary
    "18", // Drama
    "10751", // Family
    "27", // Horror
    "878", // Science Fiction
    "53", // Thriller
] as const;

/**
 * Set version of CORE_GENRE_IDS for O(1) lookup performance
 *
 * Use this when checking if a genre ID is a "core" genre vs "advanced-only".
 */
export const CORE_GENRE_IDS_SET: ReadonlySet<string> = new Set(CORE_GENRE_IDS);
