import { beforeEach, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";
import { render, screen, within } from "@tests/helpers/test-renderer";
import { http, HttpResponse } from "msw/http";
import { apiBaseUrl } from "@/config/baseUrls";
import { beginUserChange } from "@/lib/session";
import AuthContextProvider from "@/components/auth/AuthContextProvider";
import { setAuthTokens } from "@/utilities/tokenUtils";
import { authHandlers, clearBrowserAuth, token } from "@tests/helpers/auth";
import { server } from "@tests/mocks/server";
import {
  createMockMoviePage,
  createMockUserMovieData,
} from "@tests/mocks/movieData";
import type { components } from "@/types/api";
import Home from "../Home";
import { homeHandlers, homeFilm } from "./homeFixtures";

const url = `${apiBaseUrl}/user-movie-data/entries`;
function viewing(id: number): components["schemas"]["ActivityEntrySchema"] {
  return {
    id,
    tmdb_id: id === 2 ? 1 : id,
    title: id === 2 ? "Film 1" : `Film ${id}`,
    watched_on: `2026-11-${15 - id}`,
    rewatch: id === 2,
    rating: id === 1 ? 7 : null,
    review: null,
    poster_path: id === 1 ? "/one.jpg" : null,
    release_date: "2020-01-01",
  };
}
const activityPage = (ids: number[]) => ({
  page: 1,
  total_pages: ids.length ? 1 : 0,
  total_results: ids.length,
  results: ids.map(viewing),
});
beforeEach(() => {
  beginUserChange(new QueryClient());
  clearBrowserAuth();
  authHandlers();
  homeHandlers();
  setAuthTokens(token());
});
function page() {
  return render(
    <AuthContextProvider>
      <Home />
    </AuthContextProvider>,
  );
}
it("places five viewings between watchlist and what's on, retaining repeat viewings and their dates", async () => {
  server.use(
    http.get(`${apiBaseUrl}/user-movie-data/movies`, () =>
      HttpResponse.json(
        createMockMoviePage([
          {
            ...homeFilm,
            user_movie_data: createMockUserMovieData({
              tmdb_id: homeFilm.tmdb_id,
              user_on_watchlist: true,
            }),
          },
        ]),
      ),
    ),
    http.get(url, ({ request }) => {
      expect(Object.fromEntries(new URL(request.url).searchParams)).toEqual({
        page: "1",
        page_size: "5",
      });
      return HttpResponse.json(activityPage([1, 2, 3, 4, 5]));
    }),
  );
  page();
  const section = await screen.findByRole("region", {
    name: "Recently watched",
  });
  expect(
    screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent),
  ).toEqual([
    "Your watchlist",
    "Recently watched",
    "Popular in theaters",
    "Most anticipated",
  ]);
  const rows = within(section).getAllByRole("listitem");
  expect(rows).toHaveLength(5);
  expect(within(section).getAllByRole("link", { name: "Film 1" })).toHaveLength(
    2,
  );
  for (const [index, row] of rows.entries()) {
    expect(within(row).getByText(`Nov ${14 - index}, 2026`)).toBeVisible();
    expect(within(row).getByText("2020")).toBeVisible();
    expect(within(row).getByRole("link")).toHaveAttribute(
      "href",
      `/movie/${index === 1 ? 1 : index + 1}?from=home`,
    );
  }
  expect(
    within(section).getByRole("img", { name: "Rated 3.5 out of 5 stars" }),
  ).toBeVisible();
  expect(within(section).getByRole("img", { name: "Rewatch" })).toBeVisible();
  expect(within(section).getByAltText("")).toHaveAttribute(
    "src",
    "https://image.tmdb.org/t/p/w92/one.jpg",
  );
  expect(
    within(section).getByRole("link", { name: "See all" }),
  ).toHaveAttribute("href", "/library/history");
  expect(
    within(screen.getByRole("region", { name: "Your watchlist" })).getByRole(
      "link",
      { name: "See all" },
    ),
  ).toHaveAttribute("href", "/watchlist");
});
it("chooses the returning visitor set for viewings alone", async () => {
  server.use(http.get(url, () => HttpResponse.json(activityPage([1]))));
  page();
  expect(
    await screen.findByRole("region", { name: "Recently watched" }),
  ).toBeVisible();
  expect(
    screen.queryByText("Films you add to your watchlist will show up here."),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Welcome back, Movie" }),
  ).toBeVisible();
});
it("shows a failed viewing section and retries it instead of choosing nothing-saved", async () => {
  let fail = true;
  server.use(
    http.get(url, () =>
      fail
        ? HttpResponse.json({ detail: "Unavailable" }, { status: 503 })
        : HttpResponse.json(activityPage([1])),
    ),
  );
  page();
  const section = await screen.findByRole("region", {
    name: "Recently watched",
  });
  expect(within(section).getByText("Couldn't load these films.")).toBeVisible();
  expect(
    screen.queryByText("Films you add to your watchlist will show up here."),
  ).not.toBeInTheDocument();
  fail = false;
  await userEvent
    .setup()
    .click(within(section).getByRole("button", { name: "Retry" }));
  expect(
    await within(section).findByRole("link", { name: "Film 1" }),
  ).toBeVisible();
});
it("omits the section after an empty viewing read and uses nothing-saved", async () => {
  let read = false;
  server.use(
    http.get(url, () => {
      read = true;
      return HttpResponse.json(activityPage([]));
    }),
  );
  page();
  await screen.findByRole("heading", { name: "Welcome, Movie" });
  expect(read).toBe(true);
  expect(
    screen.queryByRole("region", { name: "Recently watched" }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByText("Films you add to your watchlist will show up here."),
  ).toBeVisible();
});
