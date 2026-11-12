import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { act, screen } from "@tests/helpers/test-renderer";
import { renderWithRoute } from "@tests/helpers/test-renderer-with-routes";
import MovieDetail from "../MovieDetail";
import { createMockMovieDetail } from "@tests/mocks/movieData";
import type { MovieDetail as MovieDetailType } from "@/types/movie";

import { http, HttpResponse } from "msw/http";
import { server } from "@tests/mocks/server";
import { apiBaseUrl } from "@/config/baseUrls";
import { authHandlers, clearBrowserAuth } from "@tests/helpers/auth";
import { gate } from "@tests/helpers/web-locks";
import AuthContextProvider from "@/components/auth/AuthContextProvider";
import { toaster } from "@/components/core/chakra/toaster";

beforeEach(() => {
  clearBrowserAuth();
  authHandlers();
  act(() => toaster.remove());
});
afterEach(() => act(() => toaster.remove()));

// Helper to render MovieDetail with router and URL params
const renderMovieDetailWithRoute = (
  movieId: string,
  searchParams: string = "",
) => {
  const initialRoute = `/movie/${movieId}${searchParams}`;

  return renderWithRoute(
    "/movie/:id",
    <AuthContextProvider>
      <MovieDetail />
    </AuthContextProvider>,
    { initialRoute },
  );
};

