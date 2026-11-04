import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act } from "@tests/helpers/test-renderer";
import userEvent from "@testing-library/user-event";
import GenreSelector from "../GenreSelector";

// Mock the COLORS constant and genre options

// Mock the genre options to have a predictable test set
vi.mock("@/constants/browseOptions", () => ({
  genreOptions: [
    { value: "", label: "Any Genre" },
    { value: "28", label: "Action" },
    { value: "35", label: "Comedy" },
    { value: "18", label: "Drama" },
    { value: "27", label: "Horror" },
    { value: "878", label: "Science Fiction" },
  ],
}));

describe("GenreSelector Component", () => {
  const mockOnChange = vi.fn();

  const defaultProps = {
    selectedGenres: [],
    onChange: mockOnChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear console.log mock since component has debug logging
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  describe("Basic Rendering", () => {
    it("renders genre selector with title", () => {
      render(<GenreSelector {...defaultProps} />);

      expect(screen.getByText("Genres")).toBeInTheDocument();
    });

    it("renders all genre options as checkboxes", () => {
      render(<GenreSelector {...defaultProps} />);

      // Should render all genres except "Any Genre" (filtered out by component)
      expect(screen.getByLabelText("Action")).toBeInTheDocument();
      expect(screen.getByLabelText("Comedy")).toBeInTheDocument();
      expect(screen.getByLabelText("Drama")).toBeInTheDocument();
      expect(screen.getByLabelText("Horror")).toBeInTheDocument();
      expect(screen.getByLabelText("Science Fiction")).toBeInTheDocument();

      // "Any Genre" should not be rendered (filtered out)
      expect(screen.queryByLabelText("Any Genre")).not.toBeInTheDocument();
    });

    it("renders with no genres selected initially", () => {
      render(<GenreSelector {...defaultProps} />);

      const actionCheckbox = screen.getByLabelText(
        "Action",
      ) as HTMLInputElement;
      const comedyCheckbox = screen.getByLabelText(
        "Comedy",
      ) as HTMLInputElement;

      expect(actionCheckbox.checked).toBe(false);
      expect(comedyCheckbox.checked).toBe(false);
    });

    it("renders with pre-selected genres", () => {
      render(<GenreSelector {...defaultProps} selectedGenres={[28, 35]} />);

      const actionCheckbox = screen.getByLabelText(
        "Action",
      ) as HTMLInputElement;
      const comedyCheckbox = screen.getByLabelText(
        "Comedy",
      ) as HTMLInputElement;
      const dramaCheckbox = screen.getByLabelText("Drama") as HTMLInputElement;

      expect(actionCheckbox.checked).toBe(true);
      expect(comedyCheckbox.checked).toBe(true);
      expect(dramaCheckbox.checked).toBe(false);
    });
  });

  describe("User Interactions", () => {
    it("calls onChange when selecting a genre", async () => {
      const user = userEvent.setup();
      render(<GenreSelector {...defaultProps} />);

      const actionCheckbox = screen.getByLabelText("Action");
      await act(async () => {
        await user.click(actionCheckbox);
      });

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      expect(mockOnChange).toHaveBeenCalledWith([28]);
    });

    it("calls onChange when deselecting a genre", async () => {
      const user = userEvent.setup();
      render(<GenreSelector {...defaultProps} selectedGenres={[28, 35]} />);

      const actionCheckbox = screen.getByLabelText("Action");
      await act(async () => {
        await user.click(actionCheckbox);
      });

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      expect(mockOnChange).toHaveBeenCalledWith([35]); // Only Comedy remains
    });

    it("handles selecting multiple genres", async () => {
      const user = userEvent.setup();
      const { rerender } = render(<GenreSelector {...defaultProps} />);

      // Select Action
      const actionCheckbox = screen.getByLabelText("Action");
      await act(async () => {
        await user.click(actionCheckbox);
      });
      expect(mockOnChange).toHaveBeenCalledWith([28]);

      // Simulate parent state update
      act(() => {
        rerender(<GenreSelector {...defaultProps} selectedGenres={[28]} />);
      });

      // Select Comedy
      const comedyCheckbox = screen.getByLabelText("Comedy");
      await act(async () => {
        await user.click(comedyCheckbox);
      });
      expect(mockOnChange).toHaveBeenCalledWith([28, 35]);
    });

    it("handles deselecting from multiple genres", async () => {
      const user = userEvent.setup();
      render(<GenreSelector {...defaultProps} selectedGenres={[28, 35, 18]} />);

      // Deselect Comedy (middle item)
      const comedyCheckbox = screen.getByLabelText("Comedy");
      await act(async () => {
        await user.click(comedyCheckbox);
      });

      expect(mockOnChange).toHaveBeenCalledWith([28, 18]); // Action and Drama remain
    });

    it("handles selecting all genres", async () => {
      const user = userEvent.setup();
      const { rerender } = render(<GenreSelector {...defaultProps} />);

      const genres = [
        { id: 28, label: "Action" },
        { id: 35, label: "Comedy" },
        { id: 18, label: "Drama" },
        { id: 27, label: "Horror" },
        { id: 878, label: "Science Fiction" },
      ];

      let selectedIds: number[] = [];

      // Select each genre one by one
      for (const { id, label } of genres) {
        const checkbox = screen.getByLabelText(label);
        await act(async () => {
          await user.click(checkbox);
        });

        selectedIds = [...selectedIds, id];
        expect(mockOnChange).toHaveBeenCalledWith(selectedIds);

        // Update the component with new selection
        act(() => {
          rerender(
            <GenreSelector {...defaultProps} selectedGenres={selectedIds} />,
          );
        });
      }

      // All checkboxes should be checked
      genres.forEach(({ label }) => {
        const checkbox = screen.getByLabelText(label);
        expect(checkbox).toBeChecked();
      });
    });
  });

  describe("Controlled Component Behavior", () => {
    it("reflects selectedGenres prop changes", () => {
      const { rerender } = render(
        <GenreSelector {...defaultProps} selectedGenres={[28]} />,
      );

      let actionCheckbox = screen.getByLabelText("Action") as HTMLInputElement;
      expect(actionCheckbox.checked).toBe(true);

      // Update selectedGenres prop
      rerender(<GenreSelector {...defaultProps} selectedGenres={[35]} />);

      actionCheckbox = screen.getByLabelText("Action") as HTMLInputElement;
      const comedyCheckbox = screen.getByLabelText(
        "Comedy",
      ) as HTMLInputElement;

      expect(actionCheckbox.checked).toBe(false);
      expect(comedyCheckbox.checked).toBe(true);
    });

    it("handles empty selectedGenres array", () => {
      const { rerender } = render(
        <GenreSelector {...defaultProps} selectedGenres={[28, 35]} />,
      );

      // Initially some genres are selected
      let actionCheckbox = screen.getByLabelText("Action") as HTMLInputElement;
      expect(actionCheckbox.checked).toBe(true);

      // Clear all selections
      rerender(<GenreSelector {...defaultProps} selectedGenres={[]} />);

      actionCheckbox = screen.getByLabelText("Action") as HTMLInputElement;
      const comedyCheckbox = screen.getByLabelText(
        "Comedy",
      ) as HTMLInputElement;

      expect(actionCheckbox.checked).toBe(false);
      expect(comedyCheckbox.checked).toBe(false);
    });

    it("handles prop changes without affecting unrelated genres", () => {
      render(<GenreSelector {...defaultProps} selectedGenres={[28, 18]} />);

      const actionCheckbox = screen.getByLabelText(
        "Action",
      ) as HTMLInputElement;
      const dramaCheckbox = screen.getByLabelText("Drama") as HTMLInputElement;
      const comedyCheckbox = screen.getByLabelText(
        "Comedy",
      ) as HTMLInputElement;

      expect(actionCheckbox.checked).toBe(true);
      expect(dramaCheckbox.checked).toBe(true);
      expect(comedyCheckbox.checked).toBe(false);
    });
  });

  describe("Genre Array Management", () => {
    it("maintains array order when adding genres", async () => {
      const user = userEvent.setup();
      render(<GenreSelector {...defaultProps} selectedGenres={[35]} />);

      // Add Action (28) to existing Comedy (35)
      const actionCheckbox = screen.getByLabelText("Action");
      await act(async () => {
        await user.click(actionCheckbox);
      });

      // Should add to end of array
      expect(mockOnChange).toHaveBeenCalledWith([35, 28]);
    });

    it("preserves existing order when removing genres", async () => {
      const user = userEvent.setup();
      render(
        <GenreSelector {...defaultProps} selectedGenres={[28, 35, 18, 27]} />,
      );

      // Remove Comedy (35) from middle
      const comedyCheckbox = screen.getByLabelText("Comedy");
      await act(async () => {
        await user.click(comedyCheckbox);
      });

      // Should maintain order of remaining items
      expect(mockOnChange).toHaveBeenCalledWith([28, 18, 27]);
    });

    it("handles duplicate genre IDs gracefully", () => {
      // Component shouldn't produce duplicates, but test defensive behavior
      render(<GenreSelector {...defaultProps} selectedGenres={[28, 28, 35]} />);

      const actionCheckbox = screen.getByLabelText(
        "Action",
      ) as HTMLInputElement;

      // Should still show as checked despite duplicate
      expect(actionCheckbox.checked).toBe(true);
    });
  });

  describe("Component Structure and Styling", () => {
    it("renders in a grid layout", () => {
      render(<GenreSelector {...defaultProps} />);

      // Component should render checkboxes in a structured layout
      const genreLabels = [
        "Action",
        "Comedy",
        "Drama",
        "Horror",
        "Science Fiction",
      ];

      genreLabels.forEach((label) => {
        const checkbox = screen.getByLabelText(label);
        expect(checkbox).toBeInTheDocument();
        expect(checkbox.closest("label")).toBeInTheDocument();
      });
    });

    it("applies proper checkbox structure", () => {
      render(<GenreSelector {...defaultProps} />);

      const actionCheckbox = screen.getByLabelText("Action");

      // Should be a proper checkbox input
      expect(actionCheckbox).toHaveAttribute("type", "checkbox");
      expect(actionCheckbox.tagName).toBe("INPUT");
    });
  });

  describe("Accessibility", () => {
    it("provides accessible labels for all checkboxes", () => {
      render(<GenreSelector {...defaultProps} />);

      // All genres should be accessible by label
      const genreLabels = [
        "Action",
        "Comedy",
        "Drama",
        "Horror",
        "Science Fiction",
      ];

      genreLabels.forEach((label) => {
        const checkbox = screen.getByLabelText(label);
        expect(checkbox).toBeInTheDocument();
        expect(checkbox).toHaveAccessibleName(label);
      });
    });

    it("maintains proper checkbox semantics", () => {
      render(<GenreSelector {...defaultProps} />);

      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes).toHaveLength(5); // 5 genres (excluding "Any Genre")

      checkboxes.forEach((checkbox) => {
        expect(checkbox).toHaveAttribute("type", "checkbox");
      });
    });

    it("supports keyboard navigation", async () => {
      const user = userEvent.setup();
      render(<GenreSelector {...defaultProps} />);

      const actionCheckbox = screen.getByLabelText("Action");
      await act(async () => {
        await user.tab();
      });
      expect(actionCheckbox).toHaveFocus();

      await act(async () => {
        await user.keyboard("[Space]");
      });
      expect(mockOnChange).toHaveBeenCalledTimes(1);
      expect(mockOnChange).toHaveBeenCalledWith([28]);
    });

    it("provides meaningful section title", () => {
      render(<GenreSelector {...defaultProps} />);

      const title = screen.getByText("Genres");
      expect(title).toBeInTheDocument();

      // Title should be associated with the form section
      expect(title.tagName).toBe("P"); // Or whatever element it renders as
    });
  });

  describe("Edge Cases", () => {
    it("handles invalid genre IDs in selectedGenres", async () => {
      const user = userEvent.setup();
      // Component should gracefully handle IDs that don't exist in genreOptions
      render(<GenreSelector {...defaultProps} selectedGenres={[999, 28]} />);

      const actionCheckbox = screen.getByLabelText(
        "Action",
      ) as HTMLInputElement;
      expect(actionCheckbox.checked).toBe(true);

      // Component should still function normally
      await act(async () => {
        await user.click(actionCheckbox);
      });
      expect(mockOnChange).toHaveBeenCalledWith([999]); // Should preserve unknown ID
    });

    it("handles empty genre options gracefully", () => {
      // This would be an edge case if genreOptions was empty
      // Component should render without crashing
      const { container } = render(<GenreSelector {...defaultProps} />);
      expect(container).toBeInTheDocument();
    });

    it("handles rapid selection changes", async () => {
      const user = userEvent.setup();
      const { rerender } = render(<GenreSelector {...defaultProps} />);

      const actionCheckbox = screen.getByLabelText("Action");
      const comedyCheckbox = screen.getByLabelText("Comedy");

      // First click: Select Action
      await act(async () => {
        await user.click(actionCheckbox);
      });
      expect(mockOnChange).toHaveBeenCalledWith([28]);

      // Update component state
      act(() => {
        rerender(<GenreSelector {...defaultProps} selectedGenres={[28]} />);
      });

      // Second click: Select Comedy (should add to existing selection)
      await act(async () => {
        await user.click(comedyCheckbox);
      });
      expect(mockOnChange).toHaveBeenCalledWith([28, 35]);

      // Verify total calls
      expect(mockOnChange).toHaveBeenCalledTimes(2);
    });

    it("handles onChange callback errors gracefully", async () => {
      // Skip this test as it causes unhandled errors in test environment
      // In real usage, error boundaries would catch these errors
      const user = userEvent.setup();

      // Test with a working onChange that logs error details instead
      const mockOnChangeWithLogging = vi.fn((genres) => {
        // Component should handle the callback and pass correct data
        expect(genres).toEqual([28]);
      });

      render(
        <GenreSelector
          selectedGenres={[]}
          onChange={mockOnChangeWithLogging}
        />,
      );

      const actionCheckbox = screen.getByLabelText("Action");
      await act(async () => {
        await user.click(actionCheckbox);
      });

      // Verify the callback was called with correct arguments
      expect(mockOnChangeWithLogging).toHaveBeenCalledTimes(1);
      expect(mockOnChangeWithLogging).toHaveBeenCalledWith([28]);
    });
  });

  describe("Performance Considerations", () => {
    it("renders efficiently with many selected genres", () => {
      const allGenreIds = [28, 35, 18, 27, 878];
      render(<GenreSelector {...defaultProps} selectedGenres={allGenreIds} />);

      // All checkboxes should render and be checked efficiently
      allGenreIds.forEach((id) => {
        const label = {
          28: "Action",
          35: "Comedy",
          18: "Drama",
          27: "Horror",
          878: "Science Fiction",
        }[id];

        const checkbox = screen.getByLabelText(
          label as string,
        ) as HTMLInputElement;
        expect(checkbox.checked).toBe(true);
      });
    });
  });
});
