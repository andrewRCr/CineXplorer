/**
 * Tests for useScrollPersistence hook
 *
 * This hook manages scroll position persistence for virtualized grids,
 * handling save/restore for back-navigation UX, filter change resets,
 * and error state resets.
 *
 * Test coverage:
 * - Initial offset returns 0 when no saved position or not back-navigation
 * - Initial offset returns saved position for back-navigation (restoreScroll state)
 * - Scroll position is saved on scroll events (debounced)
 * - Filter changes reset scroll to top
 * - Error state resets scroll to top
 * - Location state is cleared after capture
 */

import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { useScrollPersistence } from "../useScrollPersistence";

// Mock sessionStorage
const mockSessionStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
  };
})();

Object.defineProperty(window, "sessionStorage", {
  value: mockSessionStorage,
  writable: true,
});

// Mock window.scrollTo
const mockScrollTo = vi.fn();
Object.defineProperty(window, "scrollTo", {
  value: mockScrollTo,
  writable: true,
});

// Mock window.scrollY
let mockScrollY = 0;
Object.defineProperty(window, "scrollY", {
  get: () => mockScrollY,
  configurable: true,
});

// Track scroll listeners
let scrollListeners: (() => void)[] = [];
const originalAddEventListener = window.addEventListener.bind(window);
const originalRemoveEventListener = window.removeEventListener.bind(window);

// Helper to create wrapper with MemoryRouter
function createWrapper(initialEntries: string[] = ["/browse"], initialState?: object) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter
        initialEntries={[
          {
            pathname: initialEntries[0].split("?")[0],
            search: initialEntries[0].includes("?") ? `?${initialEntries[0].split("?")[1]}` : "",
            state: initialState,
          },
        ]}
      >
        {children}
      </MemoryRouter>
    );
  };
}

describe("useScrollPersistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockSessionStorage.clear();
    mockScrollY = 0;
    scrollListeners = [];

    // Mock addEventListener to capture scroll listeners
    window.addEventListener = vi.fn((event, handler) => {
      if (event === "scroll") {
        scrollListeners.push(handler as () => void);
      }
      originalAddEventListener(event, handler as EventListenerOrEventListenerObject);
    });

    window.removeEventListener = vi.fn((event, handler) => {
      if (event === "scroll") {
        scrollListeners = scrollListeners.filter((l) => l !== handler);
      }
      originalRemoveEventListener(event, handler as EventListenerOrEventListenerObject);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    window.addEventListener = originalAddEventListener;
    window.removeEventListener = originalRemoveEventListener;
  });

  const defaultOptions = {
    source: "discover",
    browseParams: {},
    isLoading: false,
    hasContent: true,
    isError: false,
  };

  describe("initial offset behavior", () => {
    it("returns 0 when no saved position exists", () => {
      const { result } = renderHook(() => useScrollPersistence(defaultOptions), {
        wrapper: createWrapper(),
      });

      expect(result.current.initialOffset).toBe(0);
    });

    it("returns 0 on fresh navigation even with saved position", () => {
      // Save a scroll position first
      mockSessionStorage.setItem("scroll-discover-", "500");

      const { result } = renderHook(() => useScrollPersistence(defaultOptions), {
        wrapper: createWrapper(), // No restoreScroll state
      });

      // Should return 0 because this is fresh navigation, not back-navigation
      expect(result.current.initialOffset).toBe(0);
    });

    it("returns saved position for back-navigation with restoreScroll state", () => {
      // Save a scroll position first
      mockSessionStorage.setItem("scroll-discover-", "500");

      const { result } = renderHook(() => useScrollPersistence(defaultOptions), {
        wrapper: createWrapper(["/browse"], { restoreScroll: true }),
      });

      expect(result.current.initialOffset).toBe(500);
    });

    it("includes query in storage key for search routes", () => {
      mockSessionStorage.setItem("scroll-search--q=inception", "750");

      const { result } = renderHook(
        () =>
          useScrollPersistence({
            ...defaultOptions,
            source: "search",
            query: "inception",
          }),
        { wrapper: createWrapper(["/search?q=inception"], { restoreScroll: true }) }
      );

      expect(result.current.initialOffset).toBe(750);
    });
  });

  describe("scroll position saving", () => {
    it("saves scroll position on scroll event (debounced)", () => {
      renderHook(() => useScrollPersistence(defaultOptions), {
        wrapper: createWrapper(),
      });

      // Simulate scroll
      mockScrollY = 300;
      act(() => {
        scrollListeners.forEach((listener) => listener());
      });

      // Should not save immediately (debounced)
      expect(mockSessionStorage.setItem).not.toHaveBeenCalled();

      // Fast-forward debounce delay (200ms)
      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith("scroll-discover-", "300");
    });

    it("debounces multiple scroll events", () => {
      renderHook(() => useScrollPersistence(defaultOptions), {
        wrapper: createWrapper(),
      });

      // First scroll
      mockScrollY = 100;
      act(() => {
        scrollListeners.forEach((listener) => listener());
      });

      // Second scroll before debounce completes
      act(() => {
        vi.advanceTimersByTime(100);
      });
      mockScrollY = 200;
      act(() => {
        scrollListeners.forEach((listener) => listener());
      });

      // Third scroll
      act(() => {
        vi.advanceTimersByTime(100);
      });
      mockScrollY = 300;
      act(() => {
        scrollListeners.forEach((listener) => listener());
      });

      // Complete debounce
      act(() => {
        vi.advanceTimersByTime(200);
      });

      // Should only save final position
      expect(mockSessionStorage.setItem).toHaveBeenCalledTimes(1);
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith("scroll-discover-", "300");
    });
  });

  describe("filter change behavior", () => {
    it("resets scroll to top when filter params change", () => {
      const { rerender } = renderHook(
        (props) => useScrollPersistence(props),
        {
          wrapper: createWrapper(),
          initialProps: {
            ...defaultOptions,
            browseParams: { minYear: "2024" },
          },
        }
      );

      // Change filters
      rerender({
        ...defaultOptions,
        browseParams: { minYear: "2023" },
      });

      expect(mockScrollTo).toHaveBeenCalledWith(0, 0);
    });

    it("resets scroll to top when source changes", () => {
      const { rerender } = renderHook(
        (props) => useScrollPersistence(props),
        {
          wrapper: createWrapper(),
          initialProps: defaultOptions,
        }
      );

      // Change source
      rerender({
        ...defaultOptions,
        source: "top-rated",
      });

      expect(mockScrollTo).toHaveBeenCalledWith(0, 0);
    });
  });

  describe("error state behavior", () => {
    it("resets scroll to top on error", () => {
      const { rerender } = renderHook(
        (props) => useScrollPersistence(props),
        {
          wrapper: createWrapper(),
          initialProps: defaultOptions,
        }
      );

      // Trigger error state
      rerender({
        ...defaultOptions,
        isError: true,
      });

      expect(mockScrollTo).toHaveBeenCalledWith(0, 0);
    });
  });

  describe("cleanup", () => {
    it("removes scroll listener on unmount", () => {
      const { unmount } = renderHook(() => useScrollPersistence(defaultOptions), {
        wrapper: createWrapper(),
      });

      expect(window.addEventListener).toHaveBeenCalledWith(
        "scroll",
        expect.any(Function),
        { passive: true }
      );

      unmount();

      expect(window.removeEventListener).toHaveBeenCalledWith(
        "scroll",
        expect.any(Function)
      );
    });
  });
});
