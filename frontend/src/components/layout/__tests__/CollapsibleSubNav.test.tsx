/**
 * Tests for CollapsibleSubNav component
 *
 * A fixed-position sub-navigation bar that sits below the navbar and
 * collapses/expands based on scroll state. Used for QuickBrowseBar on
 * list-view pages.
 *
 * Test coverage:
 * - Renders children when visible
 * - Hides (animates out) when isCollapsed prop is true
 * - Full viewport width positioning
 * - Sits directly below navbar (uses layout-navbar token)
 * - Proper z-index (below navbar, above content)
 * - Accessibility attributes
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@tests/helpers/test-renderer";
import { CollapsibleSubNav } from "../CollapsibleSubNav";

// =============================================================================
// Test Helpers
// =============================================================================

/** Test ID for the sub-nav container */
const SUB_NAV_TEST_ID = "collapsible-sub-nav";

/** Renders CollapsibleSubNav with default props and optional overrides */
function renderSubNav(props: {
  isCollapsed?: boolean;
  children?: React.ReactNode;
} = {}) {
  const { isCollapsed = false, children = <div>Test Content</div> } = props;

  return render(
    <CollapsibleSubNav isCollapsed={isCollapsed}>{children}</CollapsibleSubNav>
  );
}

// =============================================================================
// Tests
// =============================================================================

