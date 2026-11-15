import { it, expect } from "vitest";
import { render as renderWithoutRouter } from "@testing-library/react";
import { screen } from "@tests/helpers/test-renderer";
import { MemoryRouter, Route, Routes } from "react-router";
import { TestProviders } from "@tests/helpers/test-providers";
import { ThemeSelectProvider } from "@/components/core/chakra/theme-provider";
import AppLayout from "@/components/layout/AppLayout";
import { authHandlers, clearBrowserAuth } from "@tests/helpers/auth";

it.each(["/", "/other"])(
  "applies the page container only to ordinary routes: %s",
  (path) => {
    clearBrowserAuth();
    authHandlers();
    renderWithoutRouter(
      <ThemeSelectProvider>
        <TestProviders>
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route element={<AppLayout />}>
                <Route
                  path={path}
                  element={<div data-testid="page-content">Page content</div>}
                />
              </Route>
            </Routes>
          </MemoryRouter>
        </TestProviders>
      </ThemeSelectProvider>,
    );
    const page = screen.getByTestId("page-content");
    expect(page.parentElement?.classList.contains("chakra-container")).toBe(
      path !== "/",
    );
  },
);
