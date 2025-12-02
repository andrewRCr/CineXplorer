import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@tests/helpers/test-renderer";
import userEvent from "@testing-library/user-event";
import SortDropdown from "../SortDropdown";
import type { MovieFilters } from "../AdvancedMovieFilters";

// Helper to create mock filters
const createMockFilters = (
  overrides: Partial<MovieFilters> = {}
): MovieFilters => ({
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
  ...overrides,
});

describe("SortDropdown", () => {
  const mockOnSortChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("renders sort dropdown with label", () => {
      render(
        <SortDropdown
          filters={createMockFilters()}
          onSortChange={mockOnSortChange}
        />
      );

      expect(screen.getByText("Sort by")).toBeInTheDocument();
    });

    it("displays current sort value in trigger", () => {
      render(
        <SortDropdown
          filters={createMockFilters({ sortBy: "vote_average.desc" })}
          onSortChange={mockOnSortChange}
        />
      );

      // Check the combobox trigger displays the selected value
      const trigger = screen.getByRole("combobox");
      expect(trigger).toHaveTextContent("Highest Rated");
    });

    it("displays default sort (Most Popular) in trigger", () => {
      render(
        <SortDropdown
          filters={createMockFilters({ sortBy: "popularity.desc" })}
          onSortChange={mockOnSortChange}
        />
      );

      const trigger = screen.getByRole("combobox");
      expect(trigger).toHaveTextContent("Most Popular");
    });
  });

  describe("Sort Selection", () => {
    it("calls onSortChange when option is selected", async () => {
      const user = userEvent.setup();

      render(
        <SortDropdown
          filters={createMockFilters()}
          onSortChange={mockOnSortChange}
        />
      );

      // Open dropdown
      const trigger = screen.getByRole("combobox");
      await user.click(trigger);

      // Select "Newest"
      const newestOption = screen.getByText("Newest");
      await user.click(newestOption);

      expect(mockOnSortChange).toHaveBeenCalledWith("release_date.desc");
    });

    it("shows all 6 sort options when language is Latin-script", async () => {
      const user = userEvent.setup();

      render(
        <SortDropdown
          filters={createMockFilters({ language: "en" })}
          onSortChange={mockOnSortChange}
        />
      );

      // Open dropdown
      const trigger = screen.getByRole("combobox");
      await user.click(trigger);

      // Should have all 5 options (use getAllByRole to count option elements)
      const options = screen.getAllByRole("option");
      expect(options).toHaveLength(5);

      // Verify alphabetical sort exists
      expect(screen.getByRole("option", { name: "Alphabetical" })).toBeInTheDocument();
    });
  });

  describe("Upcoming Page - Highest Rated Disabled", () => {
    it("disables Highest Rated option for upcoming pageSource", async () => {
      const user = userEvent.setup();

      render(
        <SortDropdown
          filters={createMockFilters()}
          onSortChange={mockOnSortChange}
          pageSource="upcoming"
        />
      );

      // Open dropdown
      const trigger = screen.getByRole("combobox");
      await user.click(trigger);

      // Highest Rated should be in italics (disabled styling)
      const highestRatedOption = screen.getByText("Highest Rated");
      expect(highestRatedOption).toHaveStyle({ fontStyle: "italic" });
    });

    it("does NOT disable Highest Rated for other page sources", async () => {
      const user = userEvent.setup();

      render(
        <SortDropdown
          filters={createMockFilters()}
          onSortChange={mockOnSortChange}
          pageSource="popular"
        />
      );

      // Open dropdown
      const trigger = screen.getByRole("combobox");
      await user.click(trigger);

      // Highest Rated should NOT be in italics
      const highestRatedOption = screen.getByText("Highest Rated");
      expect(highestRatedOption).not.toHaveStyle({ fontStyle: "italic" });
    });
  });

  describe("Conditional Title Sorts Based on Language", () => {
    it("hides title sorts when language is empty (All Languages)", async () => {
      const user = userEvent.setup();

      render(
        <SortDropdown
          filters={createMockFilters({ language: "" })}
          onSortChange={mockOnSortChange}
        />
      );

      // Open dropdown
      const trigger = screen.getByRole("combobox");
      await user.click(trigger);

      // Should have only 4 options (no title sorts)
      const options = screen.getAllByRole("option");
      expect(options).toHaveLength(4);

      // Title sort should NOT be present
      expect(screen.queryByRole("option", { name: "Alphabetical" })).not.toBeInTheDocument();
    });

    it("hides title sorts for non-Latin languages (Japanese)", async () => {
      const user = userEvent.setup();

      render(
        <SortDropdown
          filters={createMockFilters({ language: "ja" })}
          onSortChange={mockOnSortChange}
        />
      );

      // Open dropdown
      const trigger = screen.getByRole("combobox");
      await user.click(trigger);

      // Title sort should NOT be present
      expect(screen.queryByText("Alphabetical")).not.toBeInTheDocument();
    });

    it("hides title sort for non-Latin languages (Korean)", async () => {
      const user = userEvent.setup();

      render(
        <SortDropdown
          filters={createMockFilters({ language: "ko" })}
          onSortChange={mockOnSortChange}
        />
      );

      // Open dropdown
      const trigger = screen.getByRole("combobox");
      await user.click(trigger);

      // Title sort should NOT be present
      expect(screen.queryByText("Alphabetical")).not.toBeInTheDocument();
    });

    it("shows title sort for Latin languages (English)", async () => {
      const user = userEvent.setup();

      render(
        <SortDropdown
          filters={createMockFilters({ language: "en" })}
          onSortChange={mockOnSortChange}
        />
      );

      // Open dropdown
      const trigger = screen.getByRole("combobox");
      await user.click(trigger);

      // Title sort SHOULD be present
      expect(screen.getByText("Alphabetical")).toBeInTheDocument();
    });

    it("shows title sort for Latin languages (French)", async () => {
      const user = userEvent.setup();

      render(
        <SortDropdown
          filters={createMockFilters({ language: "fr" })}
          onSortChange={mockOnSortChange}
        />
      );

      // Open dropdown
      const trigger = screen.getByRole("combobox");
      await user.click(trigger);

      // Title sort SHOULD be present
      expect(screen.getByText("Alphabetical")).toBeInTheDocument();
    });

    it("shows title sort for Latin languages (Spanish)", async () => {
      const user = userEvent.setup();

      render(
        <SortDropdown
          filters={createMockFilters({ language: "es" })}
          onSortChange={mockOnSortChange}
        />
      );

      // Open dropdown
      const trigger = screen.getByRole("combobox");
      await user.click(trigger);

      // Title sort SHOULD be present
      expect(screen.getByText("Alphabetical")).toBeInTheDocument();
    });
  });
});
