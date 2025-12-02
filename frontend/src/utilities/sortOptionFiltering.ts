/**
 * Utilities for conditional sort option filtering based on language selection.
 *
 * Title sorts (A-Z, Z-A) only make sense for Latin-script languages where
 * alphabetical ordering is meaningful and consistent.
 */

import { sortOptions, type SortOption } from "@/constants/movieFilterOptions";

/**
 * ISO 639-1 codes for languages that use Latin script.
 * These languages support meaningful alphabetical (A-Z) sorting.
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
 * Title sort option values that should be hidden for non-Latin languages.
 */
const TITLE_SORT_VALUES = new Set(["original_title.asc", "original_title.desc"]);

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
 * - For Latin-script languages: all 6 options including Title A-Z/Z-A
 * - For non-Latin or "All Languages": 4 options without title sorts
 *
 * @param language - ISO 639-1 language code or empty string
 * @returns Filtered array of sort options
 */
export function getAvailableSortOptions(language: string): SortOption[] {
  if (isLatinScriptLanguage(language)) {
    return sortOptions;
  }
  return sortOptions.filter((option) => !TITLE_SORT_VALUES.has(option.value));
}

/**
 * Checks if a sort value is a title-based sort.
 *
 * @param sortBy - The sort option value
 * @returns true if it's a title sort (A-Z or Z-A)
 */
export function isTitleSort(sortBy: string): boolean {
  return TITLE_SORT_VALUES.has(sortBy);
}
