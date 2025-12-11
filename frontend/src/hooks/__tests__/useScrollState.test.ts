/**
 * Tests for useScrollState hook
 *
 * This hook tracks scroll position and direction for UI behaviors like
 * collapsible navigation bars and "back to top" buttons.
 *
 * Test coverage:
 * - Returns scrollY position
 * - Returns direction ('up' | 'down' | 'idle')
 * - isPastThreshold true after scrolling past configurable threshold
 * - Direction change detection with hysteresis (prevents flicker)
 * - Cleanup removes scroll listener on unmount
 */

import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useScrollState } from "../useScrollState";

// =============================================================================
// Test Helpers - DRY utilities for scroll simulation
// =============================================================================

/** Default hook options for reference in tests */
const DEFAULT_THRESHOLD = 200;
const DEFAULT_HYSTERESIS = 10;

/** Current mock scroll position */
let mockScrollY = 0;

/**
 * Sets mock window.scrollY value
 * Use with fireScrollEvent() to simulate complete scroll action
 */
function setMockScrollY(value: number): void {
  mockScrollY = value;
}

/**
 * Dispatches scroll event on window
 * Call after setMockScrollY() to trigger hook update
 */
function fireScrollEvent(): void {
  window.dispatchEvent(new Event("scroll"));
}

/**
 * Combined helper: set scroll position and fire event
 * Wraps in act() for React state updates
 */
function simulateScrollTo(position: number): void {
  act(() => {
    setMockScrollY(position);
    fireScrollEvent();
  });
}

/**
 * Simulates scroll sequence with multiple positions
 * Useful for testing direction detection and hysteresis
 * Prefixed with _ as utility for future tests
 */
function _simulateScrollSequence(positions: number[]): void {
  positions.forEach((pos) => simulateScrollTo(pos));
}
// Export to prevent unused variable warning while keeping available for future tests
void _simulateScrollSequence;

// =============================================================================
// Mock Setup
// =============================================================================

