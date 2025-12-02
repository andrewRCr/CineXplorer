/**
 * Utilities for conditional sort option filtering based on language selection.
 *
 * Alphabetical title sort only makes sense for Latin-script languages where
 * alphabetical ordering is meaningful and consistent.
 *
 * Note: Z-A (descending) sort was removed entirely due to TMDB data quality issues.
 * Unicode ordering causes non-Latin mislabeled movies to cluster at the front of Z-A
 * results, making the sort unusable for Latin languages.
 */

import { sortOptions, type SortOption } from "@/constants/movieFilterOptions";

/**
 * ISO 639-1 codes for languages that use Latin script.
 * These languages support meaningful alphabetical sorting.
 */
const LATIN_SCRIPT_LANGUAGES = new Set([
  "en", // English
  "fr", // French
  "es", // Spanish
  "de", // German
  "pt", // Portuguese
  "it", // Italian
  "nl", // Dutch
  "sv", // Swedish
  "da", // Danish
  "pl", // Polish
  "cs", // Czech
  "tr", // Turkish
  "tl", // Tagalog
  "id", // Indonesian
]);

/**
 * Title sort option value that should be hidden for non-Latin languages.
 */
const TITLE_SORT_VALUE = "original_title.asc";

/**
 * Determines if a language code represents a Latin-script language.
 *
 * @param language - ISO 639-1 language code (e.g., "en", "ja") or empty string for "All Languages"
 * @returns true if the language uses Latin script, false otherwise
 */
export function isLatinScriptLanguage(language: string): boolean {
  if (!language) return false; // "All Languages" - can't assume Latin
  return LATIN_SCRIPT_LANGUAGES.has(language);
}

/**
 * Returns available sort options based on the selected language.
 *
 * - For Latin-script languages: all 5 options including Alphabetical
 * - For non-Latin or "All Languages": 4 options without title sort
 *
 * @param language - ISO 639-1 language code or empty string
 * @returns Filtered array of sort options
 */
export function getAvailableSortOptions(language: string): SortOption[] {
  if (isLatinScriptLanguage(language)) {
    return sortOptions;
  }
  return sortOptions.filter((option) => option.value !== TITLE_SORT_VALUE);
}

/**
 * Checks if a sort value is the alphabetical title sort.
 *
 * @param sortBy - The sort option value
 * @returns true if it's the alphabetical title sort
 */
export function isTitleSort(sortBy: string): boolean {
  return sortBy === TITLE_SORT_VALUE;
}
