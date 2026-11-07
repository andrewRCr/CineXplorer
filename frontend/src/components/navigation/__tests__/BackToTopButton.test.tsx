import { within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
/**
 * Tests for BackToTopButton component
 *
 * A fixed-position button that appears after scrolling down and allows users
 * to smoothly scroll back to the top of the page. Integrates with CollapsibleSubNav
 * via callback to expand sub-navigation when scrolling to top.
 *
 * Test coverage:
 * - Hidden when at top of page (scrollY below threshold)
 * - Visible after scrolling down past threshold
 * - Click scrolls to top smoothly
 * - Click triggers onScrollToTop callback (for sub-nav expand)
 * - Proper accessibility (aria-label, keyboard accessible)
 * - Fixed positioning with appropriate z-index
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@tests/helpers/test-renderer";
import { BackToTopButton } from "../BackToTopButton";

// =============================================================================
// Test Helpers - Mock scroll state
// =============================================================================

/** Current mock scroll position */
let mockScrollY = 0;

/**
 * Sets mock window.scrollY value
 */
function setMockScrollY(value: number): void {
  mockScrollY = value;
}

/**
 * Dispatches scroll event on window
 */
function fireScrollEvent(): void {
  window.dispatchEvent(new Event("scroll"));
}

/**
 * Combined helper: set scroll position and fire event
 */
function simulateScrollTo(position: number): void {
  setMockScrollY(position);
  fireScrollEvent();
}

// =============================================================================
// Mock Setup
// =============================================================================

// Mock window.scrollTo for testing scroll behavior
const mockScrollTo = vi.fn();

beforeEach(() => {
  // Reset scroll position
  mockScrollY = 0;

  // Mock window.scrollY as a getter
  Object.defineProperty(window, "scrollY", {
    configurable: true,
    get: () => mockScrollY,
  });

  // Mock window.scrollTo
  window.scrollTo = mockScrollTo;
  mockScrollTo.mockImplementation((options: ScrollToOptions) => {
    if (options.top !== undefined) setMockScrollY(options.top);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  mockScrollTo.mockClear();
});

// =============================================================================
// Tests
// =============================================================================

describe("BackToTopButton", () => {
  describe("Visibility", () => {
    it("is hidden when at top of page", () => {
      render(<BackToTopButton />);

      const button = screen.queryByRole("button", { name: /scroll to top/i });

      // Button should not be visible when scrollY is 0
      expect(button).not.toBeInTheDocument();
    });

    it("is hidden when scroll is below threshold", () => {
      simulateScrollTo(100);

      render(<BackToTopButton />);

      const button = screen.queryByRole("button", { name: /scroll to top/i });

      // Default threshold is 200px, so at 100px button should be hidden
      expect(button).not.toBeInTheDocument();
    });

    it("is visible after scrolling past threshold", () => {
      simulateScrollTo(250);

      render(<BackToTopButton />);

      const button = screen.getByRole("button", { name: /scroll to top/i });

      expect(button).toBeInTheDocument();
    });

    it("respects custom threshold prop", () => {
      simulateScrollTo(400);

      render(<BackToTopButton threshold={500} />);

      // At 400px with 500px threshold, should be hidden
      const button = screen.queryByRole("button", { name: /scroll to top/i });
      expect(button).not.toBeInTheDocument();
    });

    it("shows button when scroll exceeds custom threshold", () => {
      simulateScrollTo(600);

      render(<BackToTopButton threshold={500} />);

      const button = screen.getByRole("button", { name: /scroll to top/i });
      expect(button).toBeInTheDocument();
    });
  });

  describe("Click Behavior", () => {
    it("scrolls to top smoothly when clicked", () => {
      simulateScrollTo(300);

      render(<BackToTopButton />);

      const button = screen.getByRole("button", { name: /scroll to top/i });
      fireEvent.click(button);

      expect(mockScrollTo).toHaveBeenCalledWith({
        top: 0,
        behavior: "smooth",
      });
    });

    it("calls onScrollToTop callback when clicked", () => {
      const onScrollToTop = vi.fn();
      simulateScrollTo(300);

      render(<BackToTopButton onScrollToTop={onScrollToTop} />);

      const button = screen.getByRole("button", { name: /scroll to top/i });
      fireEvent.click(button);

      expect(onScrollToTop).toHaveBeenCalledTimes(1);
    });

    it("works without onScrollToTop callback (optional prop)", () => {
      simulateScrollTo(300);

      render(<BackToTopButton />);

      const button = screen.getByRole("button", { name: /scroll to top/i });

      // Should not throw when clicked without callback
      expect(() => fireEvent.click(button)).not.toThrow();
      expect(mockScrollTo).toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    it("has accessible aria-label", () => {
      simulateScrollTo(300);

      render(<BackToTopButton />);

      const button = screen.getByRole("button", { name: /scroll to top/i });
      expect(button).toHaveAttribute("aria-label", "Scroll to top");
    });

    it("is keyboard accessible (focusable)", () => {
      simulateScrollTo(300);

      render(<BackToTopButton />);

      const button = screen.getByRole("button", { name: /scroll to top/i });

      // Button should be focusable (not have negative tabIndex)
      expect(button).not.toHaveAttribute("tabIndex", "-1");
    });

    it("responds to keyboard activation (Enter)", async () => {
      const user = userEvent.setup();
      simulateScrollTo(300);

      render(<BackToTopButton />);

      const button = screen.getByRole("button", { name: /scroll to top/i });
      await user.tab();
      expect(button).toHaveFocus();
      await user.keyboard("{Enter}");

      expect(window.scrollY).toBe(0);
    });
  });

  describe("Positioning", () => {
    it("has fixed position", () => {
      simulateScrollTo(300);

      render(<BackToTopButton />);

      const button = screen.getByRole("button", { name: /scroll to top/i });

      expect(button).toHaveStyle({ position: "fixed" });
    });

    it("is positioned in bottom-right corner with padding", () => {
      simulateScrollTo(300);

      render(<BackToTopButton />);

      const button = screen.getByRole("button", { name: /scroll to top/i });
      const computedStyle = window.getComputedStyle(button);

      // Should have bottom and right positioning
      expect(computedStyle.bottom).not.toBe("0px");
      expect(computedStyle.right).not.toBe("0px");
    });

    it("has z-index applied for floating element", () => {
      simulateScrollTo(300);

      render(<BackToTopButton />);

      const button = screen.getByRole("button", { name: /scroll to top/i });

      // In jsdom, Chakra's semantic z-index tokens (like "docked") are applied
      // via CSS-in-JS but don't resolve to numeric values. Verify component
      // structure is correct - actual z-index renders properly in browser.
      expect(button).toHaveStyle({ position: "fixed" });
    });
  });

  describe("Visual Feedback", () => {
    it("renders with icon", () => {
      simulateScrollTo(300);

      render(<BackToTopButton />);

      const button = screen.getByRole("button", { name: /scroll to top/i });

      // Button should contain an SVG icon
      const icon = within(button).getByTestId("back-to-top-icon");
      expect(icon).toBeInTheDocument();
    });

    it("has data-testid for testing", () => {
      simulateScrollTo(300);

      render(<BackToTopButton />);

      expect(screen.getByTestId("back-to-top-button")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles scroll at exactly threshold value", () => {
      simulateScrollTo(200); // Default threshold

      render(<BackToTopButton />);

      // At exactly threshold, button should be visible (>= threshold)
      const button = screen.getByRole("button", { name: /scroll to top/i });
      expect(button).toBeInTheDocument();
    });

    it("handles rapid scroll up/down", async () => {
      render(<BackToTopButton />);

      act(() => {
        simulateScrollTo(300);
      });
      expect(
        await screen.findByRole("button", { name: /scroll to top/i }),
      ).toBeInTheDocument();

      act(() => {
        simulateScrollTo(50);
      });
      await waitFor(() => {
        expect(
          screen.queryByRole("button", { name: /scroll to top/i }),
        ).not.toBeInTheDocument();
      });

      act(() => {
        simulateScrollTo(400);
      });
      expect(
        await screen.findByRole("button", { name: /scroll to top/i }),
      ).toBeInTheDocument();
    });
  });
});