beforeEach(() => {
  // Reset scroll position
  mockScrollY = 0;

  // Mock window.scrollY as a getter
  Object.defineProperty(window, "scrollY", {
    configurable: true,
    get: () => mockScrollY,
  });

  // Mock requestAnimationFrame to execute immediately in tests
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    cb(0);
    return 0;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// =============================================================================
// Tests
// =============================================================================

describe("useScrollState", () => {
  describe("scrollY position tracking", () => {
    it("should return initial scrollY of 0", () => {
      const { result } = renderHook(() => useScrollState());

      expect(result.current.scrollY).toBe(0);
    });

    it("should update scrollY when window is scrolled", () => {
      const { result } = renderHook(() => useScrollState());

      simulateScrollTo(150);

      expect(result.current.scrollY).toBe(150);
    });

    it("should track scrollY through multiple scroll events", () => {
      const { result } = renderHook(() => useScrollState());

      simulateScrollTo(100);
      expect(result.current.scrollY).toBe(100);

      simulateScrollTo(250);
      expect(result.current.scrollY).toBe(250);

      simulateScrollTo(50);
      expect(result.current.scrollY).toBe(50);
    });
  });

  describe("direction detection", () => {
    it("should return 'idle' as initial direction", () => {
      const { result } = renderHook(() => useScrollState());

      expect(result.current.direction).toBe("idle");
    });

    it("should return 'down' when scrolling down", () => {
      const { result } = renderHook(() => useScrollState());

      simulateScrollTo(100);

      expect(result.current.direction).toBe("down");
    });

    it("should return 'up' when scrolling up", () => {
      const { result } = renderHook(() => useScrollState());

      // First scroll down, then up
      simulateScrollTo(200);
      simulateScrollTo(100);

      expect(result.current.direction).toBe("up");
    });

    it("should return 'idle' when at top of page after scrolling", () => {
      const { result } = renderHook(() => useScrollState());

      simulateScrollTo(100);
      simulateScrollTo(0);

      // At top of page, direction should be idle (no meaningful direction)
      expect(result.current.direction).toBe("idle");
    });
  });

  describe("isPastThreshold", () => {
    it("should return false when scroll is below threshold", () => {
      const { result } = renderHook(() =>
        useScrollState({ threshold: DEFAULT_THRESHOLD })
      );

      simulateScrollTo(100);

      expect(result.current.isPastThreshold).toBe(false);
    });

    it("should return true when scroll is at threshold", () => {
      const { result } = renderHook(() =>
        useScrollState({ threshold: DEFAULT_THRESHOLD })
      );

      simulateScrollTo(DEFAULT_THRESHOLD);

      expect(result.current.isPastThreshold).toBe(true);
    });

    it("should return true when scroll is past threshold", () => {
      const { result } = renderHook(() =>
        useScrollState({ threshold: DEFAULT_THRESHOLD })
      );

      simulateScrollTo(300);

      expect(result.current.isPastThreshold).toBe(true);
    });

    it("should respect custom threshold value", () => {
      const customThreshold = 500;
      const { result } = renderHook(() =>
        useScrollState({ threshold: customThreshold })
      );

      simulateScrollTo(400);
      expect(result.current.isPastThreshold).toBe(false);

      simulateScrollTo(500);
      expect(result.current.isPastThreshold).toBe(true);
    });
  });

  describe("hysteresis (flicker prevention)", () => {
    it("should not change direction for small scroll movements", () => {
      const { result } = renderHook(() =>
        useScrollState({ hysteresis: DEFAULT_HYSTERESIS })
      );

      // Scroll down significantly
      simulateScrollTo(200);
      expect(result.current.direction).toBe("down");

      // Small scroll up (less than hysteresis) should NOT change direction
      simulateScrollTo(195);
      expect(result.current.direction).toBe("down");
    });

    it("should change direction when movement exceeds hysteresis", () => {
      const { result } = renderHook(() =>
        useScrollState({ hysteresis: DEFAULT_HYSTERESIS })
      );

      // Scroll down
      simulateScrollTo(200);
      expect(result.current.direction).toBe("down");

      // Scroll up more than hysteresis threshold
      simulateScrollTo(180);
      expect(result.current.direction).toBe("up");
    });

    it("should respect custom hysteresis value", () => {
      const customHysteresis = 50;
      const { result } = renderHook(() =>
        useScrollState({ hysteresis: customHysteresis })
      );

      simulateScrollTo(200);
      expect(result.current.direction).toBe("down");

      // Movement of 40px (less than 50px hysteresis) should NOT change direction
      simulateScrollTo(160);
      expect(result.current.direction).toBe("down");

      // Movement of 60px from 200 (more than 50px hysteresis) SHOULD change
      simulateScrollTo(140);
      expect(result.current.direction).toBe("up");
    });

    it("should work correctly through multiple direction changes", () => {
      const { result } = renderHook(() =>
        useScrollState({ hysteresis: DEFAULT_HYSTERESIS })
      );

      // Initial scroll down
      simulateScrollTo(100);
      expect(result.current.direction).toBe("down");

      // Continue down
      simulateScrollTo(200);
      expect(result.current.direction).toBe("down");

      // Scroll up past hysteresis
      simulateScrollTo(150);
      expect(result.current.direction).toBe("up");

      // Continue up
      simulateScrollTo(100);
      expect(result.current.direction).toBe("up");

      // Scroll down past hysteresis
      simulateScrollTo(150);
      expect(result.current.direction).toBe("down");
    });
  });

  describe("cleanup on unmount", () => {
    it("should remove scroll listener when component unmounts", () => {
      const addEventListenerSpy = vi.spyOn(window, "addEventListener");
      const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

      const { unmount } = renderHook(() => useScrollState());

      // Should have added listener
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "scroll",
        expect.any(Function),
        expect.any(Object)
      );

      unmount();

      // Should have removed listener
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "scroll",
        expect.any(Function),
        expect.any(Object)
      );
    });

    it("should not update state after unmount", () => {
      const { result, unmount } = renderHook(() => useScrollState());

      const scrollYBeforeUnmount = result.current.scrollY;

      unmount();

      // This should not throw or update anything
      act(() => {
        setMockScrollY(500);
        fireScrollEvent();
      });

      // Result is now stale but should still have old value (not crash)
      expect(result.current.scrollY).toBe(scrollYBeforeUnmount);
    });
  });

  describe("performance optimizations", () => {
    it("should use requestAnimationFrame for throttling", () => {
      const rafSpy = vi.spyOn(window, "requestAnimationFrame");

      renderHook(() => useScrollState());

      // Trigger scroll
      simulateScrollTo(100);

      // Should have called rAF
      expect(rafSpy).toHaveBeenCalled();
    });

    it("should return stable object reference via useMemo", () => {
      const { result, rerender } = renderHook(() => useScrollState());

      const firstRender = result.current;

      // Rerender without scroll (no state change)
      rerender();

      const secondRender = result.current;

      // Object reference should be stable when values haven't changed
      expect(firstRender).toBe(secondRender);
    });
  });
});