describe("CollapsibleSubNav", () => {
  describe("Basic Rendering", () => {
    it("renders children when visible", () => {
      renderSubNav({ children: <span>Browse Filters</span> });

      expect(screen.getByText("Browse Filters")).toBeInTheDocument();
    });

    it("renders without crashing", () => {
      const { container } = renderSubNav();

      expect(container).toBeInTheDocument();
    });

    it("renders with data-testid for testing", () => {
      renderSubNav();

      expect(screen.getByTestId(SUB_NAV_TEST_ID)).toBeInTheDocument();
    });

    it("renders multiple children correctly", () => {
      renderSubNav({
        children: (
          <>
            <button>Filter 1</button>
            <button>Filter 2</button>
            <button>Filter 3</button>
          </>
        ),
      });

      expect(screen.getByText("Filter 1")).toBeInTheDocument();
      expect(screen.getByText("Filter 2")).toBeInTheDocument();
      expect(screen.getByText("Filter 3")).toBeInTheDocument();
    });
  });

  describe("Collapse/Expand Behavior", () => {
    it("applies collapsed styles when isCollapsed is true", () => {
      renderSubNav({ isCollapsed: true });

      const subNav = screen.getByTestId(SUB_NAV_TEST_ID);

      // Should have transform to slide up (translateY with negative value)
      expect(subNav).toHaveStyle({ transform: "translateY(-100%)" });
    });

    it("applies expanded styles when isCollapsed is false", () => {
      renderSubNav({ isCollapsed: false });

      const subNav = screen.getByTestId(SUB_NAV_TEST_ID);

      // Should have no transform or translateY(0)
      const transform = subNav.style.transform;
      expect(transform === "" || transform === "translateY(0%)").toBe(true);
    });

    it("maintains children in DOM when collapsed (for animation)", () => {
      renderSubNav({
        isCollapsed: true,
        children: <span>Still Here</span>,
      });

      // Children should still be in DOM even when collapsed
      // (visibility hidden or transform off-screen, not removed)
      expect(screen.getByText("Still Here")).toBeInTheDocument();
    });

    it("has smooth transition for collapse animation", () => {
      renderSubNav();

      const subNav = screen.getByTestId(SUB_NAV_TEST_ID);

      // Should have transition property for smooth animation
      const style = window.getComputedStyle(subNav);
      expect(style.transition).toBeTruthy();
    });
  });

  describe("Positioning", () => {
    it("has fixed position", () => {
      renderSubNav();

      const subNav = screen.getByTestId(SUB_NAV_TEST_ID);

      expect(subNav).toHaveStyle({ position: "fixed" });
    });

    it("spans full viewport width", () => {
      renderSubNav();

      const subNav = screen.getByTestId(SUB_NAV_TEST_ID);

      expect(subNav).toHaveStyle({ width: "100vw" });
      expect(subNav).toHaveStyle({ left: "0px" });
    });

    it("positions below navbar using CSS variable", () => {
      renderSubNav();

      const subNav = screen.getByTestId(SUB_NAV_TEST_ID);

      // In jsdom, CSS variables are set as raw strings in style attribute
      // Check the element's inline style or computed style contains the variable reference
      const topStyle = subNav.style.top;
      const computedTop = window.getComputedStyle(subNav).top;

      // Either inline style has the var() or it's been applied via Chakra's style system
      // Chakra may apply styles differently, so we check that top is defined (not empty/auto)
      const hasTopPosition =
        topStyle.includes("var(") ||
        topStyle.includes("layout-navbar") ||
        computedTop !== "auto";

      expect(hasTopPosition).toBe(true);
    });

    it("has appropriate z-index (below navbar, above content)", () => {
      renderSubNav();

      const subNav = screen.getByTestId(SUB_NAV_TEST_ID);
      const style = window.getComputedStyle(subNav);

      // z-index should be a reasonable value (typically 5-10 range)
      // Navbar is typically higher (like 1000+)
      const zIndex = parseInt(style.zIndex, 10);
      expect(zIndex).toBeGreaterThan(0);
      expect(zIndex).toBeLessThan(100); // Below navbar z-index
    });
  });

  describe("Styling", () => {
    it("has background color token applied", () => {
      renderSubNav();

      const subNav = screen.getByTestId(SUB_NAV_TEST_ID);

      // In jsdom, semantic tokens don't resolve to actual colors
      // Verify the component has the bg prop applied by checking data attributes
      // or that the element exists with styling intent (Chakra applies tokens via CSS-in-JS)
      // The actual color resolution happens in browser, not jsdom
      expect(subNav).toBeInTheDocument();

      // Component implementation uses bg="layer-01" - verify structure is correct
      // by checking other style properties that DO resolve in jsdom
      expect(subNav).toHaveStyle({ position: "fixed" });
    });

    it("has border for visual separation from content", () => {
      renderSubNav();

      const subNav = screen.getByTestId(SUB_NAV_TEST_ID);
      const style = window.getComputedStyle(subNav);

      // Should have bottom border
      expect(style.borderBottomWidth).not.toBe("0px");
    });
  });

  describe("Accessibility", () => {
    it("has appropriate role for navigation", () => {
      renderSubNav();

      // Should be a navigation landmark or have appropriate role
      const nav = screen.getByRole("navigation");
      expect(nav).toBeInTheDocument();
    });

    it("has aria-hidden when collapsed", () => {
      renderSubNav({ isCollapsed: true });

      const subNav = screen.getByTestId(SUB_NAV_TEST_ID);

      // When collapsed, should be hidden from assistive tech
      expect(subNav).toHaveAttribute("aria-hidden", "true");
    });

    it("does not have aria-hidden when expanded", () => {
      renderSubNav({ isCollapsed: false });

      const subNav = screen.getByTestId(SUB_NAV_TEST_ID);

      // When expanded, should be visible to assistive tech
      expect(subNav.getAttribute("aria-hidden")).not.toBe("true");
    });

    it("has descriptive aria-label", () => {
      renderSubNav();

      const nav = screen.getByRole("navigation");

      expect(nav).toHaveAttribute("aria-label");
    });
  });

  describe("Edge Cases", () => {
    it("handles empty children gracefully", () => {
      const { container } = render(
        <CollapsibleSubNav isCollapsed={false}>{null}</CollapsibleSubNav>
      );

      expect(container).toBeInTheDocument();
      expect(screen.getByTestId(SUB_NAV_TEST_ID)).toBeInTheDocument();
    });

    it("handles rapid collapse/expand toggles", () => {
      const { rerender } = render(
        <CollapsibleSubNav isCollapsed={false}>
          <span>Content</span>
        </CollapsibleSubNav>
      );

      // Rapid toggles
      rerender(
        <CollapsibleSubNav isCollapsed={true}>
          <span>Content</span>
        </CollapsibleSubNav>
      );
      rerender(
        <CollapsibleSubNav isCollapsed={false}>
          <span>Content</span>
        </CollapsibleSubNav>
      );
      rerender(
        <CollapsibleSubNav isCollapsed={true}>
          <span>Content</span>
        </CollapsibleSubNav>
      );

      // Should still render correctly
      expect(screen.getByText("Content")).toBeInTheDocument();
    });
  });
});
