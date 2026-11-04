/**
 * Hook for tracking scroll position and direction
 *
 * Used for UI behaviors like collapsible navigation bars and "back to top" buttons.
 * Features:
 * - Tracks current scroll position (scrollY)
 * - Detects scroll direction with hysteresis to prevent flicker
 * - Reports when scroll has passed a configurable threshold
 * - Performance optimized with requestAnimationFrame throttling
 */

import { useState, useEffect, useMemo, useRef, useCallback } from "react";

/** Scroll direction: 'down' when scrolling toward bottom, 'up' toward top, 'idle' at rest */
export type ScrollDirection = "up" | "down" | "idle";

/** Options for configuring scroll state behavior */
export interface UseScrollStateOptions {
    /**
     * Scroll distance (px) before isPastThreshold becomes true
     * @default 200
     */
    threshold?: number;

    /**
     * Minimum scroll distance (px) required to change direction
     * Prevents direction flicker from small scroll movements
     * @default 10
     */
    hysteresis?: number;
}

/** Return value from useScrollState hook */
export interface ScrollState {
    /** Current vertical scroll position in pixels */
    scrollY: number;

    /** Current scroll direction */
    direction: ScrollDirection;

    /** True when scrollY >= threshold */
    isPastThreshold: boolean;
}

/** Default configuration values */
const DEFAULT_THRESHOLD = 200;
const DEFAULT_HYSTERESIS = 10;

/**
 * Tracks window scroll position and direction
 *
 * @param options - Configuration options
 * @returns Current scroll state with position, direction, and threshold status
 *
 * @example
 * ```tsx
 * const { scrollY, direction, isPastThreshold } = useScrollState({
 *   threshold: 200,
 *   hysteresis: 10
 * });
 *
 * // Hide nav when scrolling down past threshold
 * const isNavHidden = isPastThreshold && direction === 'down';
 * ```
 */
export function useScrollState(options?: UseScrollStateOptions): ScrollState {
    const { threshold = DEFAULT_THRESHOLD, hysteresis = DEFAULT_HYSTERESIS } =
        options ?? {};

    // Current scroll position
    const [scrollY, setScrollY] = useState(() =>
        typeof window === "undefined" ? 0 : window.scrollY,
    );

    // Current direction
    const [direction, setDirection] = useState<ScrollDirection>("idle");

    // Track the position where direction last changed (for hysteresis calculation)
    const directionChangePositionRef = useRef(scrollY);

    // Track if RAF is pending to avoid queueing multiple updates
    const rafPendingRef = useRef(false);

    // Track mounted state to prevent stale callbacks after unmount
    const mountedRef = useRef(true);

    // Handle scroll event with RAF throttling
    const handleScroll = useCallback(() => {
        if (rafPendingRef.current) return;

        rafPendingRef.current = true;

        requestAnimationFrame(() => {
            rafPendingRef.current = false;
            if (!mountedRef.current) return;

            const currentScrollY = window.scrollY;
            const previousScrollY = directionChangePositionRef.current;
            const delta = currentScrollY - previousScrollY;

            // Update scroll position
            setScrollY(currentScrollY);

            // Determine direction with hysteresis
            if (currentScrollY === 0) {
                // At top of page - reset to idle
                setDirection("idle");
                directionChangePositionRef.current = 0;
            } else if (Math.abs(delta) >= hysteresis) {
                // Movement exceeds hysteresis threshold
                const newDirection: ScrollDirection = delta > 0 ? "down" : "up";
                setDirection(newDirection);
                directionChangePositionRef.current = currentScrollY;
            }
            // If delta < hysteresis, keep current direction (flicker prevention)
        });
    }, [hysteresis]);

    // Set up and clean up scroll listener
    useEffect(() => {
        mountedRef.current = true;
        // Initialize with current scroll position
        directionChangePositionRef.current = window.scrollY;

        // Use passive: true for better scroll performance (indicates we won't call preventDefault)
        const listenerOptions: AddEventListenerOptions = { passive: true };
        window.addEventListener("scroll", handleScroll, listenerOptions);

        return () => {
            mountedRef.current = false;
            window.removeEventListener("scroll", handleScroll, listenerOptions);
        };
    }, [handleScroll]);

    // Memoize return object for stable reference
    const state = useMemo<ScrollState>(
        () => ({
            scrollY,
            direction,
            isPastThreshold: scrollY >= threshold,
        }),
        [scrollY, direction, threshold],
    );

    return state;
}
