import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useMovieCollectionState } from "../useMovieCollectionState";
import { BrowserRouter } from "react-router-dom";
import { type ReactNode } from "react";

// Import the actual module to get the mock
import { useMovieCollectionUrl } from "../useMovieCollectionUrl";

// Mock the useMovieCollectionUrl hook
vi.mock("../useMovieCollectionUrl");

const mockUseMovieCollectionUrl = vi.mocked(useMovieCollectionUrl);

// Wrapper for router context
const wrapper = ({ children }: { children: ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe("useMovieCollectionState", () => {
  beforeEach(() => {
    // Reset window.location for each test
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).location;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).location = new URL("http://localhost:3000");

    // Reset mock to default behavior
    mockUseMovieCollectionUrl.mockReturnValue({
      unifiedFilters: {
        query: "",
        genres: [],
        minYear: "",
        maxYear: "",
        minRating: "",
        maxRating: "",
        minRuntime: "",
        maxRuntime: "",
        sortBy: "popularity.desc",
        language: "",
      },
      handleUnifiedFiltersChange: vi.fn(),
      currentPageFromUrl: 1,
      handlePageChange: vi.fn(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Smart initialization - showAdvanced from URL", () => {
    it("should initialize showAdvanced to true when rating filters are in URL", async () => {
      // Arrange: Mock URL parsing to return rating filters
      mockUseMovieCollectionUrl.mockReturnValue({
        unifiedFilters: {
          query: "",
          genres: [],
          minYear: "",
          maxYear: "",
          minRating: "1.0",
          maxRating: "3.5",
          minRuntime: "",
          maxRuntime: "",
          sortBy: "popularity.desc",
          language: "",
        },
        handleUnifiedFiltersChange: vi.fn(),
        currentPageFromUrl: 1,
        handlePageChange: vi.fn(),
      });

      // Act: Render hook
      const { result } = renderHook(() => useMovieCollectionState(), {
        wrapper,
      });

      // Assert: Advanced panel should be expanded (after effect runs)
      await waitFor(() => {
        expect(result.current.showAdvanced).toBe(true);
      });
    });

    it("should initialize showAdvanced to true when custom year range is in URL", async () => {
      // Arrange: Mock URL parsing to return custom year range
      mockUseMovieCollectionUrl.mockReturnValue({
        unifiedFilters: {
          query: "",
          genres: [],
          minYear: "2000",
          maxYear: "2010",
          minRating: "",
          maxRating: "",
          minRuntime: "",
          maxRuntime: "",
          sortBy: "popularity.desc",
          language: "",
        },
        handleUnifiedFiltersChange: vi.fn(),
        currentPageFromUrl: 1,
        handlePageChange: vi.fn(),
      });

      // Act: Render hook
      const { result } = renderHook(() => useMovieCollectionState(), {
        wrapper,
      });

      // Assert: Advanced panel should be expanded (after effect runs)
      await waitFor(() => {
        expect(result.current.showAdvanced).toBe(true);
      });
    });

    it("should initialize showAdvanced to false when single year is in URL", async () => {
      // Arrange: Mock URL parsing to return single year (not a range)
      mockUseMovieCollectionUrl.mockReturnValue({
        unifiedFilters: {
          query: "",
          genres: [],
          minYear: "2020",
          maxYear: "2020",
          minRating: "",
          maxRating: "",
          minRuntime: "",
          maxRuntime: "",
          sortBy: "popularity.desc",
          language: "",
        },
        handleUnifiedFiltersChange: vi.fn(),
        currentPageFromUrl: 1,
        handlePageChange: vi.fn(),
      });

      // Act: Render hook
      const { result } = renderHook(() => useMovieCollectionState(), {
        wrapper,
      });

      // Assert: Advanced panel should NOT be expanded (single year is minimal)
      // Give effect a chance to run (though it shouldn't change anything)
      await waitFor(() => {
        expect(result.current.showAdvanced).toBe(false);
      });
    });

    it("should initialize showAdvanced to false when only genres are in URL", () => {
      // Arrange: Set URL with only genres (minimal filter)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).location = new URL("http://localhost:3000?genres=28,12");

      // Act: Render hook
      const { result } = renderHook(() => useMovieCollectionState(), {
        wrapper,
      });

      // Assert: Advanced panel should NOT be expanded
      expect(result.current.showAdvanced).toBe(false);
    });

    it("should initialize showAdvanced to false when URL has no filters", () => {
      // Arrange: Set URL with no filters
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).location = new URL("http://localhost:3000");

      // Act: Render hook
      const { result } = renderHook(() => useMovieCollectionState(), {
        wrapper,
      });

      // Assert: Advanced panel should NOT be expanded
      expect(result.current.showAdvanced).toBe(false);
    });

    it("should preserve showAdvanced state across remounts with same URL", async () => {
      // Arrange: Mock URL parsing to return rating filters
      mockUseMovieCollectionUrl.mockReturnValue({
        unifiedFilters: {
          query: "",
          genres: [],
          minYear: "",
          maxYear: "",
          minRating: "1.0",
          maxRating: "3.5",
          minRuntime: "",
          maxRuntime: "",
          sortBy: "popularity.desc",
          language: "",
        },
        handleUnifiedFiltersChange: vi.fn(),
        currentPageFromUrl: 1,
        handlePageChange: vi.fn(),
      });

      // Act: First render
      const { result: result1, unmount } = renderHook(
        () => useMovieCollectionState(),
        { wrapper }
      );

      await waitFor(() => {
        expect(result1.current.showAdvanced).toBe(true);
      });

      // Unmount (simulating navigation away)
      unmount();

      // Act: Second render (simulating back navigation with same filters)
      const { result: result2 } = renderHook(
        () => useMovieCollectionState(),
        { wrapper }
      );

      // Assert: Advanced panel should still be expanded
      await waitFor(() => {
        expect(result2.current.showAdvanced).toBe(true);
      });
    });
  });

  describe("Advanced panel toggle", () => {
    it("should toggle showAdvanced when toggleAdvanced is called", () => {
      // Arrange
      const { result } = renderHook(() => useMovieCollectionState(), {
        wrapper,
      });
      expect(result.current.showAdvanced).toBe(false);

      // Act: Toggle to true
      act(() => {
        result.current.toggleAdvanced();
      });

      // Assert
      expect(result.current.showAdvanced).toBe(true);

      // Act: Toggle back to false
      act(() => {
        result.current.toggleAdvanced();
      });

      // Assert
      expect(result.current.showAdvanced).toBe(false);
    });

    it("should set showAdvanced directly with setShowAdvanced", () => {
      // Arrange
      const { result } = renderHook(() => useMovieCollectionState(), {
        wrapper,
      });

      // Act: Set to true
      act(() => {
        result.current.setShowAdvanced(true);
      });

      // Assert
      expect(result.current.showAdvanced).toBe(true);

      // Act: Set to false
      act(() => {
        result.current.setShowAdvanced(false);
      });

      // Assert
      expect(result.current.showAdvanced).toBe(false);
    });
  });

  describe("Derived state - hasAdvancedFilters", () => {
    it("should detect rating filters as advanced", () => {
      // Arrange: Use non-URL-synced mode for filter update testing
      const { result } = renderHook(
        () => useMovieCollectionState({ enableUrlSync: false }),
        { wrapper }
      );

      // Act: Add rating filters
      act(() => {
        result.current.onFiltersChange({
          minRating: "7.0",
          maxRating: "10.0",
        });
      });

      // Assert
      expect(result.current.hasAdvancedFilters).toBe(true);
    });

    it("should detect custom year range as advanced", () => {
      // Arrange: Use non-URL-synced mode for filter update testing
      const { result } = renderHook(
        () => useMovieCollectionState({ enableUrlSync: false }),
        { wrapper }
      );

      // Act: Add custom year range
      act(() => {
        result.current.onFiltersChange({
          minYear: "2000",
          maxYear: "2010",
        });
      });

      // Assert
      expect(result.current.hasAdvancedFilters).toBe(true);
    });

    it("should NOT detect single year as advanced", () => {
      // Arrange: Use non-URL-synced mode for filter update testing
      const { result } = renderHook(
        () => useMovieCollectionState({ enableUrlSync: false }),
        { wrapper }
      );

      // Act: Add single year
      act(() => {
        result.current.onFiltersChange({
          minYear: "2020",
          maxYear: "2020",
        });
      });

      // Assert
      expect(result.current.hasAdvancedFilters).toBe(false);
    });

    it("should NOT detect genres as advanced", () => {
      // Arrange: Use non-URL-synced mode for filter update testing
      const { result } = renderHook(
        () => useMovieCollectionState({ enableUrlSync: false }),
        { wrapper }
      );

      // Act: Add genres
      act(() => {
        result.current.onFiltersChange({
          genres: [28, 12], // Action, Adventure
        });
      });

      // Assert
      expect(result.current.hasAdvancedFilters).toBe(false);
    });
  });

  describe("Clear filters action", () => {
    it("should reset filters and collapse advanced panel when clearFilters called", async () => {
      // Arrange: Mock URL parsing to return rating filters
      mockUseMovieCollectionUrl.mockReturnValue({
        unifiedFilters: {
          query: "",
          genres: [],
          minYear: "",
          maxYear: "",
          minRating: "1.0",
          maxRating: "3.5",
          minRuntime: "",
          maxRuntime: "",
          sortBy: "popularity.desc",
          language: "",
        },
        handleUnifiedFiltersChange: vi.fn(),
        currentPageFromUrl: 1,
        handlePageChange: vi.fn(),
      });

      const { result } = renderHook(() => useMovieCollectionState(), {
        wrapper,
      });

      // Wait for effect to expand panel based on filters
      await waitFor(() => {
        expect(result.current.showAdvanced).toBe(true);
      });

      // Act: Clear filters
      act(() => {
        result.current.clearFilters();
      });

      // Assert: Advanced panel should be collapsed
      expect(result.current.showAdvanced).toBe(false);
    });
  });

  describe("Filter state management", () => {
    it("should update filters when onFiltersChange called with partial update", () => {
      // Arrange: Use non-URL-synced mode to test local state management
      const { result } = renderHook(
        () => useMovieCollectionState({ enableUrlSync: false }),
        { wrapper }
      );

      // Act: Update query filter
      act(() => {
        result.current.onFiltersChange({ query: "inception" });
      });

      // Assert: Query should be updated, other filters unchanged
      expect(result.current.filters.query).toBe("inception");
      expect(result.current.filters.genres).toEqual([]);
      expect(result.current.hasActiveFilters).toBe(true);
    });

    it("should calculate filterCount correctly", () => {
      // Arrange: Use non-URL-synced mode to test local state management
      const { result } = renderHook(
        () => useMovieCollectionState({ enableUrlSync: false }),
        { wrapper }
      );

      // Act: Add multiple filters
      act(() => {
        result.current.onFiltersChange({
          query: "test",
          genres: [28, 12],
          minRating: "7.0",
        });
      });

      // Assert: filterCount should include query (1) + genres (2) + rating (1) = 4
      expect(result.current.filterCount).toBe(4);
    });

    it("should detect hasActiveFilters correctly", () => {
      // Arrange: Use non-URL-synced mode to test local state management
      const { result } = renderHook(
        () => useMovieCollectionState({ enableUrlSync: false }),
        { wrapper }
      );

      // Initial state: no active filters
      expect(result.current.hasActiveFilters).toBe(false);

      // Act: Add filter
      act(() => {
        result.current.onFiltersChange({ query: "test" });
      });

      // Assert: Should have active filters
      expect(result.current.hasActiveFilters).toBe(true);
    });
  });

  describe("Non-URL-synced mode", () => {
    it("should use local state when enableUrlSync is false", () => {
      // Arrange: Disable URL sync
      const { result } = renderHook(
        () => useMovieCollectionState({ enableUrlSync: false }),
        { wrapper }
      );

      // Act: Change filters
      act(() => {
        result.current.onFiltersChange({ query: "test" });
      });

      // Assert: Filters should update (local state, not URL)
      expect(result.current.filters.query).toBe("test");
    });

    it("should auto-expand when defaultFilters contain advanced filters", async () => {
      // Arrange: Provide default filters with rating (advanced)
      const { result } = renderHook(
        () =>
          useMovieCollectionState({
            enableUrlSync: false,
            defaultFilters: { minRating: "7.0", maxRating: "10.0" },
          }),
        { wrapper }
      );

      // Assert: Should auto-expand because defaultFilters become active filters in non-URL mode
      await waitFor(() => {
        expect(result.current.showAdvanced).toBe(true);
      });
    });
  });

  describe("Language filter", () => {
    it("should default language to empty string (all languages)", () => {
      const { result } = renderHook(
        () => useMovieCollectionState({ enableUrlSync: false }),
        { wrapper }
      );

      expect(result.current.filters.language).toBe("");
    });

    it("should update language when onFiltersChange called", () => {
      const { result } = renderHook(
        () => useMovieCollectionState({ enableUrlSync: false }),
        { wrapper }
      );

      act(() => {
        result.current.onFiltersChange({ language: "en" });
      });

      expect(result.current.filters.language).toBe("en");
    });

    it("should include language in filterCount when set", () => {
      const { result } = renderHook(
        () => useMovieCollectionState({ enableUrlSync: false }),
        { wrapper }
      );

      act(() => {
        result.current.onFiltersChange({ language: "es" });
      });

      expect(result.current.filterCount).toBe(1);
    });

    it("should NOT include language in filterCount when empty", () => {
      const { result } = renderHook(
        () => useMovieCollectionState({ enableUrlSync: false }),
        { wrapper }
      );

      // Default state - language is ""
      expect(result.current.filterCount).toBe(0);
    });

    it("should persist language from URL", async () => {
      // Arrange: Mock URL hook to return language filter
      mockUseMovieCollectionUrl.mockReturnValue({
        unifiedFilters: {
          query: "",
          genres: [],
          minYear: "",
          maxYear: "",
          minRating: "",
          maxRating: "",
          minRuntime: "",
          maxRuntime: "",
          sortBy: "popularity.desc",
          language: "fr",
        },
        handleUnifiedFiltersChange: vi.fn(),
        currentPageFromUrl: 1,
        handlePageChange: vi.fn(),
      });

      const { result } = renderHook(() => useMovieCollectionState(), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.filters.language).toBe("fr");
      });
    });
  });

  describe("Sort auto-reset when language changes", () => {
    it("should reset title sort to default when language changes to non-Latin", () => {
      const mockHandleFiltersChange = vi.fn();
      mockUseMovieCollectionUrl.mockReturnValue({
        unifiedFilters: {
          query: "",
          genres: [],
          minYear: "",
          maxYear: "",
          minRating: "",
          maxRating: "",
          minRuntime: "",
          maxRuntime: "",
          sortBy: "original_title.asc",
          language: "en",
        },
        handleUnifiedFiltersChange: mockHandleFiltersChange,
        currentPageFromUrl: 1,
        handlePageChange: vi.fn(),
      });

      const { rerender } = renderHook(() => useMovieCollectionState(), {
        wrapper,
      });

      // Simulate language change to non-Latin (Japanese)
      mockUseMovieCollectionUrl.mockReturnValue({
        unifiedFilters: {
          query: "",
          genres: [],
          minYear: "",
          maxYear: "",
          minRating: "",
          maxRating: "",
          minRuntime: "",
          maxRuntime: "",
          sortBy: "original_title.asc", // Still title sort
          language: "ja", // Changed to Japanese
        },
        handleUnifiedFiltersChange: mockHandleFiltersChange,
        currentPageFromUrl: 1,
        handlePageChange: vi.fn(),
      });

      rerender();

      // Should have auto-reset sort to default
      expect(mockHandleFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: "popularity.desc" })
      );
    });

    it("should NOT reset sort when language changes to another Latin language", () => {
      const mockHandleFiltersChange = vi.fn();
      mockUseMovieCollectionUrl.mockReturnValue({
        unifiedFilters: {
          query: "",
          genres: [],
          minYear: "",
          maxYear: "",
          minRating: "",
          maxRating: "",
          minRuntime: "",
          maxRuntime: "",
          sortBy: "original_title.asc",
          language: "en",
        },
        handleUnifiedFiltersChange: mockHandleFiltersChange,
        currentPageFromUrl: 1,
        handlePageChange: vi.fn(),
      });

      const { rerender } = renderHook(() => useMovieCollectionState(), {
        wrapper,
      });

      // Clear any initial calls
      mockHandleFiltersChange.mockClear();

      // Simulate language change to another Latin language (French)
      mockUseMovieCollectionUrl.mockReturnValue({
        unifiedFilters: {
          query: "",
          genres: [],
          minYear: "",
          maxYear: "",
          minRating: "",
          maxRating: "",
          minRuntime: "",
          maxRuntime: "",
          sortBy: "original_title.asc",
          language: "fr", // Changed to French (still Latin)
        },
        handleUnifiedFiltersChange: mockHandleFiltersChange,
        currentPageFromUrl: 1,
        handlePageChange: vi.fn(),
      });

      rerender();

      // Should NOT have reset sort - both are Latin languages
      expect(mockHandleFiltersChange).not.toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: "popularity.desc" })
      );
    });

    it("should reset title sort when language changes to All Languages", () => {
      const mockHandleFiltersChange = vi.fn();
      mockUseMovieCollectionUrl.mockReturnValue({
        unifiedFilters: {
          query: "",
          genres: [],
          minYear: "",
          maxYear: "",
          minRating: "",
          maxRating: "",
          minRuntime: "",
          maxRuntime: "",
          sortBy: "original_title.asc",
          language: "en",
        },
        handleUnifiedFiltersChange: mockHandleFiltersChange,
        currentPageFromUrl: 1,
        handlePageChange: vi.fn(),
      });

      const { rerender } = renderHook(() => useMovieCollectionState(), {
        wrapper,
      });

      // Simulate language change to "All Languages" (empty string)
      mockUseMovieCollectionUrl.mockReturnValue({
        unifiedFilters: {
          query: "",
          genres: [],
          minYear: "",
          maxYear: "",
          minRating: "",
          maxRating: "",
          minRuntime: "",
          maxRuntime: "",
          sortBy: "original_title.asc",
          language: "", // Changed to All Languages
        },
        handleUnifiedFiltersChange: mockHandleFiltersChange,
        currentPageFromUrl: 1,
        handlePageChange: vi.fn(),
      });

      rerender();

      // Should have auto-reset sort to default
      expect(mockHandleFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: "popularity.desc" })
      );
    });

    it("should NOT reset non-title sorts when language changes", () => {
      const mockHandleFiltersChange = vi.fn();
      mockUseMovieCollectionUrl.mockReturnValue({
        unifiedFilters: {
          query: "",
          genres: [],
          minYear: "",
          maxYear: "",
          minRating: "",
          maxRating: "",
          minRuntime: "",
          maxRuntime: "",
          sortBy: "vote_average.desc", // Not a title sort
          language: "en",
        },
        handleUnifiedFiltersChange: mockHandleFiltersChange,
        currentPageFromUrl: 1,
        handlePageChange: vi.fn(),
      });

      const { rerender } = renderHook(() => useMovieCollectionState(), {
        wrapper,
      });

      // Clear any initial calls
      mockHandleFiltersChange.mockClear();

      // Simulate language change to non-Latin
      mockUseMovieCollectionUrl.mockReturnValue({
        unifiedFilters: {
          query: "",
          genres: [],
          minYear: "",
          maxYear: "",
          minRating: "",
          maxRating: "",
          minRuntime: "",
          maxRuntime: "",
          sortBy: "vote_average.desc",
          language: "ja",
        },
        handleUnifiedFiltersChange: mockHandleFiltersChange,
        currentPageFromUrl: 1,
        handlePageChange: vi.fn(),
      });

      rerender();

      // Should NOT reset - vote_average.desc is valid for all languages
      expect(mockHandleFiltersChange).not.toHaveBeenCalled();
    });
  });
});
