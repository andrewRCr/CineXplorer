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
      browseParams: {
        query: "",
        genres: [],
        minYear: "",
        maxYear: "",
        minRating: "",
        maxRating: "",
        sortBy: "popularity.desc",
        language: "",
      },
      handleBrowseParamsChange: vi.fn(),
      currentPageFromUrl: 1,
      handlePageChange: vi.fn(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Smart initialization - isAdvancedPanelOpen from URL", () => {
    it("should initialize isAdvancedPanelOpen to true when rating filters are in URL", async () => {
      // Arrange: Mock URL parsing to return rating filters
      mockUseMovieCollectionUrl.mockReturnValue({
        browseParams: {
          query: "",
          genres: [],
          minYear: "",
          maxYear: "",
          minRating: "1.0",
          maxRating: "3.5",
          sortBy: "popularity.desc",
          language: "",
        },
        handleBrowseParamsChange: vi.fn(),
        currentPageFromUrl: 1,
        handlePageChange: vi.fn(),
      });

      // Act: Render hook
      const { result } = renderHook(() => useMovieCollectionState(), {
        wrapper,
      });

      // Assert: Advanced panel should be expanded (after effect runs)
      await waitFor(() => {
        expect(result.current.isAdvancedPanelOpen).toBe(true);
      });
    });

    it("should initialize isAdvancedPanelOpen to true when custom year range is in URL", async () => {
      // Arrange: Mock URL parsing to return custom year range
      mockUseMovieCollectionUrl.mockReturnValue({
        browseParams: {
          query: "",
          genres: [],
          minYear: "2000",
          maxYear: "2010",
          minRating: "",
          maxRating: "",
          sortBy: "popularity.desc",
          language: "",
        },
        handleBrowseParamsChange: vi.fn(),
        currentPageFromUrl: 1,
        handlePageChange: vi.fn(),
      });

      // Act: Render hook
      const { result } = renderHook(() => useMovieCollectionState(), {
        wrapper,
      });

      // Assert: Advanced panel should be expanded (after effect runs)
      await waitFor(() => {
        expect(result.current.isAdvancedPanelOpen).toBe(true);
      });
    });

    it("should initialize isAdvancedPanelOpen to false when single year is in URL", async () => {
      // Arrange: Mock URL parsing to return single year (not a range)
      mockUseMovieCollectionUrl.mockReturnValue({
        browseParams: {
          query: "",
          genres: [],
          minYear: "2020",
          maxYear: "2020",
          minRating: "",
          maxRating: "",
          sortBy: "popularity.desc",
          language: "",
        },
        handleBrowseParamsChange: vi.fn(),
        currentPageFromUrl: 1,
        handlePageChange: vi.fn(),
      });

      // Act: Render hook
      const { result } = renderHook(() => useMovieCollectionState(), {
        wrapper,
      });

      // Assert: Advanced panel should NOT be expanded (single year is compact)
      // Give effect a chance to run (though it shouldn't change anything)
      await waitFor(() => {
        expect(result.current.isAdvancedPanelOpen).toBe(false);
      });
    });

    it("should initialize isAdvancedPanelOpen to false when only genres are in URL", () => {
      // Arrange: Set URL with only genres (compact filter)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).location = new URL("http://localhost:3000?genres=28,12");

      // Act: Render hook
      const { result } = renderHook(() => useMovieCollectionState(), {
        wrapper,
      });

      // Assert: Advanced panel should NOT be expanded
      expect(result.current.isAdvancedPanelOpen).toBe(false);
    });

    it("should initialize isAdvancedPanelOpen to false when URL has no filters", () => {
      // Arrange: Set URL with no filters
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).location = new URL("http://localhost:3000");

      // Act: Render hook
      const { result } = renderHook(() => useMovieCollectionState(), {
        wrapper,
      });

      // Assert: Advanced panel should NOT be expanded
      expect(result.current.isAdvancedPanelOpen).toBe(false);
    });

    it("should preserve isAdvancedPanelOpen state across remounts with same URL", async () => {
      // Arrange: Mock URL parsing to return rating filters
      mockUseMovieCollectionUrl.mockReturnValue({
        browseParams: {
          query: "",
          genres: [],
          minYear: "",
          maxYear: "",
          minRating: "1.0",
          maxRating: "3.5",
          sortBy: "popularity.desc",
          language: "",
        },
        handleBrowseParamsChange: vi.fn(),
        currentPageFromUrl: 1,
        handlePageChange: vi.fn(),
      });

      // Act: First render
      const { result: result1, unmount } = renderHook(
        () => useMovieCollectionState(),
        { wrapper }
      );

      await waitFor(() => {
        expect(result1.current.isAdvancedPanelOpen).toBe(true);
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
        expect(result2.current.isAdvancedPanelOpen).toBe(true);
      });
    });
  });

  describe("Advanced panel toggle", () => {
    it("should toggle isAdvancedPanelOpen when toggleAdvancedPanel is called", () => {
      // Arrange
      const { result } = renderHook(() => useMovieCollectionState(), {
        wrapper,
      });
      expect(result.current.isAdvancedPanelOpen).toBe(false);

      // Act: Toggle to true
      act(() => {
        result.current.toggleAdvancedPanel();
      });

      // Assert
      expect(result.current.isAdvancedPanelOpen).toBe(true);

      // Act: Toggle back to false
      act(() => {
        result.current.toggleAdvancedPanel();
      });

      // Assert
      expect(result.current.isAdvancedPanelOpen).toBe(false);
    });

    it("should set isAdvancedPanelOpen directly with setIsAdvancedPanelOpen", () => {
      // Arrange
      const { result } = renderHook(() => useMovieCollectionState(), {
        wrapper,
      });

      // Act: Set to true
      act(() => {
        result.current.setIsAdvancedPanelOpen(true);
      });

      // Assert
      expect(result.current.isAdvancedPanelOpen).toBe(true);

      // Act: Set to false
      act(() => {
        result.current.setIsAdvancedPanelOpen(false);
      });

      // Assert
      expect(result.current.isAdvancedPanelOpen).toBe(false);
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
        result.current.onBrowseParamsChange({
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
        result.current.onBrowseParamsChange({
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
        result.current.onBrowseParamsChange({
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
        result.current.onBrowseParamsChange({
          genres: [28, 12], // Action, Adventure
        });
      });

      // Assert
      expect(result.current.hasAdvancedFilters).toBe(false);
    });
  });

  describe("Reset browse params action", () => {
    it("should reset params and collapse advanced panel when resetBrowseParams called", async () => {
      // Arrange: Mock URL parsing to return rating filters
      mockUseMovieCollectionUrl.mockReturnValue({
        browseParams: {
          query: "",
          genres: [],
          minYear: "",
          maxYear: "",
          minRating: "1.0",
          maxRating: "3.5",
          sortBy: "popularity.desc",
          language: "",
        },
        handleBrowseParamsChange: vi.fn(),
        currentPageFromUrl: 1,
        handlePageChange: vi.fn(),
      });

      const { result } = renderHook(() => useMovieCollectionState(), {
        wrapper,
      });

      // Wait for effect to expand panel based on filters
      await waitFor(() => {
        expect(result.current.isAdvancedPanelOpen).toBe(true);
      });

      // Act: Reset browse params
      act(() => {
        result.current.resetBrowseParams();
      });

      // Assert: Advanced panel should be collapsed
      expect(result.current.isAdvancedPanelOpen).toBe(false);
    });
  });

  describe("Browse params state management", () => {
    it("should update params when onBrowseParamsChange called with partial update", () => {
      // Arrange: Use non-URL-synced mode to test local state management
      const { result } = renderHook(
        () => useMovieCollectionState({ enableUrlSync: false }),
        { wrapper }
      );

      // Act: Update query param
      act(() => {
        result.current.onBrowseParamsChange({ query: "inception" });
      });

      // Assert: Query should be updated, other params unchanged
      expect(result.current.browseParams.query).toBe("inception");
      expect(result.current.browseParams.genres).toEqual([]);
      expect(result.current.hasActiveBrowseParams).toBe(true);
    });

    it("should calculate activeParamCount correctly", () => {
      // Arrange: Use non-URL-synced mode to test local state management
      const { result } = renderHook(
        () => useMovieCollectionState({ enableUrlSync: false }),
        { wrapper }
      );

      // Act: Add multiple params
      act(() => {
        result.current.onBrowseParamsChange({
          query: "test",
          genres: [28, 12],
          minRating: "7.0",
        });
      });

      // Assert: activeParamCount should include query (1) + genres (1) + rating (1) = 3
      // Note: countActiveParams counts genres as 1 group, not per-genre
      expect(result.current.activeParamCount).toBe(3);
    });

    it("should detect hasActiveBrowseParams correctly", () => {
      // Arrange: Use non-URL-synced mode to test local state management
      const { result } = renderHook(
        () => useMovieCollectionState({ enableUrlSync: false }),
        { wrapper }
      );

      // Initial state: no active params
      expect(result.current.hasActiveBrowseParams).toBe(false);

      // Act: Add param
      act(() => {
        result.current.onBrowseParamsChange({ query: "test" });
      });

      // Assert: Should have active params
      expect(result.current.hasActiveBrowseParams).toBe(true);
    });
  });

  describe("Non-URL-synced mode", () => {
    it("should use local state when enableUrlSync is false", () => {
      // Arrange: Disable URL sync
      const { result } = renderHook(
        () => useMovieCollectionState({ enableUrlSync: false }),
        { wrapper }
      );

      // Act: Change params
      act(() => {
        result.current.onBrowseParamsChange({ query: "test" });
      });

      // Assert: Params should update (local state, not URL)
      expect(result.current.browseParams.query).toBe("test");
    });

    it("should auto-expand when defaultBrowseParams contain advanced filters", async () => {
      // Arrange: Provide default params with rating (advanced)
      const { result } = renderHook(
        () =>
          useMovieCollectionState({
            enableUrlSync: false,
            defaultBrowseParams: { minRating: "7.0", maxRating: "10.0" },
          }),
        { wrapper }
      );

      // Assert: Should auto-expand because defaultBrowseParams become active params in non-URL mode
      await waitFor(() => {
        expect(result.current.isAdvancedPanelOpen).toBe(true);
      });
    });
  });

  describe("Language filter", () => {
    it("should default language to empty string (all languages)", () => {
      const { result } = renderHook(
        () => useMovieCollectionState({ enableUrlSync: false }),
        { wrapper }
      );

      expect(result.current.browseParams.language).toBe("");
    });

    it("should update language when onBrowseParamsChange called", () => {
      const { result } = renderHook(
        () => useMovieCollectionState({ enableUrlSync: false }),
        { wrapper }
      );

      act(() => {
        result.current.onBrowseParamsChange({ language: "en" });
      });

      expect(result.current.browseParams.language).toBe("en");
    });

    it("should include language in activeParamCount when set", () => {
      const { result } = renderHook(
        () => useMovieCollectionState({ enableUrlSync: false }),
        { wrapper }
      );

      act(() => {
        result.current.onBrowseParamsChange({ language: "es" });
      });

      expect(result.current.activeParamCount).toBe(1);
    });

    it("should NOT include language in activeParamCount when empty", () => {
      const { result } = renderHook(
        () => useMovieCollectionState({ enableUrlSync: false }),
        { wrapper }
      );

      // Default state - language is ""
      expect(result.current.activeParamCount).toBe(0);
    });

    it("should persist language from URL", async () => {
      // Arrange: Mock URL hook to return language filter
      mockUseMovieCollectionUrl.mockReturnValue({
        browseParams: {
          query: "",
          genres: [],
          minYear: "",
          maxYear: "",
          minRating: "",
          maxRating: "",
          sortBy: "popularity.desc",
          language: "fr",
        },
        handleBrowseParamsChange: vi.fn(),
        currentPageFromUrl: 1,
        handlePageChange: vi.fn(),
      });

      const { result } = renderHook(() => useMovieCollectionState(), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.browseParams.language).toBe("fr");
      });
    });
  });

  describe("Sort auto-reset when language changes", () => {
    it("should reset title sort to default when language changes to non-Latin", () => {
      const mockHandleBrowseParamsChange = vi.fn();
      mockUseMovieCollectionUrl.mockReturnValue({
        browseParams: {
          query: "",
          genres: [],
          minYear: "",
          maxYear: "",
          minRating: "",
          maxRating: "",
          sortBy: "original_title.asc",
          language: "en",
        },
        handleBrowseParamsChange: mockHandleBrowseParamsChange,
        currentPageFromUrl: 1,
        handlePageChange: vi.fn(),
      });

      const { rerender } = renderHook(() => useMovieCollectionState(), {
        wrapper,
      });

      // Simulate language change to non-Latin (Japanese)
      mockUseMovieCollectionUrl.mockReturnValue({
        browseParams: {
          query: "",
          genres: [],
          minYear: "",
          maxYear: "",
          minRating: "",
          maxRating: "",
          sortBy: "original_title.asc", // Still title sort
          language: "ja", // Changed to Japanese
        },
        handleBrowseParamsChange: mockHandleBrowseParamsChange,
        currentPageFromUrl: 1,
        handlePageChange: vi.fn(),
      });

      rerender();

      // Should have auto-reset sort to default
      expect(mockHandleBrowseParamsChange).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: "popularity.desc" })
      );
    });

    it("should NOT reset sort when language changes to another Latin language", () => {
      const mockHandleBrowseParamsChange = vi.fn();
      mockUseMovieCollectionUrl.mockReturnValue({
        browseParams: {
          query: "",
          genres: [],
          minYear: "",
          maxYear: "",
          minRating: "",
          maxRating: "",
          sortBy: "original_title.asc",
          language: "en",
        },
        handleBrowseParamsChange: mockHandleBrowseParamsChange,
        currentPageFromUrl: 1,
        handlePageChange: vi.fn(),
      });

      const { rerender } = renderHook(() => useMovieCollectionState(), {
        wrapper,
      });

      // Clear any initial calls
      mockHandleBrowseParamsChange.mockClear();

      // Simulate language change to another Latin language (French)
      mockUseMovieCollectionUrl.mockReturnValue({
        browseParams: {
          query: "",
          genres: [],
          minYear: "",
          maxYear: "",
          minRating: "",
          maxRating: "",
          sortBy: "original_title.asc",
          language: "fr", // Changed to French (still Latin)
        },
        handleBrowseParamsChange: mockHandleBrowseParamsChange,
        currentPageFromUrl: 1,
        handlePageChange: vi.fn(),
      });

      rerender();

      // Should NOT have reset sort - both are Latin languages
      expect(mockHandleBrowseParamsChange).not.toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: "popularity.desc" })
      );
    });

    it("should reset title sort when language changes to All Languages", () => {
      const mockHandleBrowseParamsChange = vi.fn();
      mockUseMovieCollectionUrl.mockReturnValue({
        browseParams: {
          query: "",
          genres: [],
          minYear: "",
          maxYear: "",
          minRating: "",
          maxRating: "",
          sortBy: "original_title.asc",
          language: "en",
        },
        handleBrowseParamsChange: mockHandleBrowseParamsChange,
        currentPageFromUrl: 1,
        handlePageChange: vi.fn(),
      });

      const { rerender } = renderHook(() => useMovieCollectionState(), {
        wrapper,
      });

      // Simulate language change to "All Languages" (empty string)
      mockUseMovieCollectionUrl.mockReturnValue({
        browseParams: {
          query: "",
          genres: [],
          minYear: "",
          maxYear: "",
          minRating: "",
          maxRating: "",
          sortBy: "original_title.asc",
          language: "", // Changed to All Languages
        },
        handleBrowseParamsChange: mockHandleBrowseParamsChange,
        currentPageFromUrl: 1,
        handlePageChange: vi.fn(),
      });

      rerender();

      // Should have auto-reset sort to default
      expect(mockHandleBrowseParamsChange).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: "popularity.desc" })
      );
    });

    it("should NOT reset non-title sorts when language changes", () => {
      const mockHandleBrowseParamsChange = vi.fn();
      mockUseMovieCollectionUrl.mockReturnValue({
        browseParams: {
          query: "",
          genres: [],
          minYear: "",
          maxYear: "",
          minRating: "",
          maxRating: "",
          sortBy: "vote_average.desc", // Not a title sort
          language: "en",
        },
        handleBrowseParamsChange: mockHandleBrowseParamsChange,
        currentPageFromUrl: 1,
        handlePageChange: vi.fn(),
      });

      const { rerender } = renderHook(() => useMovieCollectionState(), {
        wrapper,
      });

      // Clear any initial calls
      mockHandleBrowseParamsChange.mockClear();

      // Simulate language change to non-Latin
      mockUseMovieCollectionUrl.mockReturnValue({
        browseParams: {
          query: "",
          genres: [],
          minYear: "",
          maxYear: "",
          minRating: "",
          maxRating: "",
          sortBy: "vote_average.desc",
          language: "ja",
        },
        handleBrowseParamsChange: mockHandleBrowseParamsChange,
        currentPageFromUrl: 1,
        handlePageChange: vi.fn(),
      });

      rerender();

      // Should NOT reset - vote_average.desc is valid for all languages
      expect(mockHandleBrowseParamsChange).not.toHaveBeenCalled();
    });
  });
});
