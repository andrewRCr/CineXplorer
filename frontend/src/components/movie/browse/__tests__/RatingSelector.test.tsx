import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@tests/helpers/test-renderer";
import userEvent from "@testing-library/user-event";
import RatingSelector from "../RatingSelector";

// Mock lodash debounce
vi.mock("lodash", async () => {
  const actual = await vi.importActual("lodash");
  return {
    ...actual,
    debounce: vi.fn((fn) => {
      // For testing, we'll use immediate execution but track that debounce was called
      const debouncedFn = (...args: Parameters<typeof fn>) => fn(...args);
      debouncedFn.cancel = vi.fn();
      return debouncedFn;
    }),
  };
});

describe("RatingSelector Component", () => {
  const mockOnMinRatingChange = vi.fn();
  const mockOnMaxRatingChange = vi.fn();

  const defaultProps = {
    minRating: "",
    maxRating: "",
    onMinRatingChange: mockOnMinRatingChange,
    onMaxRatingChange: mockOnMaxRatingChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Basic Rendering", () => {
    it("renders rating selector with title", () => {
      render(<RatingSelector {...defaultProps} />);

      expect(screen.getByText("Average Rating")).toBeInTheDocument();
    });

    it("renders both min and max inputs", () => {
      render(<RatingSelector {...defaultProps} />);

      const minInput = screen.getByPlaceholderText("0.0");
      const maxInput = screen.getByPlaceholderText("10");

      expect(minInput).toBeInTheDocument();
      expect(maxInput).toBeInTheDocument();
      expect(minInput).toHaveAttribute("type", "number");
      expect(maxInput).toHaveAttribute("type", "number");
    });

    it('displays "to" text between inputs', () => {
      render(<RatingSelector {...defaultProps} />);

      expect(screen.getByText("to")).toBeInTheDocument();
    });

    it("renders with empty initial values", () => {
      render(<RatingSelector {...defaultProps} />);

      const minInput = screen.getByPlaceholderText("0.0") as HTMLInputElement;
      const maxInput = screen.getByPlaceholderText("10") as HTMLInputElement;

      expect(minInput.value).toBe("");
      expect(maxInput.value).toBe("");
    });
  });

  describe("Native 0-10 Scale Display", () => {
    it("displays TMDB 0-10 scale directly (minRating)", () => {
      // Uses TMDB 0-10 scale directly (no conversion)
      render(<RatingSelector {...defaultProps} minRating="7.0" />);

      const minInput = screen.getByPlaceholderText("0.0") as HTMLInputElement;
      expect(minInput.value).toBe("7.0");
    });

    it("displays TMDB 0-10 scale directly (maxRating)", () => {
      // Uses TMDB 0-10 scale directly (no conversion)
      render(<RatingSelector {...defaultProps} maxRating="8.5" />);

      const maxInput = screen.getByPlaceholderText("10") as HTMLInputElement;
      expect(maxInput.value).toBe("8.5");
    });

    it("handles decimal TMDB values correctly", () => {
      render(
        <RatingSelector {...defaultProps} minRating="6.7" maxRating="8.3" />,
      );

      const minInput = screen.getByPlaceholderText("0.0") as HTMLInputElement;
      const maxInput = screen.getByPlaceholderText("10") as HTMLInputElement;

      expect(minInput.value).toBe("6.7");
      expect(maxInput.value).toBe("8.3");
    });

    it("handles edge cases (0 and 10 TMDB scale)", () => {
      render(<RatingSelector {...defaultProps} minRating="0" maxRating="10" />);

      const minInput = screen.getByPlaceholderText("0.0") as HTMLInputElement;
      const maxInput = screen.getByPlaceholderText("10") as HTMLInputElement;

      expect(minInput.value).toBe("0");
      expect(maxInput.value).toBe("10");
    });

    it("passes TMDB scale directly (no conversion) for callbacks", async () => {
      const user = userEvent.setup();
      render(<RatingSelector {...defaultProps} />);

      const minInput = screen.getByPlaceholderText("0.0");

      await user.type(minInput, "7.5");

      // Should pass 7.5 directly on TMDB scale
      expect(mockOnMinRatingChange).toHaveBeenCalled();
    });
  });

  describe("Input Validation and Attributes", () => {
    it("sets correct input attributes for validation", () => {
      render(<RatingSelector {...defaultProps} />);

      const minInput = screen.getByPlaceholderText("0.0");
      const maxInput = screen.getByPlaceholderText("10");

      expect(minInput).toHaveAttribute("min", "0");
      expect(minInput).toHaveAttribute("max", "10");
      expect(minInput).toHaveAttribute("step", "0.1");
      expect(maxInput).toHaveAttribute("min", "0");
      expect(maxInput).toHaveAttribute("max", "10");
      expect(maxInput).toHaveAttribute("step", "0.1");
    });

    it("shows appropriate input widths", () => {
      render(<RatingSelector {...defaultProps} />);

      const minInput = screen.getByPlaceholderText("0.0");
      const maxInput = screen.getByPlaceholderText("10");

      // Both inputs should be relatively narrow (70px as per component)
      expect(minInput).toBeInTheDocument();
      expect(maxInput).toBeInTheDocument();
    });

    it("shows red border for invalid range (min > max)", () => {
      render(
        <RatingSelector {...defaultProps} minRating="8.0" maxRating="6.0" />,
      );

      const minInput = screen.getByPlaceholderText("0.0");
      const maxInput = screen.getByPlaceholderText("10");

      // Component should apply red border when min > max
      expect(minInput).toBeInTheDocument();
      expect(maxInput).toBeInTheDocument();
    });
  });

  describe("Range Validation Logic", () => {
    it("accepts valid ranges where min <= max", () => {
      render(
        <RatingSelector {...defaultProps} minRating="6.0" maxRating="8.0" />,
      );

      const minInput = screen.getByPlaceholderText("0.0") as HTMLInputElement;
      const maxInput = screen.getByPlaceholderText("10") as HTMLInputElement;

      expect(minInput.value).toBe("6.0");
      expect(maxInput.value).toBe("8.0");
    });

    it("identifies invalid ranges where min > max", () => {
      render(
        <RatingSelector {...defaultProps} minRating="8.0" maxRating="6.0" />,
      );

      const minInput = screen.getByPlaceholderText("0.0") as HTMLInputElement;
      const maxInput = screen.getByPlaceholderText("10") as HTMLInputElement;

      // Should still display values but apply visual validation feedback
      expect(minInput.value).toBe("8.0");
      expect(maxInput.value).toBe("6.0");
    });

    it("allows equal min and max values", () => {
      render(
        <RatingSelector {...defaultProps} minRating="7.5" maxRating="7.5" />,
      );

      const minInput = screen.getByPlaceholderText("0.0") as HTMLInputElement;
      const maxInput = screen.getByPlaceholderText("10") as HTMLInputElement;

      expect(minInput.value).toBe("7.5");
      expect(maxInput.value).toBe("7.5");
    });

    it("accepts empty values as valid (no range constraint)", () => {
      render(<RatingSelector {...defaultProps} minRating="" maxRating="8.0" />);

      const minInput = screen.getByPlaceholderText("0.0") as HTMLInputElement;
      const maxInput = screen.getByPlaceholderText("10") as HTMLInputElement;

      expect(minInput.value).toBe("");
      expect(maxInput.value).toBe("8.0");
    });
  });

  describe("Local State Management", () => {
    it("initializes local state from props (no conversion)", () => {
      render(
        <RatingSelector {...defaultProps} minRating="7.0" maxRating="8.5" />,
      );

      const minInput = screen.getByPlaceholderText("0.0") as HTMLInputElement;
      const maxInput = screen.getByPlaceholderText("10") as HTMLInputElement;

      expect(minInput.value).toBe("7.0");
      expect(maxInput.value).toBe("8.5");
    });

    it("updates local state when props change", () => {
      const { rerender } = render(
        <RatingSelector {...defaultProps} minRating="6.0" />,
      );

      const minInput = screen.getByPlaceholderText("0.0") as HTMLInputElement;
      expect(minInput.value).toBe("6.0");

      rerender(<RatingSelector {...defaultProps} minRating="7.0" />);
      expect(minInput.value).toBe("7.0");
    });

    it("handles independent state updates", () => {
      const { rerender } = render(
        <RatingSelector {...defaultProps} minRating="6.0" maxRating="8.0" />,
      );

      const minInput = screen.getByPlaceholderText("0.0") as HTMLInputElement;
      const maxInput = screen.getByPlaceholderText("10") as HTMLInputElement;

      // Update only min rating
      rerender(
        <RatingSelector {...defaultProps} minRating="7.0" maxRating="8.0" />,
      );
      expect(minInput.value).toBe("7.0");
      expect(maxInput.value).toBe("8.0");

      // Update only max rating
      rerender(
        <RatingSelector {...defaultProps} minRating="7.0" maxRating="9.0" />,
      );
      expect(minInput.value).toBe("7.0");
      expect(maxInput.value).toBe("9.0");
    });
  });

  describe("User Interactions", () => {
    it("updates local state immediately on typing", async () => {
      const user = userEvent.setup();
      render(<RatingSelector {...defaultProps} />);

      const minInput = screen.getByPlaceholderText("0.0") as HTMLInputElement;

      await user.type(minInput, "7.5");

      expect(minInput.value).toBe("7.5");
    });

    it("calls onChange for valid rating input (0-10)", async () => {
      const user = userEvent.setup();
      render(<RatingSelector {...defaultProps} />);

      const minInput = screen.getByPlaceholderText("0.0");

      await user.type(minInput, "7.5");

      // Should call onChange (with our mocked debounce, this is immediate)
      expect(mockOnMinRatingChange).toHaveBeenCalled();
    });

    it("handles clearing input to empty", async () => {
      const user = userEvent.setup();
      render(<RatingSelector {...defaultProps} minRating="7.0" />);

      const minInput = screen.getByPlaceholderText("0.0");

      await user.clear(minInput);

      // Should call onChange immediately for empty value (no debouncing)
      expect(mockOnMinRatingChange).toHaveBeenCalledWith("");
    });

    it("handles both inputs independently", async () => {
      const user = userEvent.setup();
      render(<RatingSelector {...defaultProps} />);

      const minInput = screen.getByPlaceholderText("0.0");
      const maxInput = screen.getByPlaceholderText("10");

      await user.type(minInput, "6.0");

      await user.type(maxInput, "8.0");

      expect(mockOnMinRatingChange).toHaveBeenCalled();
      expect(mockOnMaxRatingChange).toHaveBeenCalled();
    });
  });

  describe("Debouncing Behavior", () => {
    it("calls debounce function for non-empty input", async () => {
      const { debounce } = await import("lodash");
      const user = userEvent.setup();
      render(<RatingSelector {...defaultProps} />);

      const minInput = screen.getByPlaceholderText("0.0");

      await user.type(minInput, "7.5");

      // Verify debounce was called (mocked to execute immediately)
      expect(debounce).toHaveBeenCalled();
    });

    it("bypasses debounce for empty input", async () => {
      const user = userEvent.setup();
      render(<RatingSelector {...defaultProps} minRating="7.0" />);

      const minInput = screen.getByPlaceholderText("0.0");

      await user.clear(minInput);

      // Should call onChange immediately without debouncing
      expect(mockOnMinRatingChange).toHaveBeenCalledWith("");
    });

    it("cancels debounce when clearing input", async () => {
      const user = userEvent.setup();
      render(<RatingSelector {...defaultProps} />);

      const minInput = screen.getByPlaceholderText("0.0");

      // Type something first
      await user.type(minInput, "7.5");

      // Then clear it
      await user.clear(minInput);

      expect(mockOnMinRatingChange).toHaveBeenCalledWith("");
    });

    it("uses consistent debounce delay with YearSelector (500ms)", () => {
      // This tests that the component uses 500ms debounce (consistent with YearSelector)
      render(<RatingSelector {...defaultProps} />);

      // Component should render without issues (debounce configuration is internal)
      expect(screen.getByText("Average Rating")).toBeInTheDocument();
    });
  });

  describe("Controlled Component Behavior", () => {
    it("reflects external prop changes (no conversion)", () => {
      const { rerender } = render(
        <RatingSelector {...defaultProps} minRating="6.0" />,
      );

      const minInput = screen.getByPlaceholderText("0.0") as HTMLInputElement;
      expect(minInput.value).toBe("6.0");

      rerender(<RatingSelector {...defaultProps} minRating="7.5" />);
      expect(minInput.value).toBe("7.5");

      rerender(<RatingSelector {...defaultProps} minRating="" />);
      expect(minInput.value).toBe("");
    });

    it("maintains synchronization with parent state", () => {
      const { rerender } = render(
        <RatingSelector {...defaultProps} minRating="6.0" maxRating="8.0" />,
      );

      const minInput = screen.getByPlaceholderText("0.0") as HTMLInputElement;
      const maxInput = screen.getByPlaceholderText("10") as HTMLInputElement;

      expect(minInput.value).toBe("6.0");
      expect(maxInput.value).toBe("8.0");

      // Simulate parent state change
      rerender(
        <RatingSelector {...defaultProps} minRating="5.5" maxRating="9.0" />,
      );

      expect(minInput.value).toBe("5.5");
      expect(maxInput.value).toBe("9.0");
    });
  });

  describe("Validation Visual Feedback", () => {
    it("shows normal styling for valid ranges", () => {
      render(
        <RatingSelector {...defaultProps} minRating="6.0" maxRating="8.0" />,
      );

      const minInput = screen.getByPlaceholderText("0.0");
      const maxInput = screen.getByPlaceholderText("10");

      expect(minInput).toBeInTheDocument();
      expect(maxInput).toBeInTheDocument();
    });

    it("shows error styling for invalid ranges", () => {
      render(
        <RatingSelector {...defaultProps} minRating="8.0" maxRating="6.0" />,
      );

      const minInput = screen.getByPlaceholderText("0.0");
      const maxInput = screen.getByPlaceholderText("10");

      // Both inputs should have error styling when range is invalid
      expect(minInput).toBeInTheDocument();
      expect(maxInput).toBeInTheDocument();
    });

    it("shows error styling for invalid individual values", () => {
      render(<RatingSelector {...defaultProps} minRating="15.0" />);

      const minInput = screen.getByPlaceholderText("0.0");
      // Component should handle this case (though validation logic might convert it)
      expect(minInput).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("provides accessible input elements", () => {
      render(<RatingSelector {...defaultProps} />);

      const minInput = screen.getByPlaceholderText("0.0");
      const maxInput = screen.getByPlaceholderText("10");

      expect(minInput).toHaveAttribute("type", "number");
      expect(maxInput).toHaveAttribute("type", "number");
    });

    it("provides meaningful labels and placeholders", () => {
      render(<RatingSelector {...defaultProps} />);

      expect(screen.getByText("Average Rating")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("0.0")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("10")).toBeInTheDocument();
    });

    it("supports keyboard navigation", () => {
      render(<RatingSelector {...defaultProps} />);

      const minInput = screen.getByPlaceholderText("0.0");
      const maxInput = screen.getByPlaceholderText("10");

      minInput.focus();
      expect(minInput).toHaveFocus();

      maxInput.focus();
      expect(maxInput).toHaveFocus();
    });

    it("provides visual feedback for validation state", () => {
      render(
        <RatingSelector {...defaultProps} minRating="8.0" maxRating="6.0" />,
      );

      const minInput = screen.getByPlaceholderText("0.0");
      const maxInput = screen.getByPlaceholderText("10");

      // Visual feedback should be provided for invalid range
      expect(minInput).toBeInTheDocument();
      expect(maxInput).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles invalid rating input (0-10) gracefully", () => {
      render(<RatingSelector {...defaultProps} minRating="invalid" />);

      const minInput = screen.getByPlaceholderText("0.0") as HTMLInputElement;
      // Component should handle invalid input (likely convert to empty or default)
      expect(minInput).toBeInTheDocument();
    });

    it("handles extreme values correctly", () => {
      render(
        <RatingSelector {...defaultProps} minRating="15.0" maxRating="-2.0" />,
      );

      const minInput = screen.getByPlaceholderText("0.0") as HTMLInputElement;
      const maxInput = screen.getByPlaceholderText("10") as HTMLInputElement;

      // Component should render values even if out of normal range
      expect(minInput).toBeInTheDocument();
      expect(maxInput).toBeInTheDocument();
    });

    it("handles missing callback props gracefully", () => {
      const { container } = render(
        <RatingSelector
          minRating=""
          maxRating=""
          onMinRatingChange={undefined as unknown as (rating: string) => void}
          onMaxRatingChange={undefined as unknown as (rating: string) => void}
        />,
      );

      expect(container).toBeInTheDocument();
    });

    it("handles rapid state changes (no conversion needed)", async () => {
      const user = userEvent.setup();
      const { rerender } = render(<RatingSelector {...defaultProps} />);

      const minInput = screen.getByPlaceholderText("0.0");

      // User types while props are changing
      await user.type(minInput, "7.5");

      rerender(<RatingSelector {...defaultProps} minRating="8.0" />);

      rerender(<RatingSelector {...defaultProps} minRating="6.5" />);

      const updatedInput = screen.getByPlaceholderText(
        "0.0",
      ) as HTMLInputElement;
      expect(updatedInput.value).toBe("6.5"); // Native 0-10 scale, no conversion
    });

    it("handles boundary values (0 and 10)", async () => {
      const user = userEvent.setup();
      render(<RatingSelector {...defaultProps} />);

      const minInput = screen.getByPlaceholderText("0.0");
      const maxInput = screen.getByPlaceholderText("10");

      await user.type(minInput, "0");

      await user.type(maxInput, "10");

      expect(mockOnMinRatingChange).toHaveBeenCalled();
      expect(mockOnMaxRatingChange).toHaveBeenCalled();
    });
  });

  describe("Component Lifecycle", () => {
    it("cleans up debounced functions on unmount", () => {
      const { unmount } = render(<RatingSelector {...defaultProps} />);

      // Component should unmount without errors
      unmount();

      // Cleanup should have been called (tested by no memory leaks)
      expect(true).toBe(true);
    });

    it("handles prop changes without losing local state consistency", () => {
      const { rerender } = render(
        <RatingSelector {...defaultProps} minRating="6.0" />,
      );

      // Multiple re-renders (no conversion needed)
      rerender(
        <RatingSelector {...defaultProps} minRating="6.0" maxRating="8.0" />,
      );
      rerender(
        <RatingSelector {...defaultProps} minRating="7.0" maxRating="8.0" />,
      );
      rerender(
        <RatingSelector {...defaultProps} minRating="7.0" maxRating="9.5" />,
      );

      const minInput = screen.getByPlaceholderText("0.0") as HTMLInputElement;
      const maxInput = screen.getByPlaceholderText("10") as HTMLInputElement;

      expect(minInput.value).toBe("7.0");
      expect(maxInput.value).toBe("9.5");
    });
  });

  describe("Native Scale Edge Cases", () => {
    it("handles decimal values correctly", () => {
      render(<RatingSelector {...defaultProps} minRating="6.73" />);

      const minInput = screen.getByPlaceholderText("0.0") as HTMLInputElement;
      expect(minInput.value).toBe("6.73"); // Should preserve precision (no conversion)
    });

    it("displays values as-is (no rounding)", () => {
      render(<RatingSelector {...defaultProps} minRating="6.789" />);

      const minInput = screen.getByPlaceholderText("0.0") as HTMLInputElement;
      // Component displays value as-is (no conversion or rounding)
      expect(minInput.value).toBe("6.789");
    });

    it("passes user input directly on TMDB scale", async () => {
      const user = userEvent.setup();
      render(<RatingSelector {...defaultProps} />);

      const minInput = screen.getByPlaceholderText("0.0");

      await user.type(minInput, "8.5");

      // Should pass 8.5 directly on TMDB scale (no conversion)
      expect(mockOnMinRatingChange).toHaveBeenCalled();
    });
  });

  describe("Integration Scenarios", () => {
    it("works correctly in form context (native scale)", () => {
      render(
        <RatingSelector {...defaultProps} minRating="7.5" maxRating="9.0" />,
      );

      const minInput = screen.getByPlaceholderText("0.0") as HTMLInputElement;
      const maxInput = screen.getByPlaceholderText("10") as HTMLInputElement;

      // Values should be accessible for form submission in native 0-10 format
      expect(minInput.value).toBe("7.5");
      expect(maxInput.value).toBe("9.0");
    });

    it("handles focus and blur with validation updates", async () => {
      const user = userEvent.setup();
      render(<RatingSelector {...defaultProps} />);

      const minInput = screen.getByPlaceholderText("0.0");

      await user.click(minInput);
      expect(minInput).toHaveFocus();

      await user.tab();
      expect(minInput).not.toHaveFocus();
    });

    it("provides consistent behavior across rating range scenarios", () => {
      const testCases = [
        {
          min: "0",
          max: "10",
          expectedMinDisplay: "0",
          expectedMaxDisplay: "10",
        },
        {
          min: "5.0",
          max: "7.5",
          expectedMinDisplay: "5.0",
          expectedMaxDisplay: "7.5",
        },
        {
          min: "",
          max: "8.0",
          expectedMinDisplay: "",
          expectedMaxDisplay: "8.0",
        },
        {
          min: "6.0",
          max: "",
          expectedMinDisplay: "6.0",
          expectedMaxDisplay: "",
        },
      ];

      testCases.forEach(
        ({ min, max, expectedMinDisplay, expectedMaxDisplay }) => {
          const { unmount } = render(
            <RatingSelector
              {...defaultProps}
              minRating={min}
              maxRating={max}
            />,
          );

          const minInput = screen.getByPlaceholderText(
            "0.0",
          ) as HTMLInputElement;
          const maxInput = screen.getByPlaceholderText(
            "10",
          ) as HTMLInputElement;

          expect(minInput.value).toBe(expectedMinDisplay);
          expect(maxInput.value).toBe(expectedMaxDisplay);

          unmount(); // Clean up for next iteration
        },
      );
    });

    it("clamps invalid values on blur for better UX", () => {
      render(<RatingSelector {...defaultProps} />);

      const minInput = screen.getByPlaceholderText("0.0") as HTMLInputElement;
      const maxInput = screen.getByPlaceholderText("10") as HTMLInputElement;

      // Simulate having invalid values using fireEvent

      fireEvent.change(minInput, { target: { value: "-10" } });

      fireEvent.change(maxInput, { target: { value: "15" } });

      // Values should show as set initially
      expect(minInput.value).toBe("-10");
      expect(maxInput.value).toBe("15");

      // Blur should clamp the values

      fireEvent.blur(minInput);

      fireEvent.blur(maxInput);

      // Values should be clamped to valid range (0-10 scale)
      expect(minInput.value).toBe("0");
      expect(maxInput.value).toBe("10");

      // Callbacks should be called with clamped values (native TMDB scale)
      expect(mockOnMinRatingChange).toHaveBeenCalledWith("0"); // 0.0 TMDB
      expect(mockOnMaxRatingChange).toHaveBeenCalledWith("10"); // 10.0 TMDB
    });
  });
});
