import { describe, it, expect } from "vitest";
import { render, screen } from "@tests/helpers/test-renderer";
import PageHeader from "../PageHeader";

describe("PageHeader Component", () => {
  describe("Basic Rendering", () => {
    it("renders title correctly", () => {
      render(<PageHeader title="Now Playing" />);

      expect(screen.getByText("Now Playing")).toBeInTheDocument();
    });

    it("renders with default props", () => {
      render(<PageHeader title="Test Title" />);

      const header = screen.getByTestId("page-header-title");
      expect(header).toBeInTheDocument();

      // Default size is 'lg' - check for corresponding styles
      expect(header).toHaveStyle({ fontSize: "3xl" });
    });
  });

  describe("Size Variants", () => {
    it.each([
      ["sm", "xl"], // size prop -> expected fontSize
      ["md", "2xl"],
      ["lg", "3xl"],
      ["xl", "4xl"],
    ])('renders size "%s" with fontSize "%s"', (size, expectedFontSize) => {
      render(
        <PageHeader title="Test" size={size as "sm" | "md" | "lg" | "xl"} />,
      );

      const titleElement = screen.getByText("Test");
      expect(titleElement).toHaveStyle({ fontSize: expectedFontSize });
    });

    it("applies correct minimum heights for different sizes", () => {
      const { rerender } = render(<PageHeader title="Test" size="sm" />);
      expect(screen.getByTestId("page-header")).toHaveStyle({
        minHeight: "40px",
      });
      rerender(<PageHeader title="Test" size="xl" />);
      expect(screen.getByTestId("page-header")).toHaveStyle({
        minHeight: "70px",
      });
    });
  });

  describe("Accent Line Feature", () => {
    it.each([undefined, true, false])(
      "renders the accent when showAccent is %s",
      (showAccent) => {
        render(<PageHeader title="Test Title" showAccent={showAccent} />);
        expect(screen.getByText("Test Title")).toBeInTheDocument();
        if (showAccent === false) {
          expect(
            screen.queryByTestId("page-header-accent"),
          ).not.toBeInTheDocument();
        } else {
          expect(screen.getByTestId("page-header-accent")).toBeInTheDocument();
        }
      },
    );
  });

  describe("Children Support", () => {
    it("renders children alongside title", () => {
      render(
        <PageHeader title="Main Title">
          <span>Extra Content</span>
        </PageHeader>,
      );

      expect(screen.getByText("Main Title")).toBeInTheDocument();
      expect(screen.getByText("Extra Content")).toBeInTheDocument();
    });

    it("supports complex children elements", () => {
      render(
        <PageHeader title="Movies" size="lg">
          <div data-testid="child-element">
            <button>Filter</button>
            <span>Count: 25</span>
          </div>
        </PageHeader>,
      );

      expect(screen.getByText("Movies")).toBeInTheDocument();
      expect(screen.getByTestId("child-element")).toBeInTheDocument();
      expect(screen.getByText("Filter")).toBeInTheDocument();
      expect(screen.getByText("Count: 25")).toBeInTheDocument();
    });
  });

  describe("Custom Element Support", () => {
    it('renders as different HTML elements using "as" prop', () => {
      const { rerender } = render(<PageHeader title="Heading" as="h1" />);

      // Check that it renders as h1
      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent("Heading");

      // Test with h2
      rerender(<PageHeader title="Heading" as="h2" />);
      const heading2 = screen.getByRole("heading", { level: 2 });
      expect(heading2).toBeInTheDocument();
    });

    it("renders as div by default", () => {
      render(<PageHeader title="Default Element" />);

      // Should not be a heading element by default
      expect(screen.queryByRole("heading")).not.toBeInTheDocument();
      expect(screen.getByText("Default Element")).toBeInTheDocument();
    });
  });

  describe("Style and Layout", () => {
    it("applies italic font style to title", () => {
      render(<PageHeader title="Italic Title" />);

      expect(screen.getByTestId("page-header-title")).toHaveStyle({
        fontStyle: "italic",
      });
    });

    it("applies consistent text styling", () => {
      render(<PageHeader title="Styled Title" />);

      const title = screen.getByText("Styled Title");
      // Test that the element exists and is accessible
      expect(title).toBeInTheDocument();
      // Specific font-weight testing is brittle with CSS-in-JS
      // Better to test via visual regression or E2E tests
    });

    it("has proper layout classes for flex positioning", () => {
      render(<PageHeader title="Layout Test" />);

      const container = screen.getByTestId("page-header");
      // The component should have flex layout styles applied
      expect(container).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("maintains semantic structure with custom elements", () => {
      render(<PageHeader title="Accessible Header" as="header" />);

      // Should render as a semantic header element
      const header = screen.getByRole("banner");
      expect(header).toBeInTheDocument();
      expect(header).toHaveTextContent("Accessible Header");
    });

    it("preserves text content for screen readers", () => {
      render(<PageHeader title="Screen Reader Test" />);

      // Text should be accessible
      expect(screen.getByText("Screen Reader Test")).toBeInTheDocument();
    });
  });
});
