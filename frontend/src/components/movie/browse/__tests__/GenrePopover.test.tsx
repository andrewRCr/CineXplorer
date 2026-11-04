import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@tests/helpers/test-renderer";
import userEvent from "@testing-library/user-event";
import GenrePopover from "../GenrePopover";

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

describe("GenrePopover Component", () => {
  const mockOnChange = vi.fn();

  const defaultProps = {
    selectedGenres: [],
    onChange: mockOnChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("renders with label 'Genres (full)'", () => {
      render(<GenrePopover {...defaultProps} />);

      expect(screen.getByText("Genres (full)")).toBeInTheDocument();
    });

    it("renders trigger button with 'All genres' when nothing selected", () => {
      render(<GenrePopover {...defaultProps} />);

      expect(
        screen.getByRole("button", { name: /all genres/i }),
      ).toBeInTheDocument();
    });

    it("renders trigger button with count when genres selected", () => {
      render(<GenrePopover {...defaultProps} selectedGenres={[28, 35]} />);

      expect(
        screen.getByRole("button", { name: /2 selected/i }),
      ).toBeInTheDocument();
    });

    it("renders trigger button with singular count for one genre", () => {
      render(<GenrePopover {...defaultProps} selectedGenres={[28]} />);

      expect(
        screen.getByRole("button", { name: /1 selected/i }),
      ).toBeInTheDocument();
    });

    it("popover content is closed initially", () => {
      render(<GenrePopover {...defaultProps} />);

      // Popover trigger should have data-state="closed" initially
      const triggerButton = screen.getByRole("button", { name: /all genres/i });
      expect(triggerButton).toHaveAttribute("data-state", "closed");
    });
  });

  describe("Popover Open/Close Behavior", () => {
    it("opens popover when trigger button is clicked", async () => {
      const user = userEvent.setup();
      render(<GenrePopover {...defaultProps} />);

      const triggerButton = screen.getByRole("button", { name: /all genres/i });

      await user.click(triggerButton);

      // Wait for popover content to appear
      await waitFor(() => {
        expect(screen.getByLabelText("Action")).toBeInTheDocument();
      });
    });

    it("shows open state when trigger is clicked", async () => {
      const user = userEvent.setup();
      render(<GenrePopover {...defaultProps} />);

      const triggerButton = screen.getByRole("button", { name: /all genres/i });

      // Initially closed
      expect(triggerButton).toHaveAttribute("data-state", "closed");

      // Open the popover

      await user.click(triggerButton);

      // Should be open
      await waitFor(() => {
        expect(triggerButton).toHaveAttribute("data-state", "open");
      });
    });

    it("shows all genre options when popover is open", async () => {
      const user = userEvent.setup();
      render(<GenrePopover {...defaultProps} />);

      const triggerButton = screen.getByRole("button", { name: /all genres/i });

      await user.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByLabelText("Action")).toBeInTheDocument();
        expect(screen.getByLabelText("Comedy")).toBeInTheDocument();
        expect(screen.getByLabelText("Drama")).toBeInTheDocument();
        expect(screen.getByLabelText("Horror")).toBeInTheDocument();
        expect(screen.getByLabelText("Science Fiction")).toBeInTheDocument();
      });

      // "Any Genre" should not be rendered (filtered out)
      expect(screen.queryByLabelText("Any Genre")).not.toBeInTheDocument();
    });
  });

  describe("isOpen Prop (Drawer Auto-Close)", () => {
    it("closes popover when isOpen prop changes to false", async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <GenrePopover {...defaultProps} isOpen={true} />,
      );

      // Open the popover
      const triggerButton = screen.getByRole("button", { name: /all genres/i });

      await user.click(triggerButton);

      await waitFor(() => {
        expect(triggerButton).toHaveAttribute("data-state", "open");
      });

      // Simulate drawer closing by setting isOpen to false
      rerender(<GenrePopover {...defaultProps} isOpen={false} />);

      // Popover should close (data-state changes to closed)
      await waitFor(() => {
        expect(triggerButton).toHaveAttribute("data-state", "closed");
      });
    });

    it("keeps popover open when isOpen remains true", async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <GenrePopover {...defaultProps} isOpen={true} />,
      );

      // Open the popover
      const triggerButton = screen.getByRole("button", { name: /all genres/i });

      await user.click(triggerButton);

      await waitFor(() => {
        expect(triggerButton).toHaveAttribute("data-state", "open");
      });

      // Re-render with isOpen still true
      rerender(<GenrePopover {...defaultProps} isOpen={true} />);

      // Popover should remain open
      expect(triggerButton).toHaveAttribute("data-state", "open");
    });

    it("defaults isOpen to true when not provided", async () => {
      const user = userEvent.setup();
      render(<GenrePopover {...defaultProps} />);

      // Open the popover
      const triggerButton = screen.getByRole("button", { name: /all genres/i });

      await user.click(triggerButton);

      // Should open normally without isOpen prop
      await waitFor(() => {
        expect(screen.getByLabelText("Action")).toBeInTheDocument();
      });
    });
  });

  describe("Genre Selection", () => {
    it("calls onChange when selecting a genre", async () => {
      const user = userEvent.setup();
      render(<GenrePopover {...defaultProps} />);

      // Open the popover
      const triggerButton = screen.getByRole("button", { name: /all genres/i });

      await user.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByLabelText("Action")).toBeInTheDocument();
      });

      // Select Action
      const actionCheckbox = screen.getByLabelText("Action");

      await user.click(actionCheckbox);

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      expect(mockOnChange).toHaveBeenCalledWith([28]);
    });

    it("calls onChange when deselecting a genre", async () => {
      const user = userEvent.setup();
      render(<GenrePopover {...defaultProps} selectedGenres={[28, 35]} />);

      // Open the popover
      const triggerButton = screen.getByRole("button", { name: /2 selected/i });

      await user.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByLabelText("Action")).toBeInTheDocument();
      });

      // Deselect Action
      const actionCheckbox = screen.getByLabelText("Action");

      await user.click(actionCheckbox);

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      expect(mockOnChange).toHaveBeenCalledWith([35]); // Only Comedy remains
    });

    it("handles selecting multiple genres", async () => {
      const user = userEvent.setup();
      const { rerender } = render(<GenrePopover {...defaultProps} />);

      // Open the popover
      const triggerButton = screen.getByRole("button", { name: /all genres/i });

      await user.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByLabelText("Action")).toBeInTheDocument();
      });

      // Select Action

      await user.click(screen.getByLabelText("Action"));
      expect(mockOnChange).toHaveBeenCalledWith([28]);

      // Update component state and keep popover open
      rerender(<GenrePopover {...defaultProps} selectedGenres={[28]} />);

      // Need to re-open popover after rerender
      const updatedTrigger = screen.getByRole("button", {
        name: /1 selected/i,
      });

      await user.click(updatedTrigger);

      await waitFor(() => {
        expect(screen.getByLabelText("Comedy")).toBeInTheDocument();
      });

      // Select Comedy

      await user.click(screen.getByLabelText("Comedy"));
      expect(mockOnChange).toHaveBeenCalledWith([28, 35]);
    });

    it("shows checkboxes as checked for pre-selected genres", async () => {
      const user = userEvent.setup();
      render(<GenrePopover {...defaultProps} selectedGenres={[28, 35]} />);

      // Open the popover
      const triggerButton = screen.getByRole("button", { name: /2 selected/i });

      await user.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByLabelText("Action")).toBeInTheDocument();
      });

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

  describe("Controlled Component Behavior", () => {
    it("reflects selectedGenres prop changes in trigger text", () => {
      const { rerender } = render(
        <GenrePopover {...defaultProps} selectedGenres={[28]} />,
      );

      expect(
        screen.getByRole("button", { name: /1 selected/i }),
      ).toBeInTheDocument();

      // Update selectedGenres prop
      rerender(
        <GenrePopover {...defaultProps} selectedGenres={[28, 35, 18]} />,
      );

      expect(
        screen.getByRole("button", { name: /3 selected/i }),
      ).toBeInTheDocument();
    });

    it("handles empty selectedGenres array", () => {
      const { rerender } = render(
        <GenrePopover {...defaultProps} selectedGenres={[28, 35]} />,
      );

      expect(
        screen.getByRole("button", { name: /2 selected/i }),
      ).toBeInTheDocument();

      // Clear all selections
      rerender(<GenrePopover {...defaultProps} selectedGenres={[]} />);

      expect(
        screen.getByRole("button", { name: /all genres/i }),
      ).toBeInTheDocument();
    });

    it("reflects selectedGenres changes in checkbox state", async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <GenrePopover {...defaultProps} selectedGenres={[28]} />,
      );

      // Open popover

      await user.click(screen.getByRole("button", { name: /1 selected/i }));

      await waitFor(() => {
        expect(screen.getByLabelText("Action")).toBeInTheDocument();
      });

      let actionCheckbox = screen.getByLabelText("Action") as HTMLInputElement;
      expect(actionCheckbox.checked).toBe(true);

      // Close and change selection

      await user.click(document.body);

      rerender(<GenrePopover {...defaultProps} selectedGenres={[35]} />);

      // Reopen popover

      await user.click(screen.getByRole("button", { name: /1 selected/i }));

      await waitFor(() => {
        expect(screen.getByLabelText("Action")).toBeInTheDocument();
      });

      actionCheckbox = screen.getByLabelText("Action") as HTMLInputElement;
      const comedyCheckbox = screen.getByLabelText(
        "Comedy",
      ) as HTMLInputElement;

      expect(actionCheckbox.checked).toBe(false);
      expect(comedyCheckbox.checked).toBe(true);
    });
  });

  describe("Accessibility", () => {
    it("trigger button is focusable", () => {
      render(<GenrePopover {...defaultProps} />);

      const triggerButton = screen.getByRole("button", { name: /all genres/i });
      triggerButton.focus();
      expect(triggerButton).toHaveFocus();
    });

    it("provides accessible labels for all checkboxes when open", async () => {
      const user = userEvent.setup();
      render(<GenrePopover {...defaultProps} />);

      // Open the popover

      await user.click(screen.getByRole("button", { name: /all genres/i }));

      await waitFor(() => {
        expect(screen.getByLabelText("Action")).toBeInTheDocument();
      });

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

    it("checkboxes have proper checkbox semantics", async () => {
      const user = userEvent.setup();
      render(<GenrePopover {...defaultProps} />);

      // Open the popover

      await user.click(screen.getByRole("button", { name: /all genres/i }));

      await waitFor(() => {
        expect(screen.getByLabelText("Action")).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes).toHaveLength(5); // 5 genres (excluding "Any Genre")

      checkboxes.forEach((checkbox) => {
        expect(checkbox).toHaveAttribute("type", "checkbox");
      });
    });
  });

  describe("Edge Cases", () => {
    it("handles invalid genre IDs in selectedGenres", async () => {
      const user = userEvent.setup();
      // Component should gracefully handle IDs that don't exist in genreOptions
      render(<GenrePopover {...defaultProps} selectedGenres={[999, 28]} />);

      // Trigger text should show count including unknown ID
      expect(
        screen.getByRole("button", { name: /2 selected/i }),
      ).toBeInTheDocument();

      // Open popover

      await user.click(screen.getByRole("button", { name: /2 selected/i }));

      await waitFor(() => {
        expect(screen.getByLabelText("Action")).toBeInTheDocument();
      });

      const actionCheckbox = screen.getByLabelText(
        "Action",
      ) as HTMLInputElement;
      expect(actionCheckbox.checked).toBe(true);

      // Deselect Action - should preserve unknown ID

      await user.click(actionCheckbox);
      expect(mockOnChange).toHaveBeenCalledWith([999]);
    });

    it("handles large number of selected genres", () => {
      const allGenreIds = [28, 35, 18, 27, 878];
      render(<GenrePopover {...defaultProps} selectedGenres={allGenreIds} />);

      expect(
        screen.getByRole("button", { name: /5 selected/i }),
      ).toBeInTheDocument();
    });
  });
});
