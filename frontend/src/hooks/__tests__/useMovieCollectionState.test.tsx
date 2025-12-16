import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useMovieCollectionState } from "@/hooks/useMovieCollectionState";
import { BrowserRouter } from "react-router-dom";
import { type ReactNode } from "react";
import { createMockBrowseParams } from "@tests/mocks/browseParams";

// Import the actual module to get the mock
import { useMovieCollectionUrl } from "@/hooks/useMovieCollectionUrl";

// Mock the useMovieCollectionUrl hook
vi.mock("@/hooks/useMovieCollectionUrl");

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

    // Clear sessionStorage to prevent test pollution
    sessionStorage.clear();

    // Reset mock to default behavior
    mockUseMovieCollectionUrl.mockReturnValue({
      browseParams: createMockBrowseParams(),
      handleBrowseParamsChange: vi.fn(),
      currentPageFromUrl: 1,
      tmdbPageStartFromUrl: undefined,
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
        browseParams: createMockBrowseParams({ minRating: "1.0", maxRating: "3.5" }),
        handleBrowseParamsChange: vi.fn(),
        currentPageFromUrl: 1,
        tmdbPageStartFromUrl: undefined,
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
        browseParams: createMockBrowseParams({ minYear: "2000", maxYear: "2010" }),
        handleBrowseParamsChange: vi.fn(),
        currentPageFromUrl: 1,
        tmdbPageStartFromUrl: undefined,
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
        browseParams: createMockBrowseParams({ minYear: "2020", maxYear: "2020" }),
        handleBrowseParamsChange: vi.fn(),
        currentPageFromUrl: 1,
        tmdbPageStartFromUrl: undefined,
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

    it("should initialize isAdvancedPanelOpen to true when language filter is in URL", async () => {
      // Arrange: Mock URL parsing to return language filter (advanced-only)
      mockUseMovieCollectionUrl.mockReturnValue({
        browseParams: {
          query: "",
          genres: [],
          minYear: "",
          maxYear: "",
          minRating: "",
          maxRating: "",
          sortBy: "popularity.desc",
          language: "en",
          certifications: [],
        },
        handleBrowseParamsChange: vi.fn(),
        currentPageFromUrl: 1,
        tmdbPageStartFromUrl: undefined,
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
        browseParams: createMockBrowseParams({ minRating: "1.0", maxRating: "3.5" }),
        handleBrowseParamsChange: vi.fn(),
        currentPageFromUrl: 1,
        tmdbPageStartFromUrl: undefined,
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

  describe("Derived state - hasActiveAdvancedFilters", () => {
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
      expect(result.current.hasActiveAdvancedFilters).toBe(true);
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
      expect(result.current.hasActiveAdvancedFilters).toBe(true);
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
      expect(result.current.hasActiveAdvancedFilters).toBe(false);
    });

    it("should NOT detect decade preset as advanced", () => {
      // Arrange: Use non-URL-synced mode for filter update testing
      // Decade presets (1990's, 2020's) are available in QuickBrowseBar, so not advanced
      const { result } = renderHook(
        () => useMovieCollectionState({ enableUrlSync: false }),
        { wrapper }
      );

      // Act: Add decade preset (e.g., "1990's" → minYear: 1990, maxYear: 1999)
      act(() => {
        result.current.onBrowseParamsChange({
          minYear: "1990",
          maxYear: "1999",
        });
      });

      // Assert: Decade range should NOT be detected as advanced
      expect(result.current.hasActiveAdvancedFilters).toBe(false);
    });

    it("should NOT detect single core genre as advanced", () => {
      // Arrange: Use non-URL-synced mode for filter update testing
      // Single core genres are available in QuickBrowseBar dropdown, so not advanced
      // Core genres: Action, Comedy, Documentary, Drama, Family, Horror, Sci-Fi, Thriller
      const { result } = renderHook(
        () => useMovieCollectionState({ enableUrlSync: false }),
        { wrapper }
      );

      // Act: Add single core genre (Action = 28)
      act(() => {
        result.current.onBrowseParamsChange({
          genres: [28], // Action - a core genre
        });
      });

      // Assert: Single core genre should NOT be advanced
      expect(result.current.hasActiveAdvancedFilters).toBe(false);
    });

    it("should detect multiple genres as advanced", () => {
      // Arrange: Use non-URL-synced mode for filter update testing
      // Multiple genres require advanced panel's multi-select
      const { result } = renderHook(
        () => useMovieCollectionState({ enableUrlSync: false }),
        { wrapper }
      );

      // Act: Add multiple genres
      act(() => {
        result.current.onBrowseParamsChange({
          genres: [28, 12], // Action + Adventure
        });
      });

      // Assert: Multiple genres should be advanced
      expect(result.current.hasActiveAdvancedFilters).toBe(true);
    });

    it("should detect non-core genre as advanced", () => {
      // Arrange: Use non-URL-synced mode for filter update testing
      // Non-core genres are only available in advanced panel
      const { result } = renderHook(
        () => useMovieCollectionState({ enableUrlSync: false }),
        { wrapper }
      );

      // Act: Add non-core genre (Adventure = 12, not in core genre list)
      act(() => {
        result.current.onBrowseParamsChange({
          genres: [12], // Adventure - not a core genre
        });
      });

      // Assert: Non-core genre should be advanced
      expect(result.current.hasActiveAdvancedFilters).toBe(true);
    });
  });

  describe("Reset browse params action", () => {
    it("should reset filters, preserve sort, and collapse advanced panel when resetBrowseParams called", async () => {
      // Arrange: Mock URL parsing to return rating filters + non-default sort
      const mockHandleBrowseParamsChange = vi.fn();
      mockUseMovieCollectionUrl.mockReturnValue({
        browseParams: createMockBrowseParams({
          genres: [28],
          minRating: "1.0",
          maxRating: "3.5",
          sortBy: "vote_average.desc", // Non-default sort
          language: "en",
        }),
        handleBrowseParamsChange: mockHandleBrowseParamsChange,
        currentPageFromUrl: 1,
        tmdbPageStartFromUrl: undefined,
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

      // Assert: Sort should be PRESERVED, filters should be reset
      expect(mockHandleBrowseParamsChange).toHaveBeenCalledWith({
        query: "",
        genres: [],
        minYear: "",
        maxYear: "",
        minRating: "",
        maxRating: "",
        sortBy: "vote_average.desc", // Sort preserved!
        language: "",
          certifications: [],
      });
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

    it("should detect hasActiveFilters correctly (excludes sort)", () => {
      // Arrange: Use non-URL-synced mode to test local state management
      const { result } = renderHook(
        () => useMovieCollectionState({ enableUrlSync: false }),
        { wrapper }
      );

      // Initial state: no active filters
      expect(result.current.hasActiveFilters).toBe(false);

      // Act: Change only sort (NOT a filter)
      act(() => {
        result.current.onBrowseParamsChange({ sortBy: "vote_average.desc" });
      });

      // Assert: hasActiveFilters should still be false (sort excluded)
      expect(result.current.hasActiveFilters).toBe(false);
      // But hasActiveBrowseParams should include sort
      expect(result.current.hasActiveBrowseParams).toBe(true);

      // Act: Add an actual filter
      act(() => {
        result.current.onBrowseParamsChange({ genres: [28] });
      });

      // Assert: hasActiveFilters should now be true
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
        browseParams: createMockBrowseParams({ language: "fr" }),
        handleBrowseParamsChange: vi.fn(),
        currentPageFromUrl: 1,
        tmdbPageStartFromUrl: undefined,
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

  describe("User override for auto-expand", () => {
    it("should skip auto-expand on remount when user manually closed panel with filters active", async () => {
      // Arrange: Start with advanced filters (should auto-expand)
      mockUseMovieCollectionUrl.mockReturnValue({
        browseParams: createMockBrowseParams({ minRating: "7.0", maxRating: "10.0" }),
        handleBrowseParamsChange: vi.fn(),
        currentPageFromUrl: 1,
        tmdbPageStartFromUrl: undefined,
        handlePageChange: vi.fn(),
      });

      const { result: result1, unmount } = renderHook(() => useMovieCollectionState(), {
        wrapper,
      });

      // Wait for auto-expand
      await waitFor(() => {
        expect(result1.current.isAdvancedPanelOpen).toBe(true);
      });

      // Act: User manually closes the panel
      act(() => {
        result1.current.toggleAdvancedPanel();
      });

      // Assert: Panel should be closed
      expect(result1.current.isAdvancedPanelOpen).toBe(false);

      // Unmount (simulating navigation away)
      unmount();

      // Remount with SAME filters (simulating back navigation)
      // Current behavior: auto-expand fires again, ignoring user preference
      // Desired behavior: should respect user's close action
      const { result: result2 } = renderHook(() => useMovieCollectionState(), {
        wrapper,
      });

      // THIS TEST SHOULD FAIL until we implement user override tracking
      // Currently the panel will auto-expand again on remount
      await waitFor(() => {
        expect(result2.current.isAdvancedPanelOpen).toBe(false);
      });
    });

    it("should reset user override when filter values change", async () => {
      // Arrange: Start with rating filters
      const mockHandleBrowseParamsChange = vi.fn();
      mockUseMovieCollectionUrl.mockReturnValue({
        browseParams: createMockBrowseParams({ minRating: "7.0", maxRating: "10.0" }),
        handleBrowseParamsChange: mockHandleBrowseParamsChange,
        currentPageFromUrl: 1,
        tmdbPageStartFromUrl: undefined,
        handlePageChange: vi.fn(),
      });

      const { result, rerender } = renderHook(() => useMovieCollectionState(), {
        wrapper,
      });

      // Wait for auto-expand
      await waitFor(() => {
        expect(result.current.isAdvancedPanelOpen).toBe(true);
      });

      // User manually closes
      act(() => {
        result.current.toggleAdvancedPanel();
      });
      expect(result.current.isAdvancedPanelOpen).toBe(false);

      // Now filters change (user applies new filter)
      mockUseMovieCollectionUrl.mockReturnValue({
        browseParams: createMockBrowseParams({ minRating: "5.0", maxRating: "8.0" }),
        handleBrowseParamsChange: mockHandleBrowseParamsChange,
        currentPageFromUrl: 1,
        tmdbPageStartFromUrl: undefined,
        handlePageChange: vi.fn(),
      });

      rerender();

      // Should auto-expand again because filters changed (override reset)
      await waitFor(() => {
        expect(result.current.isAdvancedPanelOpen).toBe(true);
      });
    });

    it("should NOT set override when panel is closed on initial mount (no filters)", () => {
      // Arrange: No advanced filters
      mockUseMovieCollectionUrl.mockReturnValue({
        browseParams: createMockBrowseParams(),
        handleBrowseParamsChange: vi.fn(),
        currentPageFromUrl: 1,
        tmdbPageStartFromUrl: undefined,
        handlePageChange: vi.fn(),
      });

      const { result } = renderHook(() => useMovieCollectionState(), {
        wrapper,
      });

      // Panel should be closed (no filters)
      expect(result.current.isAdvancedPanelOpen).toBe(false);

      // User opens panel manually
      act(() => {
        result.current.toggleAdvancedPanel();
      });
      expect(result.current.isAdvancedPanelOpen).toBe(true);

      // User closes panel - this is NOT an override situation (no advanced filters)
      act(() => {
        result.current.toggleAdvancedPanel();
      });
      expect(result.current.isAdvancedPanelOpen).toBe(false);

      // If filters are later added, should auto-expand (no override active)
    });

    it("should only set override when closing panel while advanced filters are active", async () => {
      // Arrange: Start with advanced filters
      const mockHandleBrowseParamsChange = vi.fn();
      mockUseMovieCollectionUrl.mockReturnValue({
        browseParams: createMockBrowseParams({ minRating: "7.0" }),
        handleBrowseParamsChange: mockHandleBrowseParamsChange,
        currentPageFromUrl: 1,
        tmdbPageStartFromUrl: undefined,
        handlePageChange: vi.fn(),
      });

      const { result, rerender } = renderHook(() => useMovieCollectionState(), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isAdvancedPanelOpen).toBe(true);
      });

      // User closes panel while filters active - sets override
      act(() => {
        result.current.toggleAdvancedPanel();
      });
      expect(result.current.isAdvancedPanelOpen).toBe(false);

      // Simulate remount with same filters - should stay closed (override active)
      rerender();

      await waitFor(() => {
        expect(result.current.isAdvancedPanelOpen).toBe(false);
      });
    });

    it("should respect user override with multiple genres (advanced filter)", async () => {
      // Multiple genres = advanced filter (only single core genre is "minimal")
      // Action (28) + Comedy (35) = advanced
      mockUseMovieCollectionUrl.mockReturnValue({
        browseParams: createMockBrowseParams({ genres: [28, 35] }),
        handleBrowseParamsChange: vi.fn(),
        currentPageFromUrl: 1,
        tmdbPageStartFromUrl: undefined,
        handlePageChange: vi.fn(),
      });

      const { result: result1, unmount } = renderHook(() => useMovieCollectionState(), {
        wrapper,
      });

      // Wait for auto-expand (multiple genres = advanced)
      await waitFor(() => {
        expect(result1.current.isAdvancedPanelOpen).toBe(true);
      });

      // User manually closes the panel
      act(() => {
        result1.current.toggleAdvancedPanel();
      });
      expect(result1.current.isAdvancedPanelOpen).toBe(false);

      // Unmount and remount with same filters (simulating navigation)
      unmount();

      const { result: result2 } = renderHook(() => useMovieCollectionState(), {
        wrapper,
      });

      // Should stay closed - user override should be respected
      await waitFor(() => {
        expect(result2.current.isAdvancedPanelOpen).toBe(false);
      });
    });

    it("should respect user override with non-core genre (advanced filter)", async () => {
      // Romance (10749) is not in CORE_GENRE_IDS, so it's advanced
      mockUseMovieCollectionUrl.mockReturnValue({
        browseParams: createMockBrowseParams({ genres: [10749] }),
        handleBrowseParamsChange: vi.fn(),
        currentPageFromUrl: 1,
        tmdbPageStartFromUrl: undefined,
        handlePageChange: vi.fn(),
      });

      const { result: result1, unmount } = renderHook(() => useMovieCollectionState(), {
        wrapper,
      });

      // Wait for auto-expand (non-core genre = advanced)
      await waitFor(() => {
        expect(result1.current.isAdvancedPanelOpen).toBe(true);
      });

      // User manually closes the panel
      act(() => {
        result1.current.toggleAdvancedPanel();
      });
      expect(result1.current.isAdvancedPanelOpen).toBe(false);

      // Unmount and remount with same filters
      unmount();

      const { result: result2 } = renderHook(() => useMovieCollectionState(), {
        wrapper,
      });

      // Should stay closed - user override should be respected
      await waitFor(() => {
        expect(result2.current.isAdvancedPanelOpen).toBe(false);
      });
    });

    it("should respect user override with certifications (advanced filter)", async () => {
      // Certifications are advanced-only
      mockUseMovieCollectionUrl.mockReturnValue({
        browseParams: createMockBrowseParams({ certifications: ["PG-13", "R"] }),
        handleBrowseParamsChange: vi.fn(),
        currentPageFromUrl: 1,
        tmdbPageStartFromUrl: undefined,
        handlePageChange: vi.fn(),
      });

      const { result: result1, unmount } = renderHook(() => useMovieCollectionState(), {
        wrapper,
      });

      // Wait for auto-expand (certifications = advanced)
      await waitFor(() => {
        expect(result1.current.isAdvancedPanelOpen).toBe(true);
      });

      // User manually closes the panel
      act(() => {
        result1.current.toggleAdvancedPanel();
      });
      expect(result1.current.isAdvancedPanelOpen).toBe(false);

      // Unmount and remount with same filters
      unmount();

      const { result: result2 } = renderHook(() => useMovieCollectionState(), {
        wrapper,
      });

      // Should stay closed - user override should be respected
      await waitFor(() => {
        expect(result2.current.isAdvancedPanelOpen).toBe(false);
      });
    });
  });

  describe("Sort auto-reset when language changes", () => {
    it("should reset title sort to default when language changes to non-Latin", () => {
      const mockHandleBrowseParamsChange = vi.fn();
      mockUseMovieCollectionUrl.mockReturnValue({
        browseParams: createMockBrowseParams({ sortBy: "original_title.asc", language: "en" }),
        handleBrowseParamsChange: mockHandleBrowseParamsChange,
        currentPageFromUrl: 1,
        tmdbPageStartFromUrl: undefined,
        handlePageChange: vi.fn(),
      });

      const { rerender } = renderHook(() => useMovieCollectionState(), {
        wrapper,
      });

      // Simulate language change to non-Latin (Japanese)
      mockUseMovieCollectionUrl.mockReturnValue({
        browseParams: createMockBrowseParams({ sortBy: "original_title.asc", language: "ja" }),
        handleBrowseParamsChange: mockHandleBrowseParamsChange,
        currentPageFromUrl: 1,
        tmdbPageStartFromUrl: undefined,
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
        browseParams: createMockBrowseParams({ sortBy: "original_title.asc", language: "en" }),
        handleBrowseParamsChange: mockHandleBrowseParamsChange,
        currentPageFromUrl: 1,
        tmdbPageStartFromUrl: undefined,
        handlePageChange: vi.fn(),
      });

      const { rerender } = renderHook(() => useMovieCollectionState(), {
        wrapper,
      });

      // Clear any initial calls
      mockHandleBrowseParamsChange.mockClear();

      // Simulate language change to another Latin language (French)
      mockUseMovieCollectionUrl.mockReturnValue({
        browseParams: createMockBrowseParams({ sortBy: "original_title.asc", language: "fr" }),
        handleBrowseParamsChange: mockHandleBrowseParamsChange,
        currentPageFromUrl: 1,
        tmdbPageStartFromUrl: undefined,
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
        browseParams: createMockBrowseParams({ sortBy: "original_title.asc", language: "en" }),
        handleBrowseParamsChange: mockHandleBrowseParamsChange,
        currentPageFromUrl: 1,
        tmdbPageStartFromUrl: undefined,
        handlePageChange: vi.fn(),
      });

      const { rerender } = renderHook(() => useMovieCollectionState(), {
        wrapper,
      });

      // Simulate language change to "All Languages" (empty string)
      mockUseMovieCollectionUrl.mockReturnValue({
        browseParams: createMockBrowseParams({ sortBy: "original_title.asc" }),
        handleBrowseParamsChange: mockHandleBrowseParamsChange,
        currentPageFromUrl: 1,
        tmdbPageStartFromUrl: undefined,
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
        browseParams: createMockBrowseParams({ sortBy: "vote_average.desc", language: "en" }),
        handleBrowseParamsChange: mockHandleBrowseParamsChange,
        currentPageFromUrl: 1,
        tmdbPageStartFromUrl: undefined,
        handlePageChange: vi.fn(),
      });

      const { rerender } = renderHook(() => useMovieCollectionState(), {
        wrapper,
      });

      // Clear any initial calls
      mockHandleBrowseParamsChange.mockClear();

      // Simulate language change to non-Latin
      mockUseMovieCollectionUrl.mockReturnValue({
        browseParams: createMockBrowseParams({ sortBy: "vote_average.desc", language: "ja" }),
        handleBrowseParamsChange: mockHandleBrowseParamsChange,
        currentPageFromUrl: 1,
        tmdbPageStartFromUrl: undefined,
        handlePageChange: vi.fn(),
      });

      rerender();

      // Should NOT reset - vote_average.desc is valid for all languages
      expect(mockHandleBrowseParamsChange).not.toHaveBeenCalled();
    });
  });
});
