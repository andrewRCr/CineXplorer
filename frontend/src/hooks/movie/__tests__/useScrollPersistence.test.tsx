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
import {
  assert,
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from "vitest";
import { MemoryRouter, useLocation } from "react-router";
import { StrictMode, type ReactNode } from "react";
import { useScrollPersistence } from "../useScrollPersistence";

/** Helper to create JSON storage entry format */
const createStorageEntry = (position: number, timestamp = Date.now()) =>
  JSON.stringify({ position, timestamp });

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
function createWrapper(
  initialEntries: string[] = ["/browse"],
  initialState?: object,
) {
  const [initialEntry] = initialEntries;
  assert.isDefined(initialEntry);
  const [pathname, search] = initialEntry.split("?");
  assert.isDefined(pathname);

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter
        initialEntries={[
          {
            pathname,
            search: search === undefined ? "" : `?${search}`,
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
      originalAddEventListener(
        event,
        handler as EventListenerOrEventListenerObject,
      );
    });

    window.removeEventListener = vi.fn((event, handler) => {
      if (event === "scroll") {
        scrollListeners = scrollListeners.filter((l) => l !== handler);
      }
      originalRemoveEventListener(
        event,
        handler as EventListenerOrEventListenerObject,
      );
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

  const savedPosition = (key = "scroll-discover-") =>
    // The hook stores each position as JSON of { position, timestamp }
    (
      JSON.parse(mockSessionStorage.getItem(key) ?? "{}") as {
        position?: number;
      }
    ).position;

  /** The window is at `position` and the browser delivers a scroll event; time passes past the save debounce. */
  function deliverScrollAt(position: number) {
    mockScrollY = position;
    act(() => {
      scrollListeners.forEach((listener) => listener());
      vi.advanceTimersByTime(200);
    });
  }

  it("keeps a pending return eligible when its signal is consumed", () => {
    mockSessionStorage.setItem("scroll-discover-", createStorageEntry(500));
    let eligible = true;
    const Router = createWrapper(["/browse"], { restoreScroll: true });
    function Wrapper({ children }: { children: ReactNode }) {
      return (
        <StrictMode>
          <Router>{children}</Router>
        </StrictMode>
      );
    }
    mockScrollTo.withImplementation(
      (_x: number, y: number) => {
        mockScrollY = y;
      },
      () => {
        const { result, rerender, unmount } = renderHook(
          (props) => {
            useScrollPersistence({
              ...defaultOptions,
              ...props,
              canRestore: () => eligible,
              onFreshVisit: () => {
                eligible = false;
              },
            });
            const state: unknown = useLocation().state;
            return state;
          },
          {
            wrapper: Wrapper,
            initialProps: { isLoading: true, hasContent: false },
          },
        );
        expect(result.current).toBeNull();
        expect(window.scrollY).toBe(0);
        rerender({ isLoading: false, hasContent: true });
        expect(window.scrollY).toBe(500);
        unmount();
      },
    );
  });

  it("withholds both the restore and initial offset when memory does not allow it", () => {
    mockSessionStorage.setItem("scroll-discover-", createStorageEntry(500));
    const { result } = renderHook(
      () =>
        useScrollPersistence({ ...defaultOptions, canRestore: () => false }),
      { wrapper: createWrapper(["/browse"], { restoreScroll: true }) },
    );
    expect(result.current.initialOffset).toBe(0);
    expect(result.current.scrollStorageKey).toBe("scroll-discover-");
    expect(mockScrollTo).not.toHaveBeenCalled();
  });

  it("reports the key after a debounced position save", () => {
    const saved: string[] = [];
    renderHook(
      () =>
        useScrollPersistence({
          ...defaultOptions,
          onSave: (key) => saved.push(key),
        }),
      { wrapper: createWrapper() },
    );
    mockScrollY = 375;
    act(() => {
      scrollListeners.forEach((listener) => listener());
      vi.advanceTimersByTime(200);
    });
    expect(
      JSON.parse(mockSessionStorage.getItem("scroll-discover-") ?? "{}"),
    ).toMatchObject({ position: 375 });
    expect(saved).toEqual(["scroll-discover-"]);
  });

  it("reports no position save while the restoration guard holds", () => {
    mockSessionStorage.setItem("scroll-discover-", createStorageEntry(500));
    const saved: string[] = [];
    renderHook(
      () =>
        useScrollPersistence({
          ...defaultOptions,
          onSave: (key) => saved.push(key),
        }),
      { wrapper: createWrapper(["/browse"], { restoreScroll: true }) },
    );
    act(() => {
      scrollListeners.forEach((listener) => listener());
    });
    expect(saved).toEqual([]);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(saved).toEqual([]);
    mockScrollY = 650;
    act(() => {
      scrollListeners.forEach((listener) => listener());
      vi.advanceTimersByTime(200);
    });
    expect(
      JSON.parse(mockSessionStorage.getItem("scroll-discover-") ?? "{}"),
    ).toMatchObject({ position: 650 });
    expect(saved).toEqual(["scroll-discover-"]);
  });

  describe("a return waiting for its results", () => {
    beforeEach(() => {
      mockScrollTo.mockImplementation((_x: number, y: number) => {
        mockScrollY = y;
      });
    });

    afterEach(() => {
      mockScrollTo.mockImplementation(() => {});
    });

    interface LoadProps {
      isLoading: boolean;
      hasContent: boolean;
      loadedCount?: number;
      hasMore?: boolean;
    }
    const loading: LoadProps = { isLoading: true, hasContent: false };
    const loaded: LoadProps = { isLoading: false, hasContent: true };

    // A grid that follows later pages reports how many results have loaded and whether more can; one that doesn't,
    // reports neither
    it.each([
      [
        "a grid that follows later pages",
        { ...loading, loadedCount: 0, hasMore: false },
        { ...loaded, loadedCount: 39, hasMore: false },
      ],
      ["a grid that doesn't", loading, loaded],
    ])(
      "keeps the saved position through a scroll the page makes while loading, in %s",
      (_grid, before, after) => {
        mockSessionStorage.setItem(
          "scroll-discover-",
          createStorageEntry(2600),
        );
        const { rerender } = renderHook(
          (props: LoadProps) =>
            useScrollPersistence({ ...defaultOptions, ...props }),
          {
            wrapper: createWrapper(["/browse"], { restoreScroll: true }),
            initialProps: before,
          },
        );
        // The grid places itself at the position, and the browser stops at the end of the shorter loading grid
        deliverScrollAt(1353);
        expect(savedPosition()).toBe(2600);
        rerender(after);
        expect(window.scrollY).toBe(2600);
      },
    );

    // While the results load, the page sits at the end of the loading grid, so input there must not end the return
    it.each([
      ["a click", () => window.dispatchEvent(new PointerEvent("pointerdown"))],
      [
        "a key press",
        () =>
          window.dispatchEvent(new KeyboardEvent("keydown", { key: "Meta" })),
      ],
      [
        "a scroll",
        () => {
          window.dispatchEvent(new WheelEvent("wheel"));
          mockScrollY = 400;
          scrollListeners.forEach((listener) => listener());
        },
      ],
    ])(
      "still lands at its position after %s during the wait",
      (_input, input) => {
        mockSessionStorage.setItem(
          "scroll-discover-",
          createStorageEntry(2600),
        );
        const { rerender } = renderHook(
          (props: LoadProps) =>
            useScrollPersistence({ ...defaultOptions, ...props }),
          {
            wrapper: createWrapper(["/browse"], { restoreScroll: true }),
            initialProps: { ...loading, loadedCount: 0, hasMore: false },
          },
        );
        mockScrollY = 1353;
        act(() => {
          input();
          vi.advanceTimersByTime(300);
        });
        expect(savedPosition()).toBe(2600);
        rerender({ ...loaded, loadedCount: 20, hasMore: true });
        expect(window.scrollY).toBe(2600);
      },
    );

    it("keeps a save that is still waiting out its delay when the results arrive", () => {
      const { rerender } = renderHook(
        (props: LoadProps) =>
          useScrollPersistence({ ...defaultOptions, ...props }),
        { wrapper: createWrapper(), initialProps: loading },
      );
      mockScrollY = 500;
      act(() => {
        scrollListeners.forEach((listener) => listener());
        vi.advanceTimersByTime(100);
      });
      rerender(loaded);
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(savedPosition()).toBe(500);
    });

    it("saves under the new filters when they change while a return waits", () => {
      mockSessionStorage.setItem("scroll-discover-", createStorageEntry(2600));
      const { rerender } = renderHook(
        (props: { browseParams: Record<string, string> }) =>
          useScrollPersistence({ ...defaultOptions, ...loading, ...props }),
        {
          wrapper: createWrapper(["/browse"], { restoreScroll: true }),
          initialProps: { browseParams: {} },
        },
      );
      rerender({ browseParams: { genre: "18" } });
      deliverScrollAt(700);
      expect(savedPosition()).toBe(2600);
      expect(savedPosition("scroll-discover-genre=18")).toBe(700);
    });

    it("saves while loading when memory does not allow the return", () => {
      mockSessionStorage.setItem("scroll-discover-", createStorageEntry(2600));
      renderHook(
        () =>
          useScrollPersistence({
            ...defaultOptions,
            isLoading: true,
            hasContent: false,
            canRestore: () => false,
          }),
        { wrapper: createWrapper(["/browse"], { restoreScroll: true }) },
      );
      deliverScrollAt(300);
      expect(savedPosition()).toBe(300);
    });
  });

  describe("returning past the results loaded so far", () => {
    // Each page of results makes the document 1900 px taller; the browser clamps a scroll to what exists
    let maxScroll = 0;
    const scrollWithinContent = (_x: number, y: number) => {
      mockScrollY = Math.min(y, maxScroll);
    };
    const pageHeight = 1900;

    interface ReturnProps {
      loadedCount: number;
      hasMore: boolean;
      isError?: boolean;
    }

    function returnTo(position: number, initialProps: Partial<ReturnProps>) {
      mockSessionStorage.setItem(
        "scroll-discover-",
        createStorageEntry(position),
      );
      const props: ReturnProps = {
        loadedCount: 20,
        hasMore: true,
        ...initialProps,
      };
      return renderHook(
        (current: ReturnProps) =>
          useScrollPersistence({ ...defaultOptions, ...current }),
        {
          wrapper: createWrapper(["/browse"], { restoreScroll: true }),
          initialProps: props,
        },
      );
    }

    beforeEach(() => {
      maxScroll = pageHeight;
      mockScrollTo.mockImplementation(scrollWithinContent);
    });

    afterEach(() => {
      mockScrollTo.mockImplementation(() => {});
    });

    it("keeps restoring as later pages load, until the saved position is reached", () => {
      const { rerender } = returnTo(6000, {});
      expect(window.scrollY).toBe(1900);
      for (const loadedCount of [40, 60]) {
        maxScroll += pageHeight;
        rerender({ loadedCount, hasMore: true });
        expect(window.scrollY).toBe(maxScroll);
        // A position the restore passes through is never saved
        act(() => {
          scrollListeners.forEach((listener) => listener());
          vi.advanceTimersByTime(300);
        });
        expect(savedPosition()).toBe(6000);
      }
      maxScroll += pageHeight;
      rerender({ loadedCount: 80, hasMore: true });
      expect(window.scrollY).toBe(6000);
      act(() => {
        vi.advanceTimersByTime(300);
      });
      deliverScrollAt(6100);
      expect(savedPosition()).toBe(6100);
    });

    it("stops following once the visitor scrolls", () => {
      const { rerender } = returnTo(6000, {});
      act(() => {
        vi.advanceTimersByTime(300);
        window.dispatchEvent(new WheelEvent("wheel"));
      });
      maxScroll += pageHeight;
      rerender({ loadedCount: 40, hasMore: true });
      expect(window.scrollY).toBe(1900);
      act(() => {
        vi.advanceTimersByTime(300);
      });
      deliverScrollAt(1500);
      expect(savedPosition()).toBe(1500);
    });

    it("saves a takeover scroll that ends at once", () => {
      returnTo(6000, {});
      act(() => {
        vi.advanceTimersByTime(300);
      });
      // A key press, then the scroll it causes, finished well within 100 ms of the input
      act(() => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "PageUp" }));
        vi.advanceTimersByTime(30);
        mockScrollY = 1700;
        scrollListeners.forEach((listener) => listener());
        vi.advanceTimersByTime(250);
      });
      expect(savedPosition()).toBe(1700);
    });

    it("replaces the old target when the visitor clicks without scrolling", () => {
      returnTo(6000, {});
      act(() => {
        vi.advanceTimersByTime(300);
        window.dispatchEvent(new PointerEvent("pointerdown"));
      });
      expect(savedPosition()).toBe(1900);
    });

    it("stops when no more results can load", () => {
      returnTo(6000, { hasMore: false });
      expect(window.scrollY).toBe(1900);
      act(() => {
        vi.advanceTimersByTime(300);
      });
      deliverScrollAt(1200);
      expect(savedPosition()).toBe(1200);
    });

    it("stops when a page fails to load", () => {
      const { rerender } = returnTo(6000, {});
      act(() => {
        vi.advanceTimersByTime(300);
      });
      rerender({ loadedCount: 20, hasMore: true, isError: true });
      const afterFailure = window.scrollY;
      // A later page doesn't pull the visitor back toward the saved position
      maxScroll += pageHeight;
      rerender({ loadedCount: 40, hasMore: true, isError: false });
      expect(window.scrollY).toBe(afterFailure);
      act(() => {
        vi.advanceTimersByTime(300);
      });
      deliverScrollAt(500);
      expect(savedPosition()).toBe(500);
    });

    it("finishes when the second scroll reaches the position without a new page", () => {
      returnTo(3000, {});
      expect(window.scrollY).toBe(1900);
      // The document grows before the second scroll, without more results
      maxScroll = 3800;
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(window.scrollY).toBe(3000);
      deliverScrollAt(3200);
      expect(savedPosition()).toBe(3200);
    });

    it("stops after ten more pages", () => {
      const { rerender } = returnTo(100000, {});
      for (let page = 2; page <= 12; page++) {
        maxScroll += pageHeight;
        rerender({ loadedCount: page * 20, hasMore: true });
      }
      // Pages 2 to 11 were followed; the twelfth loaded without moving the visitor
      expect(window.scrollY).toBe(11 * pageHeight);
      act(() => {
        vi.advanceTimersByTime(300);
      });
      deliverScrollAt(20000);
      expect(savedPosition()).toBe(20000);
    });
  });

  describe("initial offset behavior", () => {
    it("returns 0 when no saved position exists", () => {
      const { result } = renderHook(
        () => useScrollPersistence(defaultOptions),
        {
          wrapper: createWrapper(),
        },
      );

      expect(result.current.initialOffset).toBe(0);
    });

    it("returns 0 on fresh navigation even with saved position", () => {
      // Save a scroll position first (JSON format with position and timestamp)
      mockSessionStorage.setItem("scroll-discover-", createStorageEntry(500));

      const { result } = renderHook(
        () => useScrollPersistence(defaultOptions),
        {
          wrapper: createWrapper(), // No restoreScroll state
        },
      );

      // Should return 0 because this is fresh navigation, not back-navigation
      expect(result.current.initialOffset).toBe(0);
    });

    it("returns saved position for back-navigation with restoreScroll state", () => {
      // Save a scroll position first (JSON format with position and timestamp)
      mockSessionStorage.setItem("scroll-discover-", createStorageEntry(500));

      const { result } = renderHook(
        () => useScrollPersistence(defaultOptions),
        {
          wrapper: createWrapper(["/browse"], { restoreScroll: true }),
        },
      );

      expect(result.current.initialOffset).toBe(500);
    });

    it("includes query in storage key for search routes", () => {
      mockSessionStorage.setItem(
        "scroll-search--q=inception",
        createStorageEntry(750),
      );

      const { result } = renderHook(
        () =>
          useScrollPersistence({
            ...defaultOptions,
            source: "search",
            query: "inception",
          }),
        {
          wrapper: createWrapper(["/search?q=inception"], {
            restoreScroll: true,
          }),
        },
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

      // Verify position saved as JSON with timestamp
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        "scroll-discover-",
        expect.stringContaining('"position":300'),
      );
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
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        "scroll-discover-",
        expect.stringContaining('"position":300'),
      );
    });
  });

  describe("filter change behavior", () => {
    it("resets scroll to top when filter params change", () => {
      const { rerender } = renderHook((props) => useScrollPersistence(props), {
        wrapper: createWrapper(),
        initialProps: {
          ...defaultOptions,
          browseParams: { minYear: "2024" },
        },
      });

      // Change filters
      rerender({
        ...defaultOptions,
        browseParams: { minYear: "2023" },
      });

      expect(mockScrollTo).toHaveBeenCalledWith(0, 0);
    });

    it("resets scroll to top when source changes", () => {
      const { rerender } = renderHook((props) => useScrollPersistence(props), {
        wrapper: createWrapper(),
        initialProps: defaultOptions,
      });

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
      const { rerender } = renderHook((props) => useScrollPersistence(props), {
        wrapper: createWrapper(),
        initialProps: defaultOptions,
      });

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
      const { unmount } = renderHook(
        () => useScrollPersistence(defaultOptions),
        {
          wrapper: createWrapper(),
        },
      );

      expect(window.addEventListener).toHaveBeenCalledWith(
        "scroll",
        expect.any(Function),
        { passive: true },
      );

      unmount();

      expect(window.removeEventListener).toHaveBeenCalledWith(
        "scroll",
        expect.any(Function),
      );
    });
  });

  describe("edge cases", () => {
    it("handles saved position larger than available", () => {
      // Save a very large position (beyond any realistic content height)
      mockSessionStorage.setItem(
        "scroll-discover-",
        createStorageEntry(999999),
      );

      const { result } = renderHook(
        () => useScrollPersistence(defaultOptions),
        {
          wrapper: createWrapper(["/browse"], { restoreScroll: true }),
        },
      );

      // Should still return the saved position - actual scrolling is browser's concern
      // This verifies the hook doesn't try to validate position against content height
      expect(result.current.initialOffset).toBe(999999);
    });

    it("handles rapid scroll events at 16ms intervals", () => {
      renderHook(() => useScrollPersistence(defaultOptions), {
        wrapper: createWrapper(),
      });

      // Simulate rapid scroll events (every 16ms, like requestAnimationFrame)
      for (let i = 0; i < 10; i++) {
        mockScrollY = i * 100;
        act(() => {
          scrollListeners.forEach((listener) => listener());
          vi.advanceTimersByTime(16);
        });
      }

      // Before debounce completes, no save should occur
      expect(mockSessionStorage.setItem).not.toHaveBeenCalled();

      // Complete the debounce
      act(() => {
        vi.advanceTimersByTime(200);
      });

      // Should only save the final position
      expect(mockSessionStorage.setItem).toHaveBeenCalledTimes(1);
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        "scroll-discover-",
        expect.stringContaining('"position":900'),
      );
    });

    it("cancels debounced save on unmount", () => {
      const { unmount } = renderHook(
        () => useScrollPersistence(defaultOptions),
        {
          wrapper: createWrapper(),
        },
      );

      // Trigger scroll event
      mockScrollY = 500;
      act(() => {
        scrollListeners.forEach((listener) => listener());
      });

      // Unmount before debounce completes
      act(() => {
        vi.advanceTimersByTime(100);
      });
      unmount();

      // Complete what would have been the debounce period
      act(() => {
        vi.advanceTimersByTime(200);
      });

      // Save should NOT have occurred (cleanup cancelled the timeout)
      expect(mockSessionStorage.setItem).not.toHaveBeenCalled();
    });

    it("handles position 0 correctly (not treated as falsy)", () => {
      // Use JSON format - position 0 should be preserved, not treated as falsy
      mockSessionStorage.setItem("scroll-discover-", createStorageEntry(0));

      const { result } = renderHook(
        () => useScrollPersistence(defaultOptions),
        {
          wrapper: createWrapper(["/browse"], { restoreScroll: true }),
        },
      );

      // Position 0 should be returned (not default to something else)
      expect(result.current.initialOffset).toBe(0);
    });

    it("generates different keys for different genre combinations", () => {
      // Test with genres = [28]
      const { rerender } = renderHook((props) => useScrollPersistence(props), {
        wrapper: createWrapper(),
        initialProps: {
          ...defaultOptions,
          browseParams: { genres: [28] },
        },
      });

      mockScrollY = 100;
      act(() => {
        scrollListeners.forEach((listener) => listener());
        vi.advanceTimersByTime(200);
      });

      // Change to different genres - should reset scroll
      rerender({
        ...defaultOptions,
        browseParams: { genres: [35] },
      });

      expect(mockScrollTo).toHaveBeenCalledWith(0, 0);
    });

    it("does not save scroll during restoration guard period", () => {
      // Set up for back-navigation with restoration (JSON format)
      mockSessionStorage.setItem("scroll-discover-", createStorageEntry(500));

      renderHook(() => useScrollPersistence(defaultOptions), {
        wrapper: createWrapper(["/browse"], { restoreScroll: true }),
      });

      // Immediately scroll (simulating virtualizer adjustments during restore)
      mockScrollY = 300;
      act(() => {
        scrollListeners.forEach((listener) => listener());
        vi.advanceTimersByTime(200);
      });

      // First call is from scrollTo during restore, not our save
      // The guard should prevent saving the intermediate position
      const setCalls = mockSessionStorage.setItem.mock.calls;
      // Either no save calls, or if there are, they shouldn't save the intermediate position (300)
      if (setCalls.length > 0) {
        // If saved, it should NOT be the intermediate scroll position
        const lastCall = setCalls[setCalls.length - 1];
        assert.isDefined(lastCall);
        expect(lastCall[1]).not.toContain('"position":300');
      }
    });
  });
});
