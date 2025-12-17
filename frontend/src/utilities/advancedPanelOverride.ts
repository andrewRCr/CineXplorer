/**
 * Advanced panel override tracking utilities
 *
 * Manages sessionStorage state for tracking when users manually close the
 * advanced filters panel. Prevents auto-expand from re-opening the panel
 * for the same filter combination within a session.
 *
 * Use case: User navigates to URL with advanced filters → panel auto-expands →
 * user closes it manually → navigating away and back shouldn't re-expand
 * (until filters change).
 */

import type { BrowseParams } from "@/types/browseTypes";
import { CORE_GENRE_IDS_SET } from "@/constants/browseDefaults";
import { isYearFilterAdvanced } from "@/utilities/yearFilterAnalysis";

// SessionStorage key for user panel override
const PANEL_OVERRIDE_KEY = "advancedPanelUserClosed";

/**
 * Generate a hash of the advanced filter values for override tracking
 *
 * Includes all filters that trigger auto-expand (see hasAdvancedFilterValues).
 * The hash is used to detect when filters have changed since the user closed the panel.
 */
export const getAdvancedFilterHash = (params: BrowseParams): string => {
  const parts: string[] = [];

  // Rating filters
  if (params.minRating) parts.push(`mr:${params.minRating}`);
  if (params.maxRating) parts.push(`xr:${params.maxRating}`);

  // Year filters that are "advanced" (not QuickBrowseBar presets)
  if (isYearFilterAdvanced(params.minYear, params.maxYear)) {
    parts.push(`yr:${params.minYear || ""}-${params.maxYear || ""}`);
  }

  // Language filter
  if (params.language) parts.push(`lg:${params.language}`);

  // Genres: multiple genres OR non-core genre (advanced filters)
  if (params.genres.length > 1) {
    parts.push(`gn:${[...params.genres].sort((a, b) => a - b).join(",")}`);
  } else if (
    params.genres.length === 1 &&
    !CORE_GENRE_IDS_SET.has(String(params.genres[0]))
  ) {
    parts.push(`gn:${params.genres[0]}`);
  }

  // Certifications
  if (params.certifications?.length) {
    parts.push(`ct:${[...params.certifications].sort().join(",")}`);
  }

  return parts.join("|");
};

/**
 * Check if user has overridden auto-expand for current filter combination
 */
export const hasUserOverride = (params: BrowseParams): boolean => {
  try {
    const hash = getAdvancedFilterHash(params);
    if (!hash) return false; // No advanced filters = no override possible
    const stored = sessionStorage.getItem(PANEL_OVERRIDE_KEY);
    return stored === hash;
  } catch {
    return false; // SSR or sessionStorage unavailable
  }
};

/**
 * Set user override for current filter combination
 */
export const setUserOverride = (params: BrowseParams): void => {
  try {
    const hash = getAdvancedFilterHash(params);
    if (hash) {
      sessionStorage.setItem(PANEL_OVERRIDE_KEY, hash);
    }
  } catch {
    // SSR or sessionStorage unavailable - silently fail
  }
};

/**
 * Clear user override (when filters change)
 */
export const clearUserOverride = (): void => {
  try {
    sessionStorage.removeItem(PANEL_OVERRIDE_KEY);
  } catch {
    // SSR or sessionStorage unavailable - silently fail
  }
};
