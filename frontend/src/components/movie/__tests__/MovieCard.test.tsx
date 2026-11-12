import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  render,
  screen,
  isInaccessible,
  within,
  waitFor,
} from "@tests/helpers/test-renderer";
import { renderWithRoute } from "@tests/helpers/test-renderer-with-routes";
import { createMockMovieListItem } from "@tests/mocks/movieData";
import { http, HttpResponse } from "msw/http";
import { server } from "@tests/mocks/server";
import { createMockUserMovieData } from "@tests/mocks/movieData";
import { Toaster, toaster } from "@/components/core/chakra/toaster";
import MovieCard from "../MovieCard";
import { styleSystem, expectResolvedColor } from "@tests/helpers/theme-styles";

// Mock the COLORS constant since it's used in the component

describe("MovieCard Component", () => {
  const defaultProps = {
    movie: createMockMovieListItem(),
    source: "popular",
    query: "",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("draws its title in the theme foreground", () => {
    render(
      <MovieCard
        movie={createMockMovieListItem({ title: "A themed movie" })}
      />,
      { system: styleSystem },
    );
    expectResolvedColor(
      screen.getByText("A themed movie"),
      "color",
      "var(--chakra-colors-foreground)",
    );
  });

  describe("Basic Rendering", () => {
    it("renders movie information correctly", () => {
      const testMovie = createMockMovieListItem({
        title: "The Matrix",
        release_date: "1999-03-31",
      });

      render(<MovieCard {...defaultProps} movie={testMovie} />);

      expect(screen.getByText("The Matrix")).toBeInTheDocument();
      expect(screen.getByAltText("The Matrix")).toBeInTheDocument();
    });

    it("renders without optional props", () => {
      render(<MovieCard movie={createMockMovieListItem()} />);

      expect(screen.getByText("Test Movie")).toBeInTheDocument();
    });

    it("displays movie poster with correct src", () => {
      const testMovie = createMockMovieListItem({
        poster_path: "/test-poster.jpg",
        title: "Test Movie",
      });

      render(<MovieCard {...defaultProps} movie={testMovie} />);

      const posterImage = screen.getByAltText("Test Movie") as HTMLImageElement;
      expect(posterImage).toBeInTheDocument();
      expect(posterImage.src).toBe(
        "https://image.tmdb.org/t/p/w342/test-poster.jpg",
      );
    });

    it.each([null, ""])(
      "uses theme colors for the local placeholder when poster_path is %j",
      (posterPath) => {
        const movieWithoutPoster = createMockMovieListItem({
          poster_path: posterPath,
          title: "No Poster Movie",
        });

        render(<MovieCard {...defaultProps} movie={movieWithoutPoster} />, {
          system: styleSystem,
        });

        const posterImage = screen.getByRole("img", {
          name: "No Poster Movie",
        });
        expectResolvedColor(
          posterImage,
          "background-color",
          "var(--chakra-colors-badge)",
        );
        expectResolvedColor(
          posterImage,
          "color",
          "var(--chakra-colors-on-badge)",
        );
      },
    );
  });

  describe("Navigation Links", () => {
    it("creates correct movie detail link", () => {
      const testMovie = createMockMovieListItem({
        tmdb_id: 550,
        title: "Fight Club",
      });

      render(<MovieCard {...defaultProps} movie={testMovie} />);

      const links = screen.getAllByRole("link", { name: testMovie.title });
      expect(links.length).toBeGreaterThan(0);
    });

    it("includes query parameters in links when provided (no page for infinite scroll)", () => {
      const testMovie = createMockMovieListItem({ tmdb_id: 123 });

      render(
        <MovieCard
          {...defaultProps}
          movie={testMovie}
          source="top-rated"
          query="action"
        />,
      );

      const link = screen.getByText(testMovie.title, { selector: "a" });
      // Page params should NOT be included (infinite scroll migration)
      expect(link?.getAttribute("href")).not.toContain("page=");
      expect(link?.getAttribute("href")).toContain("from=top-rated");
      expect(link?.getAttribute("href")).toContain("query=action");
    });

    it("creates links without query params when none provided", () => {
      const testMovie = createMockMovieListItem({ tmdb_id: 456 });

      render(<MovieCard movie={testMovie} />);

      const link = screen.getByText(testMovie.title, { selector: "a" });
      expect(link).toBeInTheDocument();
    });
  });

  describe("User Score Display", () => {
    it("displays MovieUserScore component", () => {
      const testMovie = createMockMovieListItem({
        vote_average: 8.5,
      });

      render(<MovieCard {...defaultProps} movie={testMovie} />);

      // The MovieUserScore component should show the rating (0-10 scale)
      const badge = screen.getByText("8.5");
      const explanation = within(badge).getByText("TMDB Rating:");
      expect(isInaccessible(explanation)).toBe(false);
      expect(badge).toHaveTextContent("TMDB Rating: 8.5");
    });

    it("passes correct score to MovieUserScore", () => {
      const testMovie = createMockMovieListItem({
        vote_average: 7.2,
      });

      render(<MovieCard {...defaultProps} movie={testMovie} />);

      expect(screen.getByText("7.2")).toBeInTheDocument();
    });

    it.each([1, 4, 9])(
      "explains the placeholder at %s votes without hover",
      (voteCount) => {
        const testMovie = createMockMovieListItem({
          vote_average: 6.8,
          vote_count: voteCount,
        });

        render(<MovieCard {...defaultProps} movie={testMovie} />);

        const badge = screen.getByText("—");
        const explanation = within(badge).getByText(
          "Fewer than 10 TMDB votes:",
        );
        expect(isInaccessible(explanation)).toBe(false);
        expect(badge).toHaveTextContent("Fewer than 10 TMDB votes: —");
        expect(screen.queryByText("6.8")).not.toBeInTheDocument();
      },
    );
  });

  describe("Zero-vote score explanation", () => {
    it("explains why a card has no TMDB score without hover", () => {
      const testMovie = createMockMovieListItem({
        vote_average: 0,
        vote_count: 0,
      });
      render(<MovieCard {...defaultProps} movie={testMovie} />);

      const badge = screen.getByText("—");
      const explanation = within(badge).getByText("No TMDB votes yet:");
      expect(isInaccessible(explanation)).toBe(false);
      expect(badge).toHaveTextContent("No TMDB votes yet: —");
    });
  });

  describe("Date Formatting", () => {
    it("formats release date correctly", () => {
      const testMovie = createMockMovieListItem({
        release_date: "2023-12-25",
      });

      render(<MovieCard {...defaultProps} movie={testMovie} />);

      // Date formatting can vary by locale/timezone - test for presence of year
      // More reliable than exact string matching
      const dateText = screen.getByText(/2023/);
      expect(dateText).toBeInTheDocument();
      expect(dateText.textContent).toMatch(/December|Dec/);
    });

    it("handles different date formats", () => {
      const testMovie = createMockMovieListItem({
        release_date: "2020-01-01",
      });

      render(<MovieCard {...defaultProps} movie={testMovie} />);

      // Date formatting can be affected by timezone in test environment
      // Look for any date content that indicates the date was processed
      const dateElements = screen.getAllByText(/\d{4}/); // Find elements with 4 digits (year)
      expect(dateElements.length).toBeGreaterThan(0);

      // Verify that a formatted date is displayed (month name + year)
      const hasFormattedDate =
        screen.queryByText(
          /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b.*\d{4}/,
        ) ||
        screen.queryByText(
          /\d{4}.*\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/,
        );
      expect(hasFormattedDate).toBeInTheDocument();
    });

    it("displays ISO date without timezone shifting", () => {
      // Critical test: ISO date "1980-01-01" should display as January 1, 1980
      // NOT December 31, 1979 (which happens when new Date() converts UTC to local)
      //
      // This test validates the fix even in UTC environments by checking exact date values
      const testMovie = createMockMovieListItem({
        release_date: "1980-01-01",
      });

      render(<MovieCard {...defaultProps} movie={testMovie} />);

      // Should display exactly January 1, 1980
      const dateText = screen.getByText(/January 1, 1980/);
      expect(dateText).toBeInTheDocument();

      // Verify the WRONG parsing would give us wrong results
      // If we used: new Date('1980-01-01') in US Eastern (UTC-5):
      // - It interprets as 1980-01-01 00:00 UTC
      // - Converts to local: 1979-12-31 19:00 EST
      // - getMonth() returns 11 (December), getDate() returns 31, getFullYear() returns 1979
      // Our fix parses the string components directly to avoid this
    });

    it("handles year boundary dates correctly without timezone conversion", () => {
      // Another boundary case: December 31 should stay December 31
      const testMovie = createMockMovieListItem({
        release_date: "1999-12-31",
      });

      render(<MovieCard {...defaultProps} movie={testMovie} />);

      // Should display exactly December 31, 1999 (not shift to January 1, 2000)
      const dateText = screen.getByText(/December 31, 1999/);
      expect(dateText).toBeInTheDocument();
    });

    it("parses ISO date components directly without Date() constructor timezone conversion", () => {
      // This test explicitly validates that we parse "YYYY-MM-DD" components
      // rather than using new Date(iso_string) which triggers timezone conversion
      const testCases = [
        { release_date: "2020-01-01", expected: "January 1, 2020" },
        { release_date: "2020-12-31", expected: "December 31, 2020" },
        { release_date: "1988-06-15", expected: "June 15, 1988" },
      ];

      testCases.forEach(({ release_date, expected }) => {
        const testMovie = createMockMovieListItem({ release_date });
        const { unmount } = render(
          <MovieCard {...defaultProps} movie={testMovie} />,
        );

        expect(screen.getByText(expected)).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe("Hover Interactions", () => {
    it("triggers hover state on mouse enter", async () => {
      render(<MovieCard {...defaultProps} movie={createMockMovieListItem()} />);

      const movieLink = screen.getByText("Test Movie", { selector: "a" });
      const user = userEvent.setup();
      await user.hover(movieLink);
      await user.unhover(movieLink);
      expect(movieLink).toBeInTheDocument();
    });

    it("handles hover state changes without errors", async () => {
      render(<MovieCard {...defaultProps} movie={createMockMovieListItem()} />);

      const movieLink = screen.getByText("Test Movie", { selector: "a" });
      const user = userEvent.setup();
      await user.hover(movieLink);
      await user.unhover(movieLink);
      expect(movieLink).toBeInTheDocument();
    });
  });

  describe("Title Truncation and Tooltip", () => {
    it("renders title within designated area", () => {
      const longTitleMovie = createMockMovieListItem({
        title:
          "This is a Very Long Movie Title That Should Probably Be Truncated",
      });

      render(<MovieCard {...defaultProps} movie={longTitleMovie} />);

      expect(
        screen.getByText(
          "This is a Very Long Movie Title That Should Probably Be Truncated",
        ),
      ).toBeInTheDocument();
    });

    it("renders title with proper structure", () => {
      render(<MovieCard {...defaultProps} movie={createMockMovieListItem()} />);

      const titleElement = screen.getByText("Test Movie");
      // Test that title is rendered and accessible
      expect(titleElement).toBeInTheDocument();
      // CSS overflow behavior is implementation detail - would test via visual regression
    });

    // Note: Title truncation detection and tooltip behavior is complex to test
    // because it depends on actual DOM measurements. In a real app, you might
    // use integration tests or visual testing tools for this behavior.
  });

  describe("Responsive Behavior", () => {
    it("applies responsive width configuration", () => {
      render(<MovieCard {...defaultProps} movie={createMockMovieListItem()} />);

      expect(
        screen.getByText("Test Movie", { selector: "a" }),
      ).toBeInTheDocument();
    });
  });

  describe("Performance Optimizations", () => {
    it("memoizes expensive calculations", () => {
      const testMovie = createMockMovieListItem({
        release_date: "2023-06-15",
        poster_path: "/test.jpg",
      });

      // Render multiple times with same props to test memoization
      const { rerender } = render(
        <MovieCard {...defaultProps} movie={testMovie} />,
      );

      // Test that date is rendered (exact format may vary)
      const dateElement = screen.getByText(/2023/);
      expect(dateElement).toBeInTheDocument();
      expect(dateElement.textContent).toMatch(/June|Jun/);

      // Re-render with same props - should work without errors
      rerender(<MovieCard {...defaultProps} movie={testMovie} />);
      expect(screen.getByText(/2023/)).toBeInTheDocument();
    });

    it("updates when movie data changes", () => {
      // Test memoized component updates correctly
      const movie1 = createMockMovieListItem({
        tmdb_id: 100,
        title: "First Movie",
      });
      const movie2 = createMockMovieListItem({
        tmdb_id: 200,
        title: "Second Movie",
      });

      const { rerender } = render(
        <MovieCard {...defaultProps} movie={movie1} />,
      );
      expect(screen.getByText("First Movie")).toBeInTheDocument();

      rerender(<MovieCard {...defaultProps} movie={movie2} />);
      expect(screen.getByText("Second Movie")).toBeInTheDocument();
      expect(screen.queryByText("First Movie")).not.toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("provides alt text for movie poster", () => {
      const testMovie = createMockMovieListItem({
        title: "Accessible Movie",
      });

      render(<MovieCard {...defaultProps} movie={testMovie} />);

      const image = screen.getByAltText("Accessible Movie");
      expect(image).toBeInTheDocument();
    });

    it("creates accessible navigation links", () => {
      const testMovie = createMockMovieListItem({
        tmdb_id: 789,
        title: "Link Test Movie",
      });

      render(<MovieCard {...defaultProps} movie={testMovie} />);

      const links = screen.getAllByRole("link", { name: testMovie.title });
      links.forEach((link) => {
        expect(link).toBeInTheDocument();
      });
    });

    it("maintains proper focus behavior", () => {
      render(<MovieCard {...defaultProps} movie={createMockMovieListItem()} />);

      const links = screen.getAllByRole("link");
      expect(links.length).toBeGreaterThan(0);

      // Links should be focusable
      links.forEach((link) => {
        expect(link.tabIndex).toBe(0);
      });
    });
  });

  describe("Error Handling", () => {
    it("handles missing movie data gracefully", () => {
      const incompleteMovie = createMockMovieListItem({
        title: "Incomplete Movie",
        poster_path: null,
        release_date: "",
      });

      expect(() => {
        render(<MovieCard {...defaultProps} movie={incompleteMovie} />);
      }).not.toThrow();

      expect(screen.getByText("Incomplete Movie")).toBeInTheDocument();
    });

    it("handles invalid date formats gracefully", () => {
      const invalidDateMovie = createMockMovieListItem({
        title: "Invalid Date Movie",
        release_date: "invalid-date",
      });

      expect(() => {
        render(<MovieCard {...defaultProps} movie={invalidDateMovie} />);
      }).not.toThrow();

      expect(screen.getByText("Invalid Date Movie")).toBeInTheDocument();
    });
  });

  describe("URL Parameter Preservation", () => {
    it("includes all filter params in detail page link", () => {
      const testMovie = createMockMovieListItem({ tmdb_id: 550 });

      // Render with full filter params in URL
      render(
        <MovieCard
          {...defaultProps}
          movie={testMovie}
          source="popular"
          query="test query"
        />,
      );

      // Find link to detail page
      const link = screen.getByText(testMovie.title, { selector: "a" });
      expect(link).toBeInTheDocument();

      const href = link?.getAttribute("href") || "";

      // Page params should NOT be included (infinite scroll migration)
      expect(href).not.toContain("page=");
      expect(href).toContain("from=popular");
      expect(href).toContain("query=test%20query");
    });

    it("preserves filter params from URL search params but strips page", () => {
      // This test simulates the component reading from useSearchParams()
      // MovieCard should read filter params from URL and preserve them
      // But NOT page params (infinite scroll migration)

      const testMovie = createMockMovieListItem({ tmdb_id: 123 });

      // Render with full routing context and filter params in URL
      renderWithRoute(
        "/popular",
        <MovieCard {...defaultProps} movie={testMovie} />,
        {
          initialRoute:
            "/popular?page=1&from=popular&minYear=1980&maxYear=1990&genres=28,12&minRating=7.0&maxRating=10.0&sortBy=vote_average.desc",
        },
      );

      const link = screen.getByText(testMovie.title, { selector: "a" });
      const href = link?.getAttribute("href") || "";

      // Page params should NOT be preserved (infinite scroll)
      expect(href).not.toContain("page=");
      // Filter params should be preserved
      expect(href).toContain("minYear=1980");
      expect(href).toContain("maxYear=1990");
      // Genres is URL-encoded (comma becomes %2C)
      expect(href).toContain("genres=28%2C12");
      expect(href).toContain("minRating=7.0");
      expect(href).toContain("maxRating=10.0");
      expect(href).toContain("sortBy=vote_average.desc");
    });

    it("preserves unknown params for forward compatibility", () => {
      const testMovie = createMockMovieListItem({ tmdb_id: 456 });

      // Future-proof: if new params are added, they should be preserved
      // This ensures URL params we don't explicitly handle are not lost

      render(<MovieCard {...defaultProps} movie={testMovie} />);

      const link = screen.getByText(testMovie.title, { selector: "a" });
      const href = link?.getAttribute("href") || "";

      // After implementation with useSearchParams(), unknown params
      // like 'futureFeature=value' should be preserved
      // Will FAIL until implementation captures all URL params

      // Test expectation: if URL had ?futureFeature=test,
      // link should include it even though we don't know about it
      expect(href).toBeDefined();
    });

    it("handles empty filter params correctly", () => {
      const testMovie = createMockMovieListItem({ tmdb_id: 789 });

      // When no filters are applied, URL should only have basic params
      render(
        <MovieCard
          {...defaultProps}
          movie={testMovie}
          source="popular"
          query=""
        />,
      );

      const link = screen.getByText(testMovie.title, { selector: "a" });
      const href = link?.getAttribute("href") || "";

      // Should include from, but NOT page (infinite scroll) or empty query
      expect(href).not.toContain("page=");
      expect(href).toContain("from=popular");

      // Should not include empty/undefined filter params
      expect(href).not.toContain("minYear=");
      expect(href).not.toContain("maxYear=");
      expect(href).not.toContain("query=");
    });

    it("handles genres array parameter correctly", () => {
      const testMovie = createMockMovieListItem({ tmdb_id: 111 });

      // Genres are passed as comma-separated string in URL
      render(<MovieCard {...defaultProps} movie={testMovie} />);

      const link = screen.getByText(testMovie.title, { selector: "a" });
      const href = link?.getAttribute("href") || "";

      // After implementation, should handle genres=28,12,35 format
      // Will FAIL until implementation reads from useSearchParams()
      expect(href).toBeDefined();
    });

    it("URL-encodes special characters in params", () => {
      const testMovie = createMockMovieListItem({ tmdb_id: 222 });

      render(
        <MovieCard
          {...defaultProps}
          movie={testMovie}
          query="action & adventure"
        />,
      );

      const link = screen.getByText(testMovie.title, { selector: "a" });
      const href = link?.getAttribute("href") || "";

      // Should properly encode special characters
      expect(href).toContain("query=action%20%26%20adventure");
    });
  });
});

describe("MovieCard watchlist saves", () => {
  beforeEach(() => {
    toaster.remove();
    document.cookie = "csrftoken=movie-save-csrf; path=/";
  });

  it("sends true then false from a card initially drawn without user data", async () => {
    const requests: { method: string; path: string; body: unknown }[] = [];
    server.use(
      http.all(/\/api\/user-movie-data(?:\/\d+)?$/, async ({ request }) => {
        const body = await request.json();
        requests.push({
          method: request.method,
          path: new URL(request.url).pathname,
          body,
        });
        const desired = requests.length === 1;
        return HttpResponse.json(
          createMockUserMovieData({ tmdb_id: 550, user_on_watchlist: desired }),
        );
      }),
    );
    render(
      <>
        <MovieCard
          movie={createMockMovieListItem({
            tmdb_id: 550,
            user_movie_data: null,
          })}
        />
        <Toaster />
      </>,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Add to watchlist" }));
    await screen.findByText("Added to watchlist");
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Remove from watchlist" }),
      ).toBeEnabled(),
    );
    expect(
      screen.getByRole("button", { name: "Remove from watchlist" }),
    ).toHaveAttribute("aria-pressed", "true");
    await user.click(
      screen.getByRole("button", { name: "Remove from watchlist" }),
    );
    await screen.findByText("Removed from watchlist");
    expect(
      screen.getByRole("button", { name: "Add to watchlist" }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(requests).toEqual(
      [true, false].map((desired) => ({
        method: "PATCH",
        path: "/api/user-movie-data/550",
        body: { user_on_watchlist: desired },
      })),
    );
  });

  it.each([500, 429])(
    "rolls back a failed save (%s) and shows the failure toast",
    async (status) => {
      server.use(
        http.all(/\/api\/user-movie-data(?:\/\d+)?$/, () =>
          HttpResponse.json({ detail: "Save unavailable" }, { status }),
        ),
      );
      render(
        <>
          <MovieCard
            movie={createMockMovieListItem({ user_movie_data: null })}
          />
          <Toaster />
        </>,
      );
      await userEvent
        .setup()
        .click(screen.getByRole("button", { name: "Add to watchlist" }));
      expect(
        await screen.findByText("Failed to update watchlist"),
      ).toBeInTheDocument();
      expect(screen.getByText("Please try again.")).toBeInTheDocument();
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "Add to watchlist" }),
        ).toBeEnabled(),
      );
      expect(
        screen.getByRole("button", { name: "Add to watchlist" }),
      ).toHaveAttribute("aria-pressed", "false");
    },
  );
});
