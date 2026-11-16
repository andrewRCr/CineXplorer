import { isRecord } from "@/utilities/typeGuards";
/**
 * useScrollPersistence - Manages scroll position persistence for virtualized grids.
 *
 * Provides scroll position saving and restoration for back-navigation UX.
 * Handles the complexity of:
 * - Location state detection for explicit back-navigation signals
 * - Filter change detection (reset to top on param changes)
 * - Restoration guard timing (prevents saving during restoration)
 * - Debounced scroll position saving
 * - Scroll listener lifecycle management
 *
 * Usage:
 * ```tsx
 * const { initialOffset } = useScrollPersistence({
 *   source: "discover",
 *   browseParams: { year: 2024, genres: [28] },
 *   isLoading: false,
 *   hasContent: movies.length > 0,
 *   isError: false,
 * });
 *
 * const virtualizer = useWindowVirtualizer({
 *   count: rowCount,
 *   estimateSize: () => ROW_HEIGHT,
 *   initialOffset,
 * });
 * ```
 */

import {
    useEffect,
    useLayoutEffect,
    useRef,
    useCallback,
    useMemo,
    useState,
} from "react";
import { useLocation, useNavigate } from "react-router";
import {
    getScrollStorageKey,
    getSavedScrollPosition,
    saveScrollPosition,
} from "@/components/movie/collection/shared/scrollStorage";

/** Debounce delay for scroll position saves (ms). */
const SCROLL_SAVE_DEBOUNCE = 200;

interface UseScrollPersistenceOptions {
    /** The source/route identifier (e.g., "discover", "search", "top-rated"). */
    source: string;
    /** Current browse filter parameters. */
    browseParams: object;
    /** Search query (optional, for search routes). */
    query?: string;
    /** Whether initial data is loading. */
    isLoading: boolean;
    /** Whether content exists (e.g., movies.length > 0). */
    hasContent: boolean;
    /** Whether an error occurred. */
    isError: boolean;
    /** Optional memory condition for restoring a measured collection. */
    canRestore?: (key: string) => boolean;
    /** Called only after a position save passes the restoration guard. */
    onSave?: (key: string) => void;
    /** Retire a previous visit's restoration state on a fresh arrival or filter change. */
    onFreshVisit?: (key: string) => void;
}

interface UseScrollPersistenceReturn {
    /** Initial scroll offset for virtualizer. Only non-zero for back-navigation. */
    initialOffset: number;
    scrollStorageKey: string;
}

/**
 * Hook for managing scroll position persistence in virtualized grids.
 *
 * Automatically handles:
 * - Scroll position saving (debounced, on scroll)
 * - Scroll restoration on back-navigation (via location state signal)
 * - Reset to top on filter changes
 * - Reset to top on errors
 * - Cleanup of listeners and timeouts
 */
