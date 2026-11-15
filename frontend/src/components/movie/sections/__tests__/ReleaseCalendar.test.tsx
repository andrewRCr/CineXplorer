import { it, expect, beforeEach, afterEach, onTestFinished } from "vitest";
import {
  render,
  screen,
  within,
  waitFor,
  act,
} from "@tests/helpers/test-renderer";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { server } from "@tests/mocks/server";
import { apiBaseUrl } from "@/config/baseUrls";
import {
  createMockMovieListItem,
  createMockMoviePage,
} from "@tests/mocks/movieData";
import { gate } from "@tests/helpers/web-locks";
import {
  Toaster,
  toaster,
  priorityToaster,
} from "@/components/core/chakra/toaster";
import { homeWindowQuery } from "@/lib/queries";
import { ReleaseCalendar } from "@/components/movie/sections/ReleaseCalendar";
import { PosterRowSection } from "@/components/movie/sections/PosterRowSection";

function clearToasts() {
  act(() => {
    toaster.remove();
    priorityToaster.remove();
  });
}
beforeEach(clearToasts);
afterEach(clearToasts);

it("keeps its named heading and loading placeholders until opening films arrive", async () => {
  const pending = gate();
  onTestFinished(() => pending.release());
  server.use(
    http.get(`${apiBaseUrl}/movies/upcoming`, async () => {
      await pending.wait;
      return HttpResponse.json(
        createMockMoviePage([
          createMockMovieListItem({
            tmdb_id: 550,
            title: "Opening after loading",
            release_date: "2026-11-20",
          }),
        ]),
      );
    }),
  );
  render(
    <ReleaseCalendar
      title="Most anticipated"
      query={homeWindowQuery("upcoming")}
    />,
  );
  const region = screen.getByRole("region", { name: "Most anticipated" });
  expect(
    within(region).getByRole("heading", { level: 2, name: "Most anticipated" }),
  ).toBeInTheDocument();
  const loading = within(region).getByRole("status", {
    name: "Loading Most anticipated",
  });
  expect(loading).toBeVisible();
  expect(loading).not.toBeEmptyDOMElement();
  expect(
    within(region).queryByRole("heading", { level: 3 }),
  ).not.toBeInTheDocument();
  pending.release();
  expect(
    await within(region).findByRole("link", { name: /Opening after loading/ }),
  ).toHaveAttribute("href", "/movie/550?from=home");
  expect(within(region).queryByRole("status")).not.toBeInTheDocument();
});

it("removes its section after an empty calendar read settles", async () => {
  const pending = gate();
  onTestFinished(() => pending.release());
  server.use(
    http.get(`${apiBaseUrl}/movies/upcoming`, async () => {
      await pending.wait;
      return HttpResponse.json(createMockMoviePage([]));
    }),
  );
  render(
    <ReleaseCalendar
      title="Most anticipated"
      query={homeWindowQuery("upcoming")}
    />,
  );
  expect(
    screen.getByRole("status", { name: "Loading Most anticipated" }),
  ).toBeInTheDocument();
  pending.release();
  await waitFor(() =>
    expect(
      screen.queryByRole("region", { name: "Most anticipated" }),
    ).not.toBeInTheDocument(),
  );
  expect(
    screen.queryByRole("heading", { name: "Most anticipated" }),
  ).not.toBeInTheDocument();
});

it("keeps failures quiet and retries the calendar alone while its sibling stays visible", async () => {
  const retry = gate();
  onTestFinished(() => retry.release());
  let calendarReads = 0;
  let theaterReads = 0;
  server.use(
    http.get(`${apiBaseUrl}/movies/upcoming`, async () => {
      if (++calendarReads === 1)
        return HttpResponse.json({ detail: "Unavailable" }, { status: 500 });
      await retry.wait;
      return HttpResponse.json(
        createMockMoviePage([
          createMockMovieListItem({
            title: "Recovered opening",
            release_date: "2026-11-20",
          }),
        ]),
      );
    }),
    http.get(`${apiBaseUrl}/movies/now-playing`, () =>
      HttpResponse.json(
        createMockMoviePage([
          createMockMovieListItem({ title: `Theater read ${++theaterReads}` }),
        ]),
      ),
    ),
  );
  render(
    <>
      <PosterRowSection
        title="Popular in theaters"
        query={homeWindowQuery("now-playing")}
      />
      <ReleaseCalendar
        title="Most anticipated"
        query={homeWindowQuery("upcoming")}
      />
      <Toaster />
    </>,
  );
  const region = screen.getByRole("region", { name: "Most anticipated" });
  expect(
    await within(region).findByText("Couldn't load these films."),
  ).toBeInTheDocument();
  expect(
    within(region).getByRole("heading", { level: 2, name: "Most anticipated" }),
  ).toBeInTheDocument();
  await screen.findByText("Theater read 1");
  expect(screen.queryByText("Server error")).not.toBeInTheDocument();
  await userEvent
    .setup()
    .click(within(region).getByRole("button", { name: "Retry" }));
  expect(
    await within(region).findByRole("status", {
      name: "Loading Most anticipated",
    }),
  ).toBeInTheDocument();
  expect(screen.getByText("Theater read 1")).toBeInTheDocument();
  expect(
    within(region).queryByText("Couldn't load these films."),
  ).not.toBeInTheDocument();
  retry.release();
  await within(region).findByRole("link", { name: /Recovered opening/ });
  expect(within(region).queryByRole("status")).not.toBeInTheDocument();
  expect(screen.getByText("Theater read 1")).toBeInTheDocument();
  expect(calendarReads).toBe(2);
  expect(theaterReads).toBe(1);
  expect(screen.queryByText("Server error")).not.toBeInTheDocument();
});

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