describe("MovieDetail - Back Button URL Construction", () => {
  const mockMovie: MovieDetailType = createMockMovieDetail({
    tmdb_id: 550,
    title: "Fight Club",
    overview: "An insomniac office worker...",
    release_date: "1999-10-15",
  });

  beforeEach(() => {
    server.use(
      http.get(`${apiBaseUrl}/movies/550`, () => HttpResponse.json(mockMovie)),
    );
  });

  describe("Basic Back URL Construction", () => {
    it("reads all params from URL correctly", () => {
      const searchParams = "?page=2&from=popular&query=action";
      renderMovieDetailWithRoute("550", searchParams);

      const backButton = screen.getByText("Back to Results");
      expect(backButton).toBeInTheDocument();
    });

    it("constructs back URL with filter params but NOT page params", async () => {
      // Full set of filter params - page params should be stripped for infinite scroll
      const searchParams =
        "?page=3&tmdb_page_start=9&from=browse&minYear=1980&maxYear=1990&genres=28,12&minRating=7.0&maxRating=10.0&sortBy=vote_average.desc";

      renderMovieDetailWithRoute("550", searchParams);

      const backLink = await screen.findByRole("link", {
        name: "Back to Results",
      });

      expect(backLink).toBeInTheDocument();

      const href = backLink?.getAttribute("href") || "";

      // Page params should NOT be included (infinite scroll migration)
      expect(href).not.toContain("page=");

      expect(href).not.toContain("tmdb_page_start=");

      // Filter params should be preserved
      expect(href).toContain("minYear=1980");

      expect(href).toContain("maxYear=1990");

      // Genres are URL-encoded (comma becomes %2C)
      expect(href).toContain("genres=28%2C12");

      expect(href).toContain("minRating=7.0");

      expect(href).toContain("maxRating=10.0");

      expect(href).toContain("sortBy=vote_average.desc");
    });

    it("parses genres array correctly from URL", async () => {
      // Genres come as comma-separated string: "28,12,35"
      const searchParams = "?page=1&from=popular&genres=28,12,35";

      renderMovieDetailWithRoute("550", searchParams);

      const backLink = await screen.findByRole("link", {
        name: "Back to Results",
      });

      const href = backLink?.getAttribute("href") || "";

      // Should preserve genres exactly as received (URL-encoded)
      expect(href).toContain("genres=28%2C12%2C35");

      // Page should NOT be preserved
      expect(href).not.toContain("page=");
    });

    it("preserves filters but strips pagination params", async () => {
      const originalURL =
        "?page=2&from=browse&minYear=1990&maxYear=2000&minRating=8.0";

      renderMovieDetailWithRoute("550", originalURL);

      const backLink = await screen.findByRole("link", {
        name: "Back to Results",
      });

      const href = backLink?.getAttribute("href") || "";

      // Back URL should have route and filters, but NOT pagination
      expect(href).toContain("/browse");

      expect(href).not.toContain("page=");

      expect(href).toContain("minYear=1990");

      expect(href).toContain("maxYear=2000");

      expect(href).toContain("minRating=8.0");
    });
  });

  describe("Search vs Collection Routes", () => {
    it("constructs search back URL correctly without page", async () => {
      const searchParams = "?page=1&from=search&query=inception";

      renderMovieDetailWithRoute("550", searchParams);

      const backLink = await screen.findByRole("link", {
        name: "Back to Results",
      });

      const href = backLink?.getAttribute("href") || "";

      // Search route: /search?query=X (no page)
      expect(href).toContain("/search");

      expect(href).toContain("query=inception");

      expect(href).not.toContain("page=");
    });

    it("constructs browse back URL correctly", async () => {
      const searchParams = "?page=2&from=browse";

      renderMovieDetailWithRoute("550", searchParams);

      const backLink = await screen.findByRole("link", {
        name: "Back to Results",
      });

      const href = backLink?.getAttribute("href") || "";

      // Collection route: /browse (no page params)
      expect(href).toContain("/browse");

      expect(href).not.toContain("page=");
    });

    it("constructs now-playing back URL correctly", async () => {
      const searchParams = "?page=3&from=now-playing";

      renderMovieDetailWithRoute("550", searchParams);

      const backLink = await screen.findByRole("link", {
        name: "Back to Results",
      });

      const href = backLink?.getAttribute("href") || "";

      expect(href).toContain("/now-playing");

      expect(href).not.toContain("page=");
    });

    it("constructs upcoming back URL correctly", async () => {
      const searchParams = "?page=1&from=upcoming";

      renderMovieDetailWithRoute("550", searchParams);

      const backLink = await screen.findByRole("link", {
        name: "Back to Results",
      });

      const href = backLink?.getAttribute("href") || "";

      expect(href).toContain("/upcoming");

      expect(href).not.toContain("page=");
    });
  });

  describe("Filter Combinations", () => {
    it("handles year range filters", async () => {
      const searchParams = "?page=1&from=browse&minYear=1980&maxYear=1983";

      renderMovieDetailWithRoute("550", searchParams);

      const backLink = await screen.findByRole("link", {
        name: "Back to Results",
      });

      const href = backLink?.getAttribute("href") || "";

      expect(href).toContain("minYear=1980");

      expect(href).toContain("maxYear=1983");

      expect(href).not.toContain("page=");
    });

    it("handles rating filters", async () => {
      const searchParams = "?page=1&from=browse&minRating=7.0&maxRating=10.0";

      renderMovieDetailWithRoute("550", searchParams);

      const backLink = await screen.findByRole("link", {
        name: "Back to Results",
      });

      const href = backLink?.getAttribute("href") || "";

      expect(href).toContain("minRating=7.0");

      expect(href).toContain("maxRating=10.0");

      expect(href).not.toContain("page=");
    });

    it("handles combined filters without pagination", async () => {
      // All filters applied at once
      const searchParams =
        "?page=2&from=browse&minYear=1990&maxYear=2000&genres=28,12&minRating=8.0&maxRating=10.0&sortBy=vote_count.desc";

      renderMovieDetailWithRoute("550", searchParams);

      const backLink = await screen.findByRole("link", {
        name: "Back to Results",
      });

      const href = backLink?.getAttribute("href") || "";

      // All filters should be preserved (URL-encoded)
      expect(href).not.toContain("page=");

      expect(href).toContain("minYear=1990");

      expect(href).toContain("maxYear=2000");

      // Genres are URL-encoded
      expect(href).toContain("genres=28%2C12");

      expect(href).toContain("minRating=8.0");

      expect(href).toContain("maxRating=10.0");

      expect(href).toContain("sortBy=vote_count.desc");
    });

    it("handles search with filters", async () => {
      const searchParams =
        "?page=1&from=search&query=action&minYear=2000&genres=28&minRating=7.0";

      renderMovieDetailWithRoute("550", searchParams);

      const backLink = await screen.findByRole("link", {
        name: "Back to Results",
      });

      const href = backLink?.getAttribute("href") || "";

      // Search URL with filters, no page
      expect(href).toContain("/search");

      expect(href).toContain("query=action");

      expect(href).toContain("minYear=2000");

      expect(href).toContain("genres=28");

      expect(href).toContain("minRating=7.0");

      expect(href).not.toContain("page=");
    });
  });

  describe("Edge Cases", () => {
    it("handles minimal params without adding page to URL", async () => {
      // Minimal params: just from
      const searchParams = "?from=browse";

      renderMovieDetailWithRoute("550", searchParams);

      const backLink = await screen.findByRole("link", {
        name: "Back to Results",
      });

      const href = backLink?.getAttribute("href") || "";

      expect(href).toContain("/browse");

      expect(href).not.toContain("page=");

      // Should not include undefined/null params
      expect(href).not.toContain("minYear=undefined");

      expect(href).not.toContain("query=null");
    });

    it("defaults to now-playing when from param missing", async () => {
      // No 'from' param in URL
      const searchParams = "?page=1";

      renderMovieDetailWithRoute("550", searchParams);

      const backLink = await screen.findByRole("link", {
        name: "Back to Results",
      });

      const href = backLink?.getAttribute("href") || "";

      // Should default to now-playing (current implementation behavior)
      expect(href).toContain("/now-playing");

      expect(href).not.toContain("page=");
    });

    it("URL-encodes special characters in params", async () => {
      const searchParams = "?page=1&from=search&query=action%20%26%20adventure";

      renderMovieDetailWithRoute("550", searchParams);

      const backLink = await screen.findByRole("link", {
        name: "Back to Results",
      });

      const href = backLink?.getAttribute("href") || "";

      // Should preserve URL encoding
      expect(href).toContain("query=action%20%26%20adventure");

      expect(href).not.toContain("page=");
    });

    it("handles empty string params correctly", async () => {
      // Empty query param
      const searchParams = "?page=1&from=browse&query=";

      renderMovieDetailWithRoute("550", searchParams);

      const backLink = await screen.findByRole("link", {
        name: "Back to Results",
      });

      const href = backLink?.getAttribute("href") || "";

      // Empty query should not be included in URL
      expect(href).not.toContain("query=");

      expect(href).not.toContain("page=");
    });
  });

  describe("Loading and Error States", () => {
    it("shows back button even while loading", () => {
      const release = gate();
      server.use(
        http.get(`${apiBaseUrl}/movies/550`, async () => {
          await release.wait;
          return HttpResponse.json(mockMovie);
        }),
      );

      renderMovieDetailWithRoute("550", "?page=2&from=browse");

      // Back button should be visible immediately
      expect(screen.getByText("Back to Results")).toBeInTheDocument();
      act(() => release.release());
    });

    it("shows back button on error", async () => {
      server.use(
        http.get(`${apiBaseUrl}/movies/550`, () =>
          HttpResponse.json({}, { status: 500 }),
        ),
      );

      renderMovieDetailWithRoute("550", "?page=2&from=browse");

      await screen.findByRole("heading", { name: "Error Loading Movie" });
      // Back button should still work on error
      expect(screen.getByText("Back to Results")).toBeInTheDocument();
    });
  });
});

describe("MovieDetail - TMDB Score", () => {
  const mockMovieDetail = (overrides: Partial<MovieDetailType>) => {
    server.use(
      http.get(`${apiBaseUrl}/movies/1`, () =>
        HttpResponse.json(createMockMovieDetail(overrides)),
      ),
    );
  };

  it('shows "Not yet rated" for a movie with no votes', async () => {
    mockMovieDetail({ vote_average: 0, vote_count: 0 });

    renderMovieDetailWithRoute("1");

    expect(await screen.findByText("Not yet rated")).toBeInTheDocument();
  });

  it("shows the average with its vote count below 10 votes", async () => {
    mockMovieDetail({ vote_average: 6.8, vote_count: 4 });

    renderMovieDetailWithRoute("1");

    expect(await screen.findByText("6.8 · 4 votes")).toBeInTheDocument();
  });

  it("shows the score for a movie with 10 or more votes", async () => {
    mockMovieDetail({});

    renderMovieDetailWithRoute("1");

    expect(await screen.findByText("8.2")).toBeInTheDocument();
  });
});
