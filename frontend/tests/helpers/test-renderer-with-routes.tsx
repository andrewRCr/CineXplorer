/* eslint-disable react-refresh/only-export-components */
import { type ReactElement } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { TestProviders } from "./test-providers";
import type { SystemContext } from "@chakra-ui/react";

/**
 * Route configuration for integration tests
 */
export interface TestRoute {
  path: string;
  element: ReactElement;
}

/**
 * Options for rendering with routes
 */
export interface RenderWithRoutesOptions extends Omit<
  RenderOptions,
  "wrapper"
> {
  /**
   * Initial route to start on (e.g., '/popular?page=2&minYear=1990')
   */
  initialRoute?: string;
  /** Override the project system, for example with layer-free recipe styles. */
  system?: SystemContext;
  /**
   * Additional initial entries for history stack
   * Useful for testing back button behavior
   */
  initialEntries?: string[];
}

/**
 * Render component with full routing context for integration tests.
 *
 * Use this helper when testing navigation flows that span multiple routes,
 * such as collection page → detail page → back navigation.
 *
 * @example
 * ```tsx
 * renderWithRoutes(
 *   [
 *     { path: '/popular', element: <MovieCollectionGrid /> },
 *     { path: '/movie/:id', element: <MovieDetail /> }
 *   ],
 *   { initialRoute: '/popular?page=2&minYear=1990' }
 * );
 * ```
 *
 * @param routes - Array of route configurations
 * @param options - Rendering options including initial route
 * @returns RTL render result with navigation helpers
 */
export const renderWithRoutes = (
  routes: TestRoute[],
  options: RenderWithRoutesOptions = {},
) => {
  const {
    initialRoute = "/",
    initialEntries,
    system,
    ...renderOptions
  } = options;

  // Build initial entries array
  const entries = initialEntries || [initialRoute];

  const AllProviders = ({ children }: { children: React.ReactNode }) => {
    return (
      <TestProviders system={system}>
        <MemoryRouter initialEntries={entries}>{children}</MemoryRouter>
      </TestProviders>
    );
  };

  return render(
    <Routes>
      {routes.map((route, index) => (
        <Route
          key={route.path || `route-${index}`}
          path={route.path}
          element={route.element}
        />
      ))}
    </Routes>,
    { wrapper: AllProviders, ...renderOptions },
  );
};

/**
 * Simplified version that renders a single route with full context.
 * Useful when you only need to test one component with routing context.
 *
 * @example
 * ```tsx
 * renderWithRoute('/popular', <MovieCollectionGrid />, {
 *   initialRoute: '/popular?page=2'
 * });
 * ```
 */
export const renderWithRoute = (
  path: string,
  element: ReactElement,
  options: RenderWithRoutesOptions = {},
) => {
  return renderWithRoutes([{ path, element }], options);
};

// Re-export everything from testing library for convenience
export * from "@testing-library/react";
