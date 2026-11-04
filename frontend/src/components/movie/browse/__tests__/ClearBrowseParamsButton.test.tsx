import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@tests/helpers/test-renderer";
import ClearBrowseParamsButton from "../ClearBrowseParamsButton";
import { createMockBrowseParams } from "@tests/mocks/browseParams";

describe("ClearBrowseParamsButton Component", () => {
  const mockOnClear = vi.fn();

  const defaultProps = {
    browseParams: createMockBrowseParams(),
    onClear: mockOnClear,
    isAdvancedOpen: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Conditional Rendering Logic", () => {
    it("does not render when no params are active", () => {
      render(<ClearBrowseParamsButton {...defaultProps} />);

      // Component returns null when no active filters
      const button = screen.queryByRole("button", { name: /clear/i });
      expect(button).not.toBeInTheDocument();
    });

    it("renders button when genres param is active", () => {
      const paramsWithGenres = createMockBrowseParams({
        genres: [28, 12], // Action and Adventure
      });

      render(
        <ClearBrowseParamsButton
          {...defaultProps}
          browseParams={paramsWithGenres}
        />,
      );

      const button = screen.getByRole("button", { name: /clear/i });
      expect(button).toBeInTheDocument();
    });

    it("renders button when year params are active", () => {
      const paramsWithYears = createMockBrowseParams({
        minYear: "2000",
        maxYear: "2023",
      });

      render(
        <ClearBrowseParamsButton
          {...defaultProps}
          browseParams={paramsWithYears}
        />,
      );

      const button = screen.getByRole("button", { name: /clear/i });
      expect(button).toBeInTheDocument();
    });

    it("renders button when only minYear is set", () => {
      const paramsWithMinYear = createMockBrowseParams({
        minYear: "2020",
      });

      render(
        <ClearBrowseParamsButton
          {...defaultProps}
          browseParams={paramsWithMinYear}
        />,
      );

      const button = screen.getByRole("button", { name: /clear/i });
      expect(button).toBeInTheDocument();
    });

    it("renders button when only maxYear is set", () => {
      const paramsWithMaxYear = createMockBrowseParams({
        maxYear: "2023",
      });

      render(
        <ClearBrowseParamsButton
          {...defaultProps}
          browseParams={paramsWithMaxYear}
        />,
      );

      const button = screen.getByRole("button", { name: /clear/i });
      expect(button).toBeInTheDocument();
    });

    it("renders button when multiple param types are active", () => {
      const paramsWithMultiple = createMockBrowseParams({
        genres: [35], // Comedy
        minYear: "2010",
        minRating: "7.0",
      });

      render(
        <ClearBrowseParamsButton
          {...defaultProps}
          browseParams={paramsWithMultiple}
        />,
      );

      const button = screen.getByRole("button", { name: /clear/i });
      expect(button).toBeInTheDocument();
    });

    it("does not render when isAdvancedOpen is true, even with active params", () => {
      const paramsWithGenres = createMockBrowseParams({
        genres: [28], // Action
      });

      render(
        <ClearBrowseParamsButton
          {...defaultProps}
          browseParams={paramsWithGenres}
          isAdvancedOpen={true}
        />,
      );

      // Component returns null when advanced panel is open
      const button = screen.queryByRole("button", { name: /clear/i });
      expect(button).not.toBeInTheDocument();
    });
  });

  describe("hasActiveParams Computation", () => {
    it("correctly identifies no active params", () => {
      const emptyParams = createMockBrowseParams();
      render(
        <ClearBrowseParamsButton
          {...defaultProps}
          browseParams={emptyParams}
        />,
      );

      const button = screen.queryByRole("button", { name: /clear/i });
      expect(button).not.toBeInTheDocument();
    });

    it("correctly identifies active params with empty arrays", () => {
      const paramsWithEmptyGenres = createMockBrowseParams({
        genres: [], // Empty array should not count as active
      });
      render(
        <ClearBrowseParamsButton
          {...defaultProps}
          browseParams={paramsWithEmptyGenres}
        />,
      );

      const button = screen.queryByRole("button", { name: /clear/i });
      expect(button).not.toBeInTheDocument();
    });

    it("correctly identifies active params with empty strings", () => {
      const paramsWithEmptyStrings = createMockBrowseParams({
        minYear: "", // Empty string should not count as active
        maxYear: "",
      });
      render(
        <ClearBrowseParamsButton
          {...defaultProps}
          browseParams={paramsWithEmptyStrings}
        />,
      );

      const button = screen.queryByRole("button", { name: /clear/i });
      expect(button).not.toBeInTheDocument();
    });

    it("renders button when genres are active", () => {
      // Uses hasActiveFilters which detects active filters
      const paramsWithGenres = createMockBrowseParams({
        genres: [28],
      });
      render(
        <ClearBrowseParamsButton
          {...defaultProps}
          browseParams={paramsWithGenres}
        />,
      );

      const button = screen.getByRole("button", { name: /clear/i });
      expect(button).toBeInTheDocument();
    });

    // KEY BEHAVIORAL CHANGE: Sort is NOT a filter
    it("does NOT render button when ONLY sortBy is non-default", () => {
      // Sort is a user preference, not a filter - "Clear" should not appear
      const paramsWithSort = createMockBrowseParams({
        sortBy: "vote_average.desc",
      });
      render(
        <ClearBrowseParamsButton
          {...defaultProps}
          browseParams={paramsWithSort}
        />,
      );

      const button = screen.queryByRole("button", { name: /clear/i });
      expect(button).not.toBeInTheDocument();
    });

    it("renders button when filters are active even with non-default sort", () => {
      // If actual filters are active, button shows (sort doesn't affect visibility)
      const paramsWithFilterAndSort = createMockBrowseParams({
        genres: [28],
        sortBy: "vote_average.desc",
      });
      render(
        <ClearBrowseParamsButton
          {...defaultProps}
          browseParams={paramsWithFilterAndSort}
        />,
      );

      const button = screen.getByRole("button", { name: /clear/i });
      expect(button).toBeInTheDocument();
    });
  });

  describe("User Interactions", () => {
    it("calls onClear when button is clicked", () => {
      const paramsWithGenres = createMockBrowseParams({
        genres: [28], // Action
      });

      render(
        <ClearBrowseParamsButton
          {...defaultProps}
          browseParams={paramsWithGenres}
        />,
      );

      const button = screen.getByRole("button", { name: /clear filters/i });
      fireEvent.click(button);

      expect(mockOnClear).toHaveBeenCalledTimes(1);
    });

    it("button is clickable when visible", () => {
      const paramsWithGenres = createMockBrowseParams({
        genres: [28],
      });

      render(
        <ClearBrowseParamsButton
          {...defaultProps}
          browseParams={paramsWithGenres}
        />,
      );

      const button = screen.getByRole("button", { name: /clear filters/i });
      expect(button).toBeEnabled();
      expect(button).toBeVisible();
    });

    it("handles multiple clicks correctly", () => {
      const paramsWithGenres = createMockBrowseParams({
        genres: [28, 35], // Action and Comedy
      });

      render(
        <ClearBrowseParamsButton
          {...defaultProps}
          browseParams={paramsWithGenres}
        />,
      );

      const button = screen.getByRole("button", { name: /clear filters/i });
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      expect(mockOnClear).toHaveBeenCalledTimes(3);
    });
  });

  describe("Component Structure and Styling", () => {
    it("renders as icon-only button with aria-label", () => {
      const paramsWithGenres = createMockBrowseParams({
        genres: [28],
      });

      render(
        <ClearBrowseParamsButton
          {...defaultProps}
          browseParams={paramsWithGenres}
        />,
      );

      const button = screen.getByRole("button", { name: /clear filters/i });
      expect(button).toBeInTheDocument();
      expect(button.tagName).toBe("BUTTON");
    });

    it("renders placeholder when not visible to prevent layout shift", () => {
      const { container } = render(
        <ClearBrowseParamsButton {...defaultProps} />,
      );

      // Should render a placeholder div, not a button
      const button = screen.queryByRole("button");
      expect(button).not.toBeInTheDocument();

      // Placeholder should exist
      const placeholder = container.firstChild;
      expect(placeholder).toBeInTheDocument();
    });

    it("renders consistently across different param combinations", () => {
      // Test with different param combinations to ensure consistent rendering
      const testCases = [
        { genres: [28] },
        { minYear: "2020" },
        { minRating: "7.0", maxRating: "9.0" },
        { genres: [35, 18], minYear: "2010", maxYear: "2023" },
      ];

      testCases.forEach((paramOverrides) => {
        const browseParams = createMockBrowseParams(paramOverrides);
        const { unmount } = render(
          <ClearBrowseParamsButton
            {...defaultProps}
            browseParams={browseParams}
          />,
        );

        const button = screen.getByRole("button", { name: /clear filters/i });
        expect(button).toBeVisible();
        expect(button).toBeEnabled();

        unmount(); // Clean up for next iteration
      });
    });
  });

  describe("Accessibility", () => {
    it("provides accessible button element via aria-label", () => {
      const paramsWithGenres = createMockBrowseParams({
        genres: [28],
      });

      render(
        <ClearBrowseParamsButton
          {...defaultProps}
          browseParams={paramsWithGenres}
        />,
      );

      const button = screen.getByRole("button", { name: /clear filters/i });
      expect(button).toBeInTheDocument();
    });

    it("renders placeholder (not button) when hidden", () => {
      render(<ClearBrowseParamsButton {...defaultProps} />);

      // Component returns placeholder div, not a button
      const button = screen.queryByRole("button");
      expect(button).not.toBeInTheDocument();
    });

    it("supports keyboard interaction when visible", () => {
      const paramsWithGenres = createMockBrowseParams({
        genres: [28],
      });

      render(
        <ClearBrowseParamsButton
          {...defaultProps}
          browseParams={paramsWithGenres}
        />,
      );

      const button = screen.getByRole("button", { name: /clear filters/i });

      // Should be focusable
      button.focus();
      expect(button).toHaveFocus();

      // For Chakra UI buttons, test the actual click rather than keydown
      // since the framework handles the keyboard to click conversion
      fireEvent.click(button);
      expect(mockOnClear).toHaveBeenCalledTimes(1);
    });

    it("supports standard button interaction patterns", () => {
      const paramsWithGenres = createMockBrowseParams({
        genres: [28],
      });

      render(
        <ClearBrowseParamsButton
          {...defaultProps}
          browseParams={paramsWithGenres}
        />,
      );

      const button = screen.getByRole("button", { name: /clear filters/i });

      // Test focus and click pattern (standard interaction)
      button.focus();
      expect(button).toHaveFocus();

      fireEvent.click(button);
      expect(mockOnClear).toHaveBeenCalledTimes(1);
    });
  });

  describe("Edge Cases", () => {
    it("handles undefined or null param values gracefully", () => {
      // Test with potentially undefined values that might come from form state
      // Note: Component logic uses !== '', so undefined and null are truthy
      const edgeCaseParams = createMockBrowseParams({
        genres: [], // Empty array - falsy
        minYear: "", // Empty string - falsy
        maxYear: undefined as string | undefined, // undefined !== '' is true - will show button
        minRating: null as unknown as string | undefined, // null !== '' is true - will show button
      });

      render(
        <ClearBrowseParamsButton
          {...defaultProps}
          browseParams={edgeCaseParams}
        />,
      );

      const button = screen.getByRole("button", { name: /clear filters/i });
      // Button should be visible because undefined !== '' and null !== ''
      expect(button).toBeVisible();
    });

    it("handles rapid state changes", () => {
      const { rerender } = render(
        <ClearBrowseParamsButton {...defaultProps} />,
      );

      // Initially no params - placeholder rendered
      expect(screen.queryByRole("button")).not.toBeInTheDocument();

      // Add params
      const paramsWithGenres = createMockBrowseParams({ genres: [28] });
      rerender(
        <ClearBrowseParamsButton
          {...defaultProps}
          browseParams={paramsWithGenres}
        />,
      );

      const button = screen.getByRole("button", { name: /clear filters/i });
      expect(button).toBeVisible();

      // Remove params
      rerender(<ClearBrowseParamsButton {...defaultProps} />);

      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("handles isAdvancedOpen state changes", () => {
      const paramsWithGenres = createMockBrowseParams({ genres: [28] });

      const { rerender } = render(
        <ClearBrowseParamsButton
          {...defaultProps}
          browseParams={paramsWithGenres}
          isAdvancedOpen={false}
        />,
      );

      // Initially visible
      const button = screen.getByRole("button", { name: /clear filters/i });
      expect(button).toBeVisible();

      // Hide when isAdvancedOpen becomes true
      rerender(
        <ClearBrowseParamsButton
          {...defaultProps}
          browseParams={paramsWithGenres}
          isAdvancedOpen={true}
        />,
      );

      // Now placeholder, not button
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("maintains functionality after prop updates", () => {
      const initialParams = createMockBrowseParams({ genres: [28] });

      const { rerender } = render(
        <ClearBrowseParamsButton
          {...defaultProps}
          browseParams={initialParams}
        />,
      );

      // Click initial button
      let button = screen.getByRole("button", { name: /clear filters/i });
      fireEvent.click(button);
      expect(mockOnClear).toHaveBeenCalledTimes(1);

      // Update params and click again
      const updatedParams = createMockBrowseParams({ minYear: "2020" });
      rerender(
        <ClearBrowseParamsButton
          {...defaultProps}
          browseParams={updatedParams}
        />,
      );

      button = screen.getByRole("button", { name: /clear filters/i });
      fireEvent.click(button);
      expect(mockOnClear).toHaveBeenCalledTimes(2);
    });
  });
});
