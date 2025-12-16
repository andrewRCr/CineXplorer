/**
 * Scroll position persistence utilities for movie grids.
 *
 * Provides sessionStorage-based scroll position saving and restoration
 * for back-navigation UX. Positions are keyed by source and filter params
 * to ensure correct restoration when returning to the same view.
 *
 * Note on error handling: All sessionStorage operations are wrapped in
 * try/catch with silent failures. This is intentional because:
 * - sessionStorage can fail in private browsing mode
 * - Storage quota can be exceeded
 * - SSR environments don't have sessionStorage
 * - Scroll position is a UX enhancement, not critical functionality
 * Failing gracefully (return default, skip save) is better than crashing.
 */

import { type BrowseParams } from "@/types/browseTypes";

/** Storage key prefix for scroll positions. */
const SCROLL_STORAGE_PREFIX = "scroll-";

/** Maximum number of scroll positions to store in sessionStorage. */
const MAX_STORED_POSITIONS = 20;

/**
 * Generates a storage key for scroll position based on query context.
 * Filter-specific keys ensure position is only restored for matching filters.
 */
export const getScrollStorageKey = (
  source: string,
  browseParams: Partial<BrowseParams>
): string => {
  // Create deterministic key from source and filter params
  const entries = Object.entries(browseParams) as [string, unknown][];
  const paramsKey = entries
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => {
      // Handle arrays specially (genres, certifications)
      if (Array.isArray(v)) {
        return v.length > 0 ? `${k}=${v.join(",")}` : null;
      }
      return `${k}=${v}`;
    })
    .filter(Boolean)
    .join("&");

  return `${SCROLL_STORAGE_PREFIX}${source}-${paramsKey}`;
};

/**
 * Retrieves saved scroll position from sessionStorage.
 * Returns 0 if no saved position exists.
 */
export const getSavedScrollPosition = (key: string): number => {
  try {
    const saved = sessionStorage.getItem(key);
    return saved ? parseInt(saved, 10) : 0;
  } catch {
    return 0;
  }
};

/**
 * Gets all scroll position keys from sessionStorage.
 */
export const getScrollKeys = (): string[] => {
  const keys: string[] = [];
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(SCROLL_STORAGE_PREFIX)) {
        keys.push(key);
      }
    }
  } catch {
    // Ignore storage errors
  }
  return keys;
};

/**
 * Cleans up old scroll positions if we exceed the maximum.
 * Removes oldest entries (by insertion order approximation via iteration).
 */
export const cleanupOldScrollPositions = (currentKey: string): void => {
  try {
    const keys = getScrollKeys();
    // Keep current key, remove oldest if over limit
    const keysToConsider = keys.filter((k) => k !== currentKey);
    if (keysToConsider.length >= MAX_STORED_POSITIONS) {
      // Remove oldest entries (first in list, as sessionStorage iterates in insertion order)
      const keysToRemove = keysToConsider.slice(
        0,
        keysToConsider.length - MAX_STORED_POSITIONS + 1
      );
      keysToRemove.forEach((k) => sessionStorage.removeItem(k));
    }
  } catch {
    // Ignore cleanup errors
  }
};

/**
 * Saves scroll position to sessionStorage with cleanup.
 */
export const saveScrollPosition = (key: string, position: number): void => {
  try {
    sessionStorage.setItem(key, String(position));
    cleanupOldScrollPositions(key);
  } catch {
    // Ignore storage errors (quota exceeded, etc.)
  }
};
