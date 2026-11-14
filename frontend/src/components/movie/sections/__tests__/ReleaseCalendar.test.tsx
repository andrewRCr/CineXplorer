import { it, expect } from "vitest";
import { render, screen, within } from "@tests/helpers/test-renderer";
import { http, HttpResponse } from "msw/http";
import { server } from "@tests/mocks/server";
import { apiBaseUrl } from "@/config/baseUrls";
import { createMockMovieListItem } from "@tests/mocks/movieData";
import { homeWindowQuery } from "@/lib/queries";
import { ReleaseCalendar } from "@/components/movie/sections/ReleaseCalendar";

it("shows opening weeks, dates, first genres and Home links with local poster placeholders", async () => {
  server.use(
    http.get(`${apiBaseUrl}/movies/upcoming`, () =>
      HttpResponse.json({
        results: Array.from({ length: 5 }, (_, i) =>
          createMockMovieListItem({
            tmdb_id: i,
            title: `Opening ${i}`,
            release_date: "2026-11-20",
            poster_path: null,
            genre_ids: i === 1 ? [] : [18],
          }),
        ),
      }),
    ),
  );
  render(
    <ReleaseCalendar
      title="Most anticipated"
      seeAll="/browse/upcoming"
      query={homeWindowQuery("upcoming")}
    />,
  );
  const region = screen.getByRole("region", { name: "Most anticipated" });
  expect(within(region).getByRole("link", { name: "See all" })).toHaveAttribute(
    "href",
    "/browse/upcoming",
  );
  expect(
    await within(region).findByRole("heading", {
      level: 3,
      name: "Week of November 16",
    }),
  ).toBeInTheDocument();
  expect(
    within(region).getByRole("link", { name: /Opening 0/ }),
  ).toHaveAttribute("href", "/movie/0?from=home");
  expect(within(region).getAllByText("Fri 20").length).toBeGreaterThanOrEqual(
    2,
  );
  expect(within(region).getAllByText("Drama").length).toBeGreaterThan(0);
  expect(
    within(region).getByRole("img", { name: "Opening 0" }),
  ).toBeInTheDocument();
  expect(within(region).getByText("and 3 more")).toBeInTheDocument();
  expect(
    within(region).getByRole("link", { name: /Opening 1/ }),
  ).not.toHaveTextContent("Drama");
});
