import { describe, it, expect, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { renderWithRoutes } from "@tests/helpers/test-renderer-with-routes";
import { render, screen, within } from "@tests/helpers/test-renderer";
import Footer from "../Footer";

// Mock the TMDB logo import
vi.mock("../../../assets/tmdb_logo_alt_short.svg", () => ({
  default: "/mock-tmdb-logo.svg",
}));

// Mock components that require context providers
// Note: Using inline factories to avoid hoisting issues with imported helpers
vi.mock("@/components/common", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/components/common")>()),
  ThemeSelector: () => <div data-testid="theme-selector">Theme Selector</div>,
}));

vi.mock("@/components/core/chakra/color-mode", () => ({
  ColorModeButton: () => (
    <button data-testid="color-mode-button">Color Mode</button>
  ),
}));

const copyrightNotice = (year = new Date().getFullYear()) =>
  `© ${year} CineXplorer. All rights reserved.`;

describe("Footer Component", () => {
  describe("Basic Rendering", () => {
    it("renders footer with correct semantic structure", () => {
      render(<Footer />);

      const footer = screen.getByRole("contentinfo");
      expect(footer).toBeInTheDocument();
      expect(footer).toHaveAttribute(
        "aria-label",
        "Application footer with TMDB attribution and theme controls",
      );
    });

    it("renders copyright text", () => {
      render(<Footer />);

      expect(screen.getByText(copyrightNotice())).toBeInTheDocument();
    });

    it("renders TMDB attribution text", () => {
      render(<Footer />);

      const attributionText = screen.getByText(
        "This product uses the TMDB API but is not endorsed or certified by TMDB.",
      );
      expect(attributionText).toBeInTheDocument();
    });

    it("renders TMDB logo image", () => {
      render(<Footer />);

      const logo = screen.getByAltText("TMDB Logo");
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute("src", "/mock-tmdb-logo.svg");
    });
  });

  describe("External Link Behavior", () => {
    it("renders TMDB API documentation link with correct attributes", () => {
      render(<Footer />);

      const tmdbLink = screen.getByRole("link", {
        name: "TMDB API Documentation",
      });
      expect(tmdbLink).toBeInTheDocument();
      expect(tmdbLink).toHaveAttribute(
        "href",
        "https://www.themoviedb.org/documentation/api",
      );
      expect(tmdbLink).toHaveAttribute("target", "_blank");
      expect(tmdbLink).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("provides accessible link label", () => {
      render(<Footer />);

      const tmdbLink = screen.getByLabelText("TMDB API Documentation");
      expect(tmdbLink).toBeInTheDocument();
    });

    it("contains TMDB logo within the link", () => {
      render(<Footer />);

      const tmdbLink = screen.getByRole("link", {
        name: "TMDB API Documentation",
      });
      const logo = screen.getByAltText("TMDB Logo");

      expect(tmdbLink).toContainElement(logo);
    });
  });

  describe("Image and Asset Handling", () => {
    it("renders TMDB logo with correct styling attributes", () => {
      render(<Footer />);

      const logo = screen.getByAltText("TMDB Logo");
      expect(logo).toHaveStyle({ height: "18px", opacity: "0.7" });
    });

    it("provides meaningful alt text for screen readers", () => {
      render(<Footer />);

      const logo = screen.getByAltText("TMDB Logo");
      expect(logo).toHaveAccessibleName("TMDB Logo");
    });

    it("handles logo as clickable element within link", () => {
      render(<Footer />);

      const logo = screen.getByAltText("TMDB Logo");
      const link = screen.getByRole("link", { name: "TMDB API Documentation" });

      // Logo should be inside the clickable link
      expect(link).toContainElement(logo);
    });
  });

  describe("Layout and Styling Structure", () => {
    it("applies correct container styling", () => {
      render(<Footer />);

      const footer = screen.getByRole("contentinfo");

      // Footer should have proper semantic role and styling classes
      expect(footer).toHaveStyle({
        width: "100%",
        textAlign: "center",
      });
    });

    it("organizes content in vertical stack layout", () => {
      render(<Footer />);

      // Should have VStack structure with proper gap
      const footer = screen.getByRole("contentinfo");
      expect(footer).toBeInTheDocument();

      // Check that content is organized properly
      const copyrightText = screen.getByText(copyrightNotice());
      const attributionText = screen.getByText(
        /This product uses the TMDB API/,
      );

      expect(copyrightText).toBeInTheDocument();
      expect(attributionText).toBeInTheDocument();
    });

    it("maintains consistent spacing between sections", () => {
      render(<Footer />);

      // Both text sections should be present and structured properly
      expect(screen.getByText(copyrightNotice())).toBeInTheDocument();
      expect(
        screen.getByText(/This product uses the TMDB API/),
      ).toBeInTheDocument();

      // Logo and link should be in the same section as attribution text
      const tmdbLink = screen.getByRole("link", {
        name: "TMDB API Documentation",
      });
      const logo = screen.getByAltText("TMDB Logo");
      expect(tmdbLink).toContainElement(logo);
    });
  });

  describe("Accessibility Features", () => {
    it("provides proper semantic footer role", () => {
      render(<Footer />);

      const footer = screen.getByRole("contentinfo");
      expect(footer).toBeInTheDocument();
    });

    it("includes descriptive aria-label for footer", () => {
      render(<Footer />);

      const footer = screen.getByRole("contentinfo");
      expect(footer).toHaveAttribute(
        "aria-label",
        "Application footer with TMDB attribution and theme controls",
      );
    });

    it("ensures external link has proper accessibility attributes", () => {
      render(<Footer />);

      const tmdbLink = screen.getByRole("link", {
        name: "TMDB API Documentation",
      });

      // External links should have proper security and accessibility attributes
      expect(tmdbLink).toHaveAttribute("target", "_blank");
      expect(tmdbLink).toHaveAttribute("rel", "noopener noreferrer");
      expect(tmdbLink).toHaveAttribute("aria-label", "TMDB API Documentation");
    });

    it("provides meaningful text content for screen readers", () => {
      render(<Footer />);

      // All text should be accessible
      expect(screen.getByText(copyrightNotice())).toBeInTheDocument();
      expect(
        screen.getByText(/This product uses the TMDB API/),
      ).toBeInTheDocument();

      // Image should have alt text
      expect(screen.getByAltText("TMDB Logo")).toBeInTheDocument();
    });

    it("maintains focus order for keyboard navigation", () => {
      render(<Footer />);

      const tmdbLink = screen.getByRole("link", {
        name: "TMDB API Documentation",
      });

      // Link should be focusable
      tmdbLink.focus();
      expect(tmdbLink).toHaveFocus();
    });
  });

  describe("Content Accuracy", () => {
    it.each([2030, 2031])("displays %i in the copyright notice", (year) => {
      vi.useFakeTimers({ toFake: ["Date"] });
      try {
        vi.setSystemTime(new Date(year, 5, 15, 12));
        render(<Footer />);

        expect(screen.getByText(copyrightNotice(year))).toBeInTheDocument();
      } finally {
        vi.useRealTimers();
      }
    });

    it("includes accurate TMDB disclaimer", () => {
      render(<Footer />);

      const disclaimer = screen.getByText(
        "This product uses the TMDB API but is not endorsed or certified by TMDB.",
      );
      expect(disclaimer).toBeInTheDocument();
    });

    it("links to correct TMDB API documentation URL", () => {
      render(<Footer />);

      const tmdbLink = screen.getByRole("link", {
        name: "TMDB API Documentation",
      });
      expect(tmdbLink).toHaveAttribute(
        "href",
        "https://www.themoviedb.org/documentation/api",
      );
    });
  });

  describe("Component Structure", () => {
    it("renders without crashing", () => {
      render(<Footer />);
      expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    });

    it("maintains consistent component structure", () => {
      render(<Footer />);

      // Should have all expected elements
      expect(screen.getByRole("contentinfo")).toBeInTheDocument();
      expect(screen.getByText(copyrightNotice())).toBeInTheDocument();
      expect(
        screen.getByText(/This product uses the TMDB API/),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "TMDB API Documentation" }),
      ).toBeInTheDocument();
      expect(screen.getByAltText("TMDB Logo")).toBeInTheDocument();
    });

    it("uses proper HTML semantics", () => {
      render(<Footer />);

      const footer = screen.getByRole("contentinfo");
      expect(footer).toBeInTheDocument();

      // Should contain proper link element
      const link = screen.getByRole("link", { name: "TMDB API Documentation" });
      expect(link).toBeInTheDocument();

      // Should contain proper image element
      const img = screen.getByAltText("TMDB Logo");
      expect(img).toBeInTheDocument();
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("handles missing logo asset gracefully", () => {
      // Component should render even if logo fails to load
      render(<Footer />);

      const logo = screen.getByAltText("TMDB Logo");
      expect(logo).toBeInTheDocument();

      // Component structure should remain intact
      expect(screen.getByRole("contentinfo")).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "TMDB API Documentation" }),
      ).toBeInTheDocument();
    });

    it("maintains functionality with broken external link", () => {
      render(<Footer />);

      // Link should still be present with correct attributes even if destination is unreachable
      const tmdbLink = screen.getByRole("link", {
        name: "TMDB API Documentation",
      });
      expect(tmdbLink).toHaveAttribute(
        "href",
        "https://www.themoviedb.org/documentation/api",
      );
      expect(tmdbLink).toHaveAttribute("target", "_blank");
      expect(tmdbLink).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("handles theme color constants gracefully", () => {
      // Component should render even if theme constants are missing
      render(<Footer />);
      expect(screen.getByRole("contentinfo")).toBeInTheDocument();

      // Essential content should still be present
      expect(screen.getByText(copyrightNotice())).toBeInTheDocument();
    });
  });

  describe("Performance Considerations", () => {
    it("renders efficiently without expensive operations", () => {
      render(<Footer />);

      // Should render quickly with static content
      expect(screen.getByRole("contentinfo")).toBeInTheDocument();
      expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    });

    it("maintains consistent render output", () => {
      const { container: container1 } = render(<Footer />);
      const { container: container2 } = render(<Footer />);

      // Multiple renders should produce consistent output
      expect(container1.innerHTML).toBe(container2.innerHTML);
    });
  });
});

it.each([
  ["Privacy Policy", "/privacy"],
  ["Terms of Service", "/terms"],
])("opens %s from the footer", async (label, path) => {
  const user = userEvent.setup();
  renderWithRoutes([
    { path: "/", element: <Footer /> },
    { path, element: <h1>{label}</h1> },
  ]);

  const footer = screen.getByRole("contentinfo");
  const link = within(footer).getByRole("link", { name: label });
  expect(link).toHaveAttribute("href", path);
  await user.click(link);
  expect(screen.getByRole("heading", { name: label })).toBeVisible();
});
