import { it, expect } from "vitest";
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
import { createMockMovieListItem } from "@tests/mocks/movieData";
import { gate } from "@tests/helpers/web-locks";
import {
  Toaster,
  priorityToaster,
  toaster,
} from "@/components/core/chakra/toaster";
import { homeWindowQuery } from "@/lib/queries";
import { getHomePaginationContextId } from "@/services/paginationContext";
import { PosterRowSection } from "@/components/movie/sections/PosterRowSection";

it("holds the heading and placeholders until films arrive, then caps a named list at twenty", async () => {
  const pending = gate();
  server.use(
    http.get(`${apiBaseUrl}/movies/now-playing`, async ({ request }) => {
      expect(request.headers.get("X-Pagination-Context")).toBe(
        getHomePaginationContextId(),
      );
      await pending.wait;
      return HttpResponse.json({
        results: Array.from({ length: 25 }, (_, i) =>
          createMockMovieListItem({
            tmdb_id: i,
            title: `Film ${i}`,
            poster_path: null,
          }),
        ),
      });
    }),
  );
  render(
    <PosterRowSection
      title="Popular in theaters"
      seeAll="/browse/now-playing"
      query={homeWindowQuery("now-playing")}
    />,
  );
  const section = screen.getByRole("region", { name: "Popular in theaters" });
  expect(within(section).getByRole("status")).toBeInTheDocument();
  expect(
    within(section).getByRole("link", { name: "See all" }),
  ).toHaveAttribute("href", "/browse/now-playing");
  pending.release();
  await screen.findByText("Film 0");
  expect(within(section).getAllByRole("listitem")).toHaveLength(20);
  expect(
    within(section).getByRole("img", { name: "Film 0" }),
  ).toBeInTheDocument();
  expect(
    within(section).getAllByRole("link", { name: "Film 0" })[0],
  ).toHaveAttribute("href", "/movie/0?from=home");
});

it("hides an empty section", async () => {
  server.use(
    http.get(`${apiBaseUrl}/movies/now-playing`, () =>
      HttpResponse.json({ results: [] }),
    ),
  );
  render(
    <PosterRowSection
      title="Empty films"
      query={homeWindowQuery("now-playing")}
    />,
  );
  await waitFor(() =>
    expect(screen.queryByRole("region")).not.toBeInTheDocument(),
  );
});

it("retries only its failed read and keeps failures out of the global toast", async () => {
  act(() => {
    toaster.remove();
    priorityToaster.remove();
  });
  let reads = 0;
  let siblings = 0;
  server.use(
    http.get(`${apiBaseUrl}/movies/now-playing`, () =>
      ++reads === 1
        ? HttpResponse.json({}, { status: 500 })
        : HttpResponse.json({
            results: [createMockMovieListItem({ title: "Recovered" })],
          }),
    ),
    http.get(`${apiBaseUrl}/movies/upcoming`, ({ request }) => {
      expect(request.headers.get("X-Pagination-Context")).toBe(
        getHomePaginationContextId(),
      );
      siblings++;
      return HttpResponse.json({
        results: [createMockMovieListItem({ title: "Sibling" })],
      });
    }),
  );
  render(
    <>
      <PosterRowSection
        title="Theaters"
        query={homeWindowQuery("now-playing")}
      />
      <PosterRowSection title="Upcoming" query={homeWindowQuery("upcoming")} />
      <Toaster />
    </>,
  );
  expect(
    await screen.findByText("Couldn't load these films."),
  ).toBeInTheDocument();
  expect(screen.queryByText("Server error")).not.toBeInTheDocument();
  expect(
    screen.queryByRole("link", { name: "See all" }),
  ).not.toBeInTheDocument();
  await userEvent.setup().click(screen.getByRole("button", { name: "Retry" }));
  await screen.findByText("Recovered");
  expect(reads).toBe(2);
  expect(siblings).toBe(1);
});