export const useScrollPersistence = ({
    source,
    browseParams,
    query,
    isLoading,
    hasContent,
    isError,
    canRestore,
    onSave,
    onFreshVisit,
}: UseScrollPersistenceOptions): UseScrollPersistenceReturn => {
    // --------------------------------------------------------------------------
    // Scroll Storage Key
    // --------------------------------------------------------------------------

    // Include query in scroll key for search routes (different queries = different scroll positions)
    const scrollStorageKey = useMemo(() => {
        const baseKey = getScrollStorageKey(source, browseParams);
        // Append query to key for search routes
        return query ? `${baseKey}-q=${query}` : baseKey;
    }, [source, browseParams, query]);

    // Track previous key to detect filter changes
    const prevScrollKeyRef = useRef(scrollStorageKey);

    // --------------------------------------------------------------------------
    // Location State Detection
    // --------------------------------------------------------------------------

    // Detect if this is back-navigation (restore scroll) vs fresh load (reset to top)
    // Uses explicit signal from React Router location state:
    // - "Back to Results" link sets state={{ restoreScroll: true }}
    // - After reading, we clear the state so refresh won't see it
    // - Direct URL navigation has no state → reset to top
    const location = useLocation();
    const navigate = useNavigate();
    const navigationState: unknown = location.state;
    const restoreScroll =
        isRecord(navigationState) && navigationState.restoreScroll === true;

    // Capture restore signal synchronously for immediate use on mount.
    // Initial value handles component mount; effect below handles subsequent
    // navigations (React Router v6 doesn't remount on navigation).
    const shouldRestoreScrollRef = useRef(restoreScroll);
    const hasRestoredScrollRef = useRef(false);
    const prevLocationKeyRef = useRef<string | undefined>(undefined);
    // Set while the replace below clears the signal; that replace changes the
    // location key, but isn't a new navigation
    const clearingRestoreStateRef = useRef(false);

    // --------------------------------------------------------------------------
    // Restoration Guards
    // --------------------------------------------------------------------------

    // Guard to prevent saving scroll position immediately after restoration
    // (virtualizer may not have full height yet, causing wrong position to be saved)
    const isRestoringScrollRef = useRef(false);
    // Track restoration timeouts for cleanup (separate refs for nested timeouts)
    const restorationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
        null,
    );
    const restorationGuardTimeoutRef = useRef<ReturnType<
        typeof setTimeout
    > | null>(null);
    // The delayed re-scroll checks this, so it never scrolls a page shown after unmount
    const isMountedRef = useRef(false);

    // Clean up restoration timeouts on unmount
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (restorationTimeoutRef.current) {
                clearTimeout(restorationTimeoutRef.current);
            }
            if (restorationGuardTimeoutRef.current) {
                clearTimeout(restorationGuardTimeoutRef.current);
            }
            isRestoringScrollRef.current = false;
        };
    }, []);

    // --------------------------------------------------------------------------
    // Scroll Position Management
    // --------------------------------------------------------------------------

    // Classify the visit before restoration, including navigation that keeps this component mounted.
    useLayoutEffect(() => {
        const keyChanged = prevScrollKeyRef.current !== scrollStorageKey;
        const locationChanged = prevLocationKeyRef.current !== location.key;
        const clearingSignal =
            locationChanged && clearingRestoreStateRef.current;
        prevLocationKeyRef.current = location.key;
        prevScrollKeyRef.current = scrollStorageKey;
        if (clearingSignal) clearingRestoreStateRef.current = false;

        if (keyChanged || (locationChanged && !clearingSignal)) {
            shouldRestoreScrollRef.current = !keyChanged && restoreScroll;
            hasRestoredScrollRef.current = keyChanged;
            isRestoringScrollRef.current = false;
            if (restorationTimeoutRef.current)
                clearTimeout(restorationTimeoutRef.current);
            if (restorationGuardTimeoutRef.current)
                clearTimeout(restorationGuardTimeoutRef.current);
            if (keyChanged || !restoreScroll) {
                onFreshVisit?.(scrollStorageKey);
                if (keyChanged || onFreshVisit) window.scrollTo(0, 0);
            }
        }
    }, [location.key, restoreScroll, scrollStorageKey, onFreshVisit]);

    // Consume the signal after the router has subscribed to navigation updates.
    // The resulting replace does not begin a fresh visit.
    useEffect(() => {
        if (restoreScroll && !clearingRestoreStateRef.current) {
            clearingRestoreStateRef.current = true;
            void navigate(location.pathname + location.search, {
                replace: true,
                state: null,
            });
        }
    }, [restoreScroll, location.pathname, location.search, navigate]);

    // Restore scroll position for back-navigation (when explicitly signaled via location state)
    useLayoutEffect(() => {
        if (
            shouldRestoreScrollRef.current &&
            !hasRestoredScrollRef.current &&
            !isLoading &&
            hasContent &&
            (canRestore?.(scrollStorageKey) ?? true)
        ) {
            const savedPosition = getSavedScrollPosition(scrollStorageKey);
            if (savedPosition > 0) {
                // Set guard before restoring to prevent immediate save of wrong position
                // (virtualizer may not have full content height yet on first scroll attempt)
                isRestoringScrollRef.current = true;

                // Three-step scroll restoration for virtualized content:
                // Step 1: Immediate scroll - positions viewport to trigger virtualizer to
                // render rows around the target position (even if content height is wrong)
                window.scrollTo(0, savedPosition);

                // Step 2: Delayed re-scroll after virtualizer has rendered content at this
                // position and measured correct heights. The rAF ensures layout is complete,
                // then the 50ms allows virtualizer to update its measurements.
                requestAnimationFrame(() => {
                    if (
                        !isMountedRef.current ||
                        !shouldRestoreScrollRef.current
                    )
                        return;
                    restorationTimeoutRef.current = setTimeout(() => {
                        window.scrollTo(0, savedPosition);
                        // Step 3: Guard removal - wait for content to stabilize before allowing
                        // scroll position saves. Uses separate ref for independent cleanup.
                        restorationGuardTimeoutRef.current = setTimeout(() => {
                            isRestoringScrollRef.current = false;
                        }, 100);
                    }, 50);
                });
            }
            hasRestoredScrollRef.current = true;
        }
    }, [isLoading, hasContent, scrollStorageKey, canRestore, location.key]);

    // Scroll to top on error (reset position when data fetch fails)
    useLayoutEffect(() => {
        if (isError) {
            window.scrollTo(0, 0);
            hasRestoredScrollRef.current = true;
        }
    }, [isError]);

    // --------------------------------------------------------------------------
    // Initial Offset for Virtualizer
    // --------------------------------------------------------------------------

    // Get initial offset for virtualizer
    // Only use saved position for back-navigation (explicit signal), not refresh
    const [initialRestoration, setInitialRestoration] = useState(() => ({
        key: scrollStorageKey,
        offset:
            restoreScroll && (canRestore?.(scrollStorageKey) ?? true)
                ? getSavedScrollPosition(scrollStorageKey)
                : 0,
    }));
    const keyChanged = initialRestoration.key !== scrollStorageKey;
    if (keyChanged) setInitialRestoration({ key: scrollStorageKey, offset: 0 });
    const initialOffset = keyChanged ? 0 : initialRestoration.offset;

    // --------------------------------------------------------------------------
    // Scroll Position Saving
    // --------------------------------------------------------------------------

    // Debounced scroll save
    const scrollSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
        null,
    );

    const handleScroll = useCallback(() => {
        // Skip saving if we're in the middle of restoring scroll position
        if (isRestoringScrollRef.current) {
            return;
        }
        if (scrollSaveTimeoutRef.current) {
            clearTimeout(scrollSaveTimeoutRef.current);
        }
        scrollSaveTimeoutRef.current = setTimeout(() => {
            // Double-check guard in case restoration started during debounce
            if (isRestoringScrollRef.current) {
                return;
            }
            saveScrollPosition(scrollStorageKey, window.scrollY);
            onSave?.(scrollStorageKey);
        }, SCROLL_SAVE_DEBOUNCE);
    }, [scrollStorageKey, onSave]);

    // Attach scroll listener for position saving
    useEffect(() => {
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => {
            window.removeEventListener("scroll", handleScroll);
            if (scrollSaveTimeoutRef.current) {
                clearTimeout(scrollSaveTimeoutRef.current);
            }
        };
    }, [handleScroll]);

    // --------------------------------------------------------------------------
    // Return Values
    // --------------------------------------------------------------------------

    return { initialOffset, scrollStorageKey };
};

export default useScrollPersistence;
