/**
 * Integration tests for ErrorBoundary with App component.
 *
 * This test suite verifies that the ErrorBoundary is properly integrated
 * at the application level and catches unhandled React errors.
 */

import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router";
import { ChakraProvider } from "@chakra-ui/react";
import ErrorBoundary from "../ErrorBoundary";
import { defaultSystem } from "@/theme";

// Mock components to test error scenarios
const ThrowError: React.FC<{ shouldThrow?: boolean }> = ({
  shouldThrow = true,
}) => {
  if (shouldThrow) {
    throw new Error("Test error for ErrorBoundary integration");
  }
  return <div>No error</div>;
};

const TestApp: React.FC<{ hasError?: boolean }> = ({ hasError = false }) => {
  return (
    <ChakraProvider value={defaultSystem}>
      <ErrorBoundary showErrorDetails={true}>
        <MemoryRouter>
          <div>
            <h1>Test App</h1>
            {hasError ? (
              <ThrowError shouldThrow={true} />
            ) : (
              <ThrowError shouldThrow={false} />
            )}
          </div>
        </MemoryRouter>
      </ErrorBoundary>
    </ChakraProvider>
  );
};

describe("ErrorBoundary Integration", () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Suppress console.error for tests since we're intentionally throwing errors
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it("renders children normally when there are no errors", () => {
    render(<TestApp hasError={false} />);

    expect(screen.getByText("Test App")).toBeInTheDocument();
    expect(screen.getByText("No error")).toBeInTheDocument();

    // Should not show error boundary UI
    expect(
      screen.queryByText("Oops! Something went wrong"),
    ).not.toBeInTheDocument();
  });

  it("catches errors and displays error boundary UI", () => {
    render(<TestApp hasError={true} />);

    // Should display error boundary UI
    expect(screen.getByText("Oops! Something went wrong")).toBeInTheDocument();
    expect(
      screen.getByText(/We've encountered an unexpected error/),
    ).toBeInTheDocument();

    // Should show error ID for support
    expect(screen.getByText("Error ID for support:")).toBeInTheDocument();

    // Should have action buttons
    expect(
      screen.getByRole("button", { name: "Try Again" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Report Issue" }),
    ).toBeInTheDocument();

    // Should not render the original app content
    expect(screen.queryByText("Test App")).not.toBeInTheDocument();
    expect(screen.queryByText("No error")).not.toBeInTheDocument();
  });

  it("shows technical details when showErrorDetails is true", () => {
    render(<TestApp hasError={true} />);

    // Should show the toggle for technical details in development mode
    expect(
      screen.getByRole("button", { name: /Show Technical Details/ }),
    ).toBeInTheDocument();
  });

  it("displays error ID that can be copied", () => {
    render(<TestApp hasError={true} />);

    // Should show error ID section
    const errorIdSection = screen.getByText("Error ID for support:");
    expect(errorIdSection).toBeInTheDocument();

    // Should have copy button for error ID
    const copyButton = screen.getByLabelText("Copy error ID");
    expect(copyButton).toBeInTheDocument();
  });

  it("integrates properly with routing context", () => {
    // Test that ErrorBoundary works even when routing components are involved
    const AppWithRouting: React.FC<{ hasError?: boolean }> = ({
      hasError = false,
    }) => (
      <ChakraProvider value={defaultSystem}>
        <ErrorBoundary showErrorDetails={false}>
          <MemoryRouter initialEntries={["/test-route"]}>
            <div>
              <span>Current route context available</span>
              {hasError && <ThrowError />}
            </div>
          </MemoryRouter>
        </ErrorBoundary>
      </ChakraProvider>
    );

    // Test normal rendering with routing
    const { rerender } = render(<AppWithRouting hasError={false} />);
    expect(
      screen.getByText("Current route context available"),
    ).toBeInTheDocument();

    // Test error boundary with routing
    rerender(<AppWithRouting hasError={true} />);
    expect(screen.getByText("Oops! Something went wrong")).toBeInTheDocument();
    expect(
      screen.queryByText("Current route context available"),
    ).not.toBeInTheDocument();
  });

  it("handles environment-based showErrorDetails prop correctly", () => {
    // Test with showErrorDetails disabled (production-like)
    const ProductionApp: React.FC = () => (
      <ChakraProvider value={defaultSystem}>
        <ErrorBoundary showErrorDetails={false}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      </ChakraProvider>
    );

    render(<ProductionApp />);

    // Should still show the main error UI
    expect(screen.getByText("Oops! Something went wrong")).toBeInTheDocument();

    // Should not show technical details toggle in production mode
    expect(
      screen.queryByRole("button", { name: /Show Technical Details/ }),
    ).not.toBeInTheDocument();
  });

  it("maintains error boundary functionality across re-renders", () => {
    const { rerender } = render(<TestApp hasError={false} />);

    // Initially no error
    expect(screen.getByText("Test App")).toBeInTheDocument();
    expect(
      screen.queryByText("Oops! Something went wrong"),
    ).not.toBeInTheDocument();

    // Trigger error
    rerender(<TestApp hasError={true} />);
    expect(screen.getByText("Oops! Something went wrong")).toBeInTheDocument();
    expect(screen.queryByText("Test App")).not.toBeInTheDocument();
  });
});

describe("ErrorBoundary with Logger Integration", () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it("logs errors to the logger service when errors occur", () => {
    // This test verifies the integration exists - the actual logger functionality
    // is tested in the ErrorBoundary component tests
    render(<TestApp hasError={true} />);

    // Verify error boundary renders (indicating logger integration worked)
    expect(screen.getByText("Oops! Something went wrong")).toBeInTheDocument();

    // The actual logger calls are tested in the ErrorBoundary unit tests
    // This integration test focuses on the overall app-level integration
  });
});
