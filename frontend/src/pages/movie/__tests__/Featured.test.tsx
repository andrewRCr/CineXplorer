/**
 * Tests for Featured page component
 *
 * NOTE: Featured is currently a minimal stub/placeholder. This test file
 * contains only a basic smoke test to verify the component renders.
 *
 * Expand test coverage when the Featured page is properly implemented with:
 * - Hero section with featured movies
 * - Dynamic content loading
 * - User personalization features
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { Provider as ChakraProvider } from "@/components/core/chakra/provider";
import Featured from "../Featured";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

function renderWithProviders(component: React.ReactElement) {
  return render(
    <ChakraProvider>
      <BrowserRouter>{component}</BrowserRouter>
    </ChakraProvider>,
  );
}

describe("Featured Page", () => {
  it.each([
    ["All films", "/browse"],
    ["In theaters", "/browse/now-playing"],
    ["Coming soon", "/browse/upcoming"],
  ])("opens the %s window", async (label, path) => {
    const user = userEvent.setup();
    render(
      <ChakraProvider>
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route path="/" element={<Featured />} />
            <Route path={path} element={<p>Chosen window: {path}</p>} />
          </Routes>
        </MemoryRouter>
      </ChakraProvider>,
    );
    await user.click(screen.getByRole("button", { name: label }));
    expect(await screen.findByText(`Chosen window: ${path}`)).toBeVisible();
  });

  it("renders without errors", () => {
    renderWithProviders(<Featured />);

    // Verify basic content renders
    expect(screen.getByText("Welcome to CineXplorer")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Films" }),
    ).toBeVisible();
  });
});
