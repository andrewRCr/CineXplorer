import { measuredCollectionGeometry } from "@tests/helpers/measuredCollectionGeometry";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, screen, waitFor, within } from "@testing-library/react";
import { HttpResponse, http } from "msw/http";
import { server } from "@tests/mocks/server";
import { apiBaseUrl } from "@/config/baseUrls";
import {
  filmPage,
  prepareLibrary,
  renderLibrary,
} from "@tests/helpers/library";
import userEvent from "@testing-library/user-event";
import { gate } from "@tests/helpers/web-locks";
import { scrollLibrary, storedFilm } from "@tests/helpers/library";
import LibraryGrid from "@/components/movie/library/LibraryGrid";

const url = `${apiBaseUrl}/user-movie-data/movies`;
beforeEach(prepareLibrary);
afterEach(() => vi.unstubAllGlobals());
function grid() {
  return renderLibrary(
    <LibraryGrid
      params={{ watchlist: true }}
      source="watchlist"
      errorMessage="Couldn't load your watchlist."
      empty={<p>Empty collection</p>}
    />,
  );
}
it("reads a hundred cards and lays out measured fluid rows", async () => {
  server.use(
    http.get(url, ({ request }) => {
      const params = new URL(request.url).searchParams;
      expect(Object.fromEntries(params)).toMatchObject({
        watchlist: "true",
        page: "1",
        page_size: "100",
      });
      return HttpResponse.json(filmPage([1, 2, 3, 4, 5, 6]));
    }),
  );
  grid();
  expect(
    (await screen.findAllByRole("link", { name: "Film 1" }))[0],
  ).toBeVisible();
  const rows = screen.getAllByRole("row");
  expect(rows).toHaveLength(3);
  const firstRow = rows[0];
  if (!firstRow) throw new Error("Missing first row");
  expect(
    within(firstRow).getAllByRole("link", { name: "Film 2" })[0],
  ).toBeVisible();
  expect(rows[2]).toHaveStyle({ transform: "translateY(632px)" });
});

it("shows placeholders while waiting, then retries a failed first page", async () => {
  const pending = gate();
  let failed = true;
  server.use(
    http.get(url, async () => {
      await pending.wait;
      return failed
        ? HttpResponse.json({ detail: "Unavailable" }, { status: 503 })
        : HttpResponse.json(filmPage([1]));
    }),
  );
  grid();
  expect(screen.getByRole("status", { name: "Loading films" })).toBeVisible();
  pending.release();
  expect(
    await screen.findByText("Couldn't load your watchlist."),
  ).toBeVisible();
  failed = false;
  await userEvent.setup().click(screen.getByRole("button", { name: "Retry" }));
  expect(
    (await screen.findAllByRole("link", { name: "Film 1" }))[0],
  ).toBeVisible();
});

it("ends an empty collection at the first page", async () => {
  const pages: string[] = [];
  server.use(
    http.get(url, ({ request }) => {
      pages.push(new URL(request.url).searchParams.get("page") ?? "");
      return HttpResponse.json(filmPage([], 1, 0));
    }),
  );
  grid();
  expect(await screen.findByText("Empty collection")).toBeVisible();
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 200));
  });
  expect(pages).toEqual(["1"]);
});

