/**
 * Routing integration tests for browse page structure
 *
 * Tests the routing configuration for:
 * - Home/Featured landing page
 * - Browse pages (/browse, /browse/now-playing, /browse/upcoming)
 * - Redirect behavior (/featured → /)
 *
 * These routes are the permanent structure established in the endpoint
 * consolidation work and should be stable going forward.
 */

import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Routes, Route, Navigate } from "react-router";
import { Provider as ChakraProvider } from "@/components/core/chakra/provider";
import { ROUTES } from "@/constants/routes";

// Mock the page components to verify routing without loading full implementations
vi.mock("@/pages/movie/Featured", () => ({
  default: () => <div data-testid="featured-page">Featured Page</div>,
}));

vi.mock("@/pages/movie/Browse", () => ({
  default: () => <div data-testid="browse-page">Browse Page</div>,
}));

vi.mock("@/pages/movie/NowPlaying", () => ({
  default: () => <div data-testid="now-playing-page">Now Playing Page</div>,
}));

vi.mock("@/pages/movie/Upcoming", () => ({
  default: () => <div data-testid="upcoming-page">Upcoming Page</div>,
}));

// Import mocked components
import Featured from "@/pages/movie/Featured";
import Browse from "@/pages/movie/Browse";
import NowPlaying from "@/pages/movie/NowPlaying";
import Upcoming from "@/pages/movie/Upcoming";

/**
 * Simplified router for testing route matching.
 * Mirrors the actual App.tsx route structure for browse-related routes.
 */
function TestRouter({ initialRoute }: { initialRoute: string }) {
  return (
    <ChakraProvider>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          {/* Home IS the Featured landing page */}
          <Route path={ROUTES.HOME} element={<Featured />} />
          {/* /featured redirects to home */}
          <Route
            path={ROUTES.FEATURED}
            element={<Navigate to={ROUTES.HOME} replace />}
          />
          {/* Browse routes */}
          <Route path={ROUTES.BROWSE}>
            <Route index element={<Browse />} />
            <Route path="now-playing" element={<NowPlaying />} />
            <Route path="upcoming" element={<Upcoming />} />
          </Route>
          {/* 404 fallback */}
          <Route
            path="*"
            element={<div data-testid="not-found">Not Found</div>}
          />
        </Routes>
      </MemoryRouter>
    </ChakraProvider>
  );
}

describe("Browse Route Structure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Home and Featured routes", () => {
    it("renders Featured page at root path (/)", () => {
      render(<TestRouter initialRoute="/" />);
      expect(screen.getByTestId("featured-page")).toBeInTheDocument();
    });

    it("redirects /featured to root path", async () => {
      render(<TestRouter initialRoute="/featured" />);
      // After redirect, should show Featured page (at / path)
      await waitFor(() => {
        expect(screen.getByTestId("featured-page")).toBeInTheDocument();
      });
    });
  });

  describe("Browse routes", () => {
    it("renders Browse page at /browse", () => {
      render(<TestRouter initialRoute="/browse" />);
      expect(screen.getByTestId("browse-page")).toBeInTheDocument();
    });

    it("renders Now Playing page at /browse/now-playing", () => {
      render(<TestRouter initialRoute="/browse/now-playing" />);
      expect(screen.getByTestId("now-playing-page")).toBeInTheDocument();
    });

    it("renders Upcoming page at /browse/upcoming", () => {
      render(<TestRouter initialRoute="/browse/upcoming" />);
      expect(screen.getByTestId("upcoming-page")).toBeInTheDocument();
    });
  });

  describe("Invalid routes", () => {
    it("shows 404 for unknown routes", () => {
      render(<TestRouter initialRoute="/unknown-route" />);
      expect(screen.getByTestId("not-found")).toBeInTheDocument();
    });

    it("shows 404 for old /movies path (not supported)", () => {
      render(<TestRouter initialRoute="/movies" />);
      expect(screen.getByTestId("not-found")).toBeInTheDocument();
    });
  });
});
