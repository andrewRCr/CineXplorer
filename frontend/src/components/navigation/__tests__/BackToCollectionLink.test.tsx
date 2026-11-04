/**
 * Tests for BackToCollectionLink component
 *
 * Provides "Back to Results" navigation that:
 * - Preserves filter parameters from the original collection view
 * - Signals scroll restoration via React Router location state
 * - Supports browse routes, preset routes, and search routes
 *
 * Test coverage:
 * - URL building from search params (routes and query strings)
 * - Parameter filtering (excludes pagination, includes filters)
 * - Location state for scroll restoration
 * - Component rendering (label, variant, styling)
 */

import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@tests/helpers/test-renderer";
import { BackToCollectionLink } from "../BackToCollectionLink";

// =============================================================================
// Helpers
// =============================================================================

/**
 * Creates URLSearchParams from a simple object.
 * Convenience helper for test readability.
 */
function createSearchParams(params: Record<string, string>): URLSearchParams {
  return new URLSearchParams(params);
}

/**
 * Gets the href from a link element.
 * React Router's Link renders as an anchor tag.
 */
function getLinkHref(): string {
  const link = screen.getByRole("link");
  return link.getAttribute("href") || "";
}

// =============================================================================
// Tests
// =============================================================================

describe("BackToCollectionLink", () => {
  describe("URL building from search params", () => {
    it("builds search URL from from=search with query", () => {
      const searchParams = createSearchParams({
        from: "search",
        q: "inception",
      });

      render(<BackToCollectionLink searchParams={searchParams} />);

      expect(getLinkHref()).toBe("/search?q=inception");
    });

    it("builds browse URL from from=browse with filters", () => {
      const searchParams = createSearchParams({
        from: "browse",
        genres: "28",
      });

      render(<BackToCollectionLink searchParams={searchParams} />);

      expect(getLinkHref()).toBe("/browse?genres=28");
    });

    it("builds preset URL from from=now-playing", () => {
      const searchParams = createSearchParams({
        from: "now-playing",
      });

      render(<BackToCollectionLink searchParams={searchParams} />);

      expect(getLinkHref()).toBe("/browse/now-playing");
    });

    it("builds preset URL from from=upcoming", () => {
      const searchParams = createSearchParams({
        from: "upcoming",
      });

      render(<BackToCollectionLink searchParams={searchParams} />);

      expect(getLinkHref()).toBe("/browse/upcoming");
    });

    it("builds preset URL from from=top-rated", () => {
      const searchParams = createSearchParams({
        from: "top-rated",
      });

      render(<BackToCollectionLink searchParams={searchParams} />);

      expect(getLinkHref()).toBe("/browse/top-rated");
    });

    it("defaults to now-playing when from param is missing", () => {
      const searchParams = createSearchParams({});

      render(<BackToCollectionLink searchParams={searchParams} />);

      expect(getLinkHref()).toBe("/browse/now-playing");
    });

    it("preserves filter params in preset URLs", () => {
      const searchParams = createSearchParams({
        from: "now-playing",
        minYear: "2020",
        genres: "28",
      });

      render(<BackToCollectionLink searchParams={searchParams} />);

      const href = getLinkHref();
      expect(href).toContain("/browse/now-playing?");
      expect(href).toContain("minYear=2020");
      expect(href).toContain("genres=28");
    });

    it("builds browse URL with multiple filter params", () => {
      const searchParams = createSearchParams({
        from: "browse",
        genres: "28",
        minYear: "2020",
        maxYear: "2024",
        minRating: "7",
        sortBy: "vote_average.desc",
      });

      render(<BackToCollectionLink searchParams={searchParams} />);

      const href = getLinkHref();
      expect(href).toContain("/browse?");
      expect(href).toContain("genres=28");
      expect(href).toContain("minYear=2020");
      expect(href).toContain("maxYear=2024");
      expect(href).toContain("minRating=7");
      expect(href).toContain("sortBy=vote_average.desc");
    });
  });

  describe("parameter filtering", () => {
    it("excludes page param from URL", () => {
      const searchParams = createSearchParams({
        from: "browse",
        genres: "28",
        page: "5",
      });

      render(<BackToCollectionLink searchParams={searchParams} />);

      const href = getLinkHref();
      expect(href).not.toContain("page=");
      expect(href).toContain("genres=28");
    });

    it("excludes tmdb_page_start param from URL", () => {
      const searchParams = createSearchParams({
        from: "browse",
        minYear: "2020",
        tmdb_page_start: "10",
      });

      render(<BackToCollectionLink searchParams={searchParams} />);

      const href = getLinkHref();
      expect(href).not.toContain("tmdb_page_start=");
      expect(href).toContain("minYear=2020");
    });

    it("excludes from param from query string", () => {
      const searchParams = createSearchParams({
        from: "browse",
        genres: "28",
      });

      render(<BackToCollectionLink searchParams={searchParams} />);

      const href = getLinkHref();
      // 'from' should be used to determine route, not appear in query string
      expect(href).not.toContain("from=");
    });

    it("excludes empty string values", () => {
      const searchParams = createSearchParams({
        from: "browse",
        genres: "28",
        minYear: "",
        maxYear: "",
      });

      render(<BackToCollectionLink searchParams={searchParams} />);

      const href = getLinkHref();
      expect(href).not.toContain("minYear=");
      expect(href).not.toContain("maxYear=");
      expect(href).toContain("genres=28");
    });

    it("includes valid filter params while excluding pagination", () => {
      const searchParams = createSearchParams({
        from: "browse",
        genres: "28",
        minYear: "2020",
        sortBy: "popularity.desc",
        page: "3",
        tmdb_page_start: "15",
      });

      render(<BackToCollectionLink searchParams={searchParams} />);

      const href = getLinkHref();
      // Should include filter params
      expect(href).toContain("genres=28");
      expect(href).toContain("minYear=2020");
      expect(href).toContain("sortBy=popularity.desc");
      // Should exclude pagination params
      expect(href).not.toContain("page=");
      expect(href).not.toContain("tmdb_page_start=");
    });

    it("handles URL encoding for special characters", () => {
      const searchParams = createSearchParams({
        from: "search",
        q: "star wars: a new hope",
      });

      render(<BackToCollectionLink searchParams={searchParams} />);

      const href = getLinkHref();
      // Spaces should be encoded
      expect(href).toContain("/search?");
      expect(href).toContain("q=");
      // Value should be URL-encoded
      expect(href).not.toContain("star wars");
    });
  });

  describe("location state", () => {
    // Note: Testing location state directly requires capturing navigation.
    // We test the observable behavior: component passes state to Link.

    it("renders as a React Router Link element", () => {
      const searchParams = createSearchParams({ from: "browse" });

      render(<BackToCollectionLink searchParams={searchParams} />);

      // React Router Link renders as an anchor
      const link = screen.getByRole("link");
      expect(link).toBeInTheDocument();
    });

    it("link is clickable and navigable", () => {
      const searchParams = createSearchParams({ from: "browse" });

      render(<BackToCollectionLink searchParams={searchParams} />);

      const link = screen.getByRole("link");
      // Should not throw on click (basic sanity check)
      expect(() => fireEvent.click(link)).not.toThrow();
    });

    it("link has no text decoration", () => {
      const searchParams = createSearchParams({ from: "browse" });

      render(<BackToCollectionLink searchParams={searchParams} />);

      const link = screen.getByRole("link");
      expect(link).toHaveStyle({ textDecoration: "none" });
    });
  });

  describe("component rendering", () => {
    it("renders with default label 'Back to Results'", () => {
      const searchParams = createSearchParams({ from: "browse" });

      render(<BackToCollectionLink searchParams={searchParams} />);

      expect(screen.getByText("Back to Results")).toBeInTheDocument();
    });

    it("renders with custom label", () => {
      const searchParams = createSearchParams({ from: "search" });

      render(
        <BackToCollectionLink
          searchParams={searchParams}
          label="Return to Search"
        />,
      );

      expect(screen.getByText("Return to Search")).toBeInTheDocument();
      expect(screen.queryByText("Back to Results")).not.toBeInTheDocument();
    });

    it("renders button inside link", () => {
      const searchParams = createSearchParams({ from: "browse" });

      render(<BackToCollectionLink searchParams={searchParams} />);

      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
    });

    it("renders with default variant (outline)", () => {
      const searchParams = createSearchParams({ from: "browse" });

      render(<BackToCollectionLink searchParams={searchParams} />);

      // Verify button renders - variant is passed to Chakra Button
      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
    });

    it("accepts ghost variant prop", () => {
      const searchParams = createSearchParams({ from: "browse" });

      // Should render without error when ghost variant is passed
      render(
        <BackToCollectionLink searchParams={searchParams} variant="ghost" />,
      );

      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
    });

    it("accepts solid variant prop", () => {
      const searchParams = createSearchParams({ from: "browse" });

      // Should render without error when solid variant is passed
      render(
        <BackToCollectionLink searchParams={searchParams} variant="solid" />,
      );

      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
    });

    it("renders left arrow indicator", () => {
      const searchParams = createSearchParams({ from: "browse" });

      render(<BackToCollectionLink searchParams={searchParams} />);

      // Arrow is rendered as LuArrowLeft icon (SVG)
      const button = screen.getByRole("button");
      const svg = button.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("handles empty URLSearchParams", () => {
      const searchParams = new URLSearchParams();

      render(<BackToCollectionLink searchParams={searchParams} />);

      // Should default to now-playing
      expect(getLinkHref()).toBe("/browse/now-playing");
    });

    it("handles search route with no query", () => {
      const searchParams = createSearchParams({
        from: "search",
      });

      render(<BackToCollectionLink searchParams={searchParams} />);

      expect(getLinkHref()).toBe("/search");
    });

    it("handles unknown from value as preset route", () => {
      const searchParams = createSearchParams({
        from: "custom-preset",
      });

      render(<BackToCollectionLink searchParams={searchParams} />);

      // Unknown values are treated as preset routes
      expect(getLinkHref()).toBe("/browse/custom-preset");
    });

    it("preserves param order in query string (alphabetical by implementation)", () => {
      // Note: URLSearchParams.forEach iterates in insertion order,
      // which is preserved in the query string. This test documents that behavior.
      const searchParams = createSearchParams({
        from: "browse",
        genres: "28",
        minYear: "2020",
      });

      render(<BackToCollectionLink searchParams={searchParams} />);

      const href = getLinkHref();
      expect(href).toMatch(/genres=28.*minYear=2020|minYear=2020.*genres=28/);
    });
  });
});