it("retries a later page, drops repeats and stops at the last page", async () => {
  measuredCollectionGeometry();
  const entered = gate();
  const failure = gate();
  let fail = true;
  const reads: number[] = [];
  server.use(
    http.get(url, async ({ request }) => {
      const page = Number(new URL(request.url).searchParams.get("page"));
      reads.push(page);
      if (page === 2 && fail) {
        entered.release();
        await failure.wait;
        return HttpResponse.json({ detail: "Unavailable" }, { status: 503 });
      }
      return HttpResponse.json({
        ...filmPage(
          page === 1
            ? Array.from({ length: 100 }, (_, i) => i + 1)
            : [100, 101],
          page,
          2,
        ),
        total_results: 102,
      });
    }),
  );
  grid();
  await screen.findAllByRole("link", { name: "Film 1" });
  await scrollLibrary(22000);
  await act(async () => {
    await entered.wait;
  });
  const beforeFailure = window.scrollY;
  expect(beforeFailure).toBeGreaterThan(0);
  failure.release();
  expect(
    await screen.findByText("Couldn't load your watchlist."),
  ).toBeVisible();
  expect(window.scrollY).toBe(beforeFailure);
  fail = false;
  await userEvent.setup().click(screen.getByRole("button", { name: "Retry" }));
  expect(
    (await screen.findAllByRole("link", { name: "Film 101" }))[0],
  ).toBeVisible();
  const cells = screen.getAllByRole("gridcell");
  expect(
    cells.filter(
      (cell) =>
        within(cell).queryAllByRole("link", { name: "Film 100" }).length > 0,
    ),
  ).toHaveLength(1);
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 200));
  });
  expect(reads).toEqual([1, 2, 2]);
});

it("refetches loaded pages in order after a save without reading ahead during the refetch", async () => {
  const held = gate();
  const entered = gate();
  let changed = false;
  const reads: number[] = [];
  server.use(
    http.get(url, async ({ request }) => {
      const page = Number(new URL(request.url).searchParams.get("page"));
      reads.push(page);
      if (changed && page === 1) {
        entered.release();
        await held.wait;
      }
      return HttpResponse.json({
        ...filmPage(
          page < 3
            ? Array.from(
                { length: 100 },
                (_, i) => i + (page - 1) * 100 + (changed ? 2 : 1),
              )
            : [changed ? 202 : 201],
          page,
          3,
        ),
        total_results: 201,
      });
    }),
    http.patch(`${apiBaseUrl}/user-movie-data/1`, () => {
      changed = true;
      return HttpResponse.json({
        ...storedFilm(1).user_movie_data,
        user_on_watchlist: false,
      });
    }),
  );
  grid();
  await screen.findAllByRole("link", { name: "Film 1" });
  await scrollLibrary(22000);
  await screen.findAllByRole("link", { name: "Film 101" });
  await scrollLibrary(0);
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Actions for Film 1" }));
  await user.click(screen.getByRole("menuitemcheckbox", { name: "Watchlist" }));
  await act(async () => {
    await entered.wait;
  });
  await scrollLibrary(44000);
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 200));
  });
  expect(reads).toEqual([1, 2, 1]);
  await act(async () => {
    held.release();
  });
  expect(
    (await screen.findAllByRole("link", { name: "Film 201" }))[0],
  ).toBeVisible();
  expect(reads.slice(0, 4)).toEqual([1, 2, 1, 2]);
  await scrollLibrary(0);
  await waitFor(() =>
    expect(screen.queryAllByRole("link", { name: "Film 1" })).toHaveLength(0),
  );
});

it("retries a save refetch on a complete list instead of reading a next page", async () => {
  let changed = false;
  let fail = false;
  const reads: string[] = [];
  server.use(
    http.get(url, ({ request }) => {
      reads.push(new URL(request.url).searchParams.get("page") ?? "");
      if (fail)
        return HttpResponse.json({ detail: "Unavailable" }, { status: 503 });
      return HttpResponse.json(filmPage(changed ? [] : [1]));
    }),
    http.patch(`${apiBaseUrl}/user-movie-data/1`, () => {
      changed = true;
      fail = true;
      return HttpResponse.json({
        ...storedFilm(1).user_movie_data,
        user_on_watchlist: false,
      });
    }),
  );
  grid();
  await screen.findAllByRole("link", { name: "Film 1" });
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Actions for Film 1" }));
  await user.click(screen.getByRole("menuitemcheckbox", { name: "Watchlist" }));
  await screen.findByText("Couldn't load your watchlist.");
  fail = false;
  await userEvent.setup().click(screen.getByRole("button", { name: "Retry" }));
  expect(await screen.findByText("Empty collection")).toBeVisible();
  expect(reads).toEqual(["1", "1", "1"]);
  expect(screen.queryAllByRole("link", { name: "Film 1" })).toHaveLength(0);
});
