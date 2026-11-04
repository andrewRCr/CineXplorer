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

/** Storage format for scroll positions with timestamp for proper cleanup ordering. */
interface ScrollStorageEntry {
    position: number;
    timestamp: number;
}

/**
 * Parses a stored scroll entry from JSON format.
 * Returns null if parsing fails or data is malformed.
 */
const parseScrollEntry = (value: string | null): ScrollStorageEntry | null => {
    if (!value) return null;
    try {
        const parsed = JSON.parse(value) as unknown;
        if (
            typeof parsed === "object" &&
            parsed !== null &&
            "position" in parsed &&
            "timestamp" in parsed &&
            typeof (parsed as ScrollStorageEntry).position === "number" &&
            typeof (parsed as ScrollStorageEntry).timestamp === "number"
        ) {
            return parsed as ScrollStorageEntry;
        }
        return null;
    } catch {
        return null;
    }
};

/**
 * Generates a storage key for scroll position based on query context.
 * Filter-specific keys ensure position is only restored for matching filters.
 */
export const getScrollStorageKey = (
    source: string,
    browseParams: Partial<BrowseParams>,
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
            return `${k}=${String(v)}`;
        })
        .filter(Boolean)
        .join("&");

    return `${SCROLL_STORAGE_PREFIX}${source}-${paramsKey}`;
};

/**
 * Retrieves saved scroll position from sessionStorage.
 * Returns 0 if no saved position exists or data is malformed.
 */
export const getSavedScrollPosition = (key: string): number => {
    try {
        const entry = parseScrollEntry(sessionStorage.getItem(key));
        return entry?.position ?? 0;
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
 * Removes oldest entries by timestamp (not iteration order, which is not guaranteed).
 */
export const cleanupOldScrollPositions = (currentKey: string): void => {
    try {
        const keys = getScrollKeys();
        // Keep current key, remove oldest if over limit
        const keysToConsider = keys.filter((k) => k !== currentKey);
        if (keysToConsider.length >= MAX_STORED_POSITIONS) {
            // Build array with timestamps for proper sorting
            const entriesWithTimestamp = keysToConsider
                .map((key) => {
                    const entry = parseScrollEntry(sessionStorage.getItem(key));
                    return { key, timestamp: entry?.timestamp ?? 0 };
                })
                .sort((a, b) => a.timestamp - b.timestamp); // Oldest first

            // Remove oldest entries until under limit
            const countToRemove =
                entriesWithTimestamp.length - MAX_STORED_POSITIONS + 1;
            entriesWithTimestamp
                .slice(0, countToRemove)
                .forEach(({ key }) => sessionStorage.removeItem(key));
        }
    } catch {
        // Ignore cleanup errors
    }
};

/**
 * Saves scroll position to sessionStorage with cleanup.
 * Stores position with timestamp for proper cleanup ordering.
 */
export const saveScrollPosition = (key: string, position: number): void => {
    try {
        const entry: ScrollStorageEntry = {
            position,
            timestamp: Date.now(),
        };
        sessionStorage.setItem(key, JSON.stringify(entry));
        cleanupOldScrollPositions(key);
    } catch {
        // Ignore storage errors (quota exceeded, etc.)
    }
};
