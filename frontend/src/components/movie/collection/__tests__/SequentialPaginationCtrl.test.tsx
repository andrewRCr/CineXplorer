/**
 * Tests for SequentialPaginationCtrl component
 *
 * A simple prev/next pagination control without page numbers or random access.
 * Used as alternative to infinite scroll for A/B comparison testing.
 *
 * Test coverage:
 * - Prev button disabled state (first page / no previous)
 * - Next button disabled state (last page / no next)
 * - Click handlers fire correctly
 * - Loading state disables both buttons
 * - Accessibility (aria-labels, keyboard navigation)
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@tests/helpers/test-renderer";
import { SequentialPaginationCtrl } from "../SequentialPaginationCtrl";

describe("SequentialPaginationCtrl", () => {
  const defaultProps = {
    hasPrev: true,
    hasNext: true,
    onPrev: vi.fn(),
    onNext: vi.fn(),
  };

  describe("Button States", () => {
    it("disables prev button when hasPrev is false", () => {
      render(<SequentialPaginationCtrl {...defaultProps} hasPrev={false} />);

      const prevButton = screen.getByRole("button", { name: /previous/i });
      expect(prevButton).toBeDisabled();
    });

    it("enables prev button when hasPrev is true", () => {
      render(<SequentialPaginationCtrl {...defaultProps} hasPrev={true} />);

      const prevButton = screen.getByRole("button", { name: /previous/i });
      expect(prevButton).not.toBeDisabled();
    });

    it("disables next button when hasNext is false", () => {
      render(<SequentialPaginationCtrl {...defaultProps} hasNext={false} />);

      const nextButton = screen.getByRole("button", { name: /next/i });
      expect(nextButton).toBeDisabled();
    });

    it("enables next button when hasNext is true", () => {
      render(<SequentialPaginationCtrl {...defaultProps} hasNext={true} />);

      const nextButton = screen.getByRole("button", { name: /next/i });
      expect(nextButton).not.toBeDisabled();
    });

    it("disables both buttons when isLoading is true", () => {
      render(
        <SequentialPaginationCtrl
          {...defaultProps}
          hasPrev={true}
          hasNext={true}
          isLoading={true}
        />,
      );

      const prevButton = screen.getByRole("button", { name: /previous/i });
      const nextButton = screen.getByRole("button", { name: /next/i });

      expect(prevButton).toBeDisabled();
      expect(nextButton).toBeDisabled();
    });
  });

  describe("Click Handlers", () => {
    it("calls onPrev when prev button is clicked", () => {
      const onPrev = vi.fn();
      render(<SequentialPaginationCtrl {...defaultProps} onPrev={onPrev} />);

      const prevButton = screen.getByRole("button", { name: /previous/i });
      fireEvent.click(prevButton);

      expect(onPrev).toHaveBeenCalledTimes(1);
    });

    it("calls onNext when next button is clicked", () => {
      const onNext = vi.fn();
      render(<SequentialPaginationCtrl {...defaultProps} onNext={onNext} />);

      const nextButton = screen.getByRole("button", { name: /next/i });
      fireEvent.click(nextButton);

      expect(onNext).toHaveBeenCalledTimes(1);
    });

    it("does not call onPrev when prev button is disabled", () => {
      const onPrev = vi.fn();
      render(
        <SequentialPaginationCtrl
          {...defaultProps}
          hasPrev={false}
          onPrev={onPrev}
        />,
      );

      const prevButton = screen.getByRole("button", { name: /previous/i });
      fireEvent.click(prevButton);

      expect(onPrev).not.toHaveBeenCalled();
    });

    it("does not call onNext when next button is disabled", () => {
      const onNext = vi.fn();
      render(
        <SequentialPaginationCtrl
          {...defaultProps}
          hasNext={false}
          onNext={onNext}
        />,
      );

      const nextButton = screen.getByRole("button", { name: /next/i });
      fireEvent.click(nextButton);

      expect(onNext).not.toHaveBeenCalled();
    });

    it("does not call handlers when loading", () => {
      const onPrev = vi.fn();
      const onNext = vi.fn();
      render(
        <SequentialPaginationCtrl
          {...defaultProps}
          onPrev={onPrev}
          onNext={onNext}
          isLoading={true}
        />,
      );

      const prevButton = screen.getByRole("button", { name: /previous/i });
      const nextButton = screen.getByRole("button", { name: /next/i });

      fireEvent.click(prevButton);
      fireEvent.click(nextButton);

      expect(onPrev).not.toHaveBeenCalled();
      expect(onNext).not.toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    it("has accessible aria-labels on buttons", () => {
      render(<SequentialPaginationCtrl {...defaultProps} />);

      expect(
        screen.getByRole("button", { name: /previous/i }),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
    });

    it("has navigation role on container", () => {
      render(<SequentialPaginationCtrl {...defaultProps} />);

      expect(screen.getByRole("navigation")).toBeInTheDocument();
    });

    it("has aria-label on navigation container", () => {
      render(<SequentialPaginationCtrl {...defaultProps} />);

      const nav = screen.getByRole("navigation");
      expect(nav).toHaveAttribute("aria-label", "Pagination");
    });

    it("buttons are keyboard accessible", () => {
      const onPrev = vi.fn();
      const onNext = vi.fn();
      render(
        <SequentialPaginationCtrl
          {...defaultProps}
          onPrev={onPrev}
          onNext={onNext}
        />,
      );

      const prevButton = screen.getByRole("button", { name: /previous/i });
      const nextButton = screen.getByRole("button", { name: /next/i });

      // Buttons should be focusable
      expect(prevButton).not.toHaveAttribute("tabIndex", "-1");
      expect(nextButton).not.toHaveAttribute("tabIndex", "-1");
    });
  });

  describe("Visual Elements", () => {
    it("renders prev and next icons", () => {
      render(<SequentialPaginationCtrl {...defaultProps} />);

      const prevButton = screen.getByRole("button", { name: /previous/i });
      const nextButton = screen.getByRole("button", { name: /next/i });

      // Both buttons should contain SVG icons
      expect(prevButton.querySelector("svg")).toBeInTheDocument();
      expect(nextButton.querySelector("svg")).toBeInTheDocument();
    });

    it("has data-testid for testing", () => {
      render(<SequentialPaginationCtrl {...defaultProps} />);

      expect(
        screen.getByTestId("sequential-pagination-ctrl"),
      ).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles both buttons disabled (single page)", () => {
      render(
        <SequentialPaginationCtrl
          {...defaultProps}
          hasPrev={false}
          hasNext={false}
        />,
      );

      const prevButton = screen.getByRole("button", { name: /previous/i });
      const nextButton = screen.getByRole("button", { name: /next/i });

      expect(prevButton).toBeDisabled();
      expect(nextButton).toBeDisabled();
    });

    it("renders correctly with minimal props", () => {
      const onPrev = vi.fn();
      const onNext = vi.fn();

      // Only required props
      render(
        <SequentialPaginationCtrl
          hasPrev={false}
          hasNext={true}
          onPrev={onPrev}
          onNext={onNext}
        />,
      );

      expect(
        screen.getByTestId("sequential-pagination-ctrl"),
      ).toBeInTheDocument();
    });
  });
});
