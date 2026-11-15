import { beforeEach, expect, it } from "vitest";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { apiBaseUrl } from "@/config/baseUrls";
import { useUserMovieState } from "@/hooks/movie/useUserMovieState";
import { useMovieEntries } from "@/hooks/movie/useMovieEntries";
import {
  prepareLibrary,
  renderLibrary,
  scrollLibrary,
} from "@tests/helpers/library";
import { historyEntry, historyPage } from "@tests/helpers/history";
import { createMockUserMovieData } from "@tests/mocks/movieData";
import { gate } from "@tests/helpers/web-locks";
import { server } from "@tests/mocks/server";
import LibraryHistory from "../LibraryHistory";

const url = `${apiBaseUrl}/user-movie-data/history`;
beforeEach(prepareLibrary);
function SaveProbe() {
  const { save } = useUserMovieState(
    1,
    createMockUserMovieData({ tmdb_id: 1, user_watched: true }),
  );
  const { createEntry } = useMovieEntries(1);
  return (
    <>
      <button onClick={() => save({ user_liked: true })}>Save film</button>
      <button
        onClick={() =>
          void createEntry({ watched_on: "2026-11-14", liked: false })
        }
      >
        Log viewing
      </button>
    </>
  );
}
function page() {
  return renderLibrary(
    <>
      <LibraryHistory />
      <SaveProbe />
    </>,
    "/library/history",
  );
}
it("draws month headings, dates, viewing fields and undated reviews as plain text", async () => {
  server.use(
    http.get(url, ({ request }) => {
      expect(Object.fromEntries(new URL(request.url).searchParams)).toEqual({
        page: "1",
        page_size: "100",
      });
      return HttpResponse.json(
        historyPage([
          historyEntry(1, {
            rating: 7,
            rewatch: true,
            poster_path: "/one.jpg",
            review: "First line\nSecond line\nThird line <b>plain</b>",
          }),
          historyEntry(2, {
            kind: "review",
            watched_on: null,
            review: "Undated review",
          }),
          historyEntry(3, {
            day: "2026-10-31",
            watched_on: "2026-10-31",
            release_date: null,
          }),
        ]),
      );
    }),
  );
  page();
  expect(
    await screen.findByRole("heading", { level: 2, name: "November 2026" }),
  ).toBeVisible();
  expect(
    screen.getByRole("heading", { level: 2, name: "October 2026" }),
  ).toBeVisible();
  expect(screen.getAllByText("Nov 14")).toHaveLength(1);
  expect(screen.getByText("Oct 31")).toBeVisible();
  expect(
    screen.getByRole("img", { name: "Rated 3.5 out of 5 stars" }),
  ).toBeVisible();
  const first = screen.getByRole("article", { name: "Entry 1" });
  expect(within(first).getByRole("img", { name: "Rewatch" })).toBeVisible();
  expect(within(first).getByAltText("")).toHaveAttribute(
    "src",
    "https://image.tmdb.org/t/p/w92/one.jpg",
  );
  const review = within(first).getByText(/First line/);
  expect(review).toHaveTextContent("Third line <b>plain</b>");
  expect(getComputedStyle(review).getPropertyValue("-webkit-line-clamp")).toBe(
    "2",
  );
  const second = screen.getByRole("article", { name: "Entry 2" });
  expect(within(second).getByText("Review")).toBeVisible();
  expect(
    within(second).queryByRole("img", { name: "Rewatch" }),
  ).not.toBeInTheDocument();
  expect(screen.getAllByText("2020")).toHaveLength(2);
  expect(screen.getByRole("link", { name: "Entry 1" })).toHaveAttribute(
    "href",
    "/movie/1?from=history",
  );
});
it("shows placeholders then retries a failed first read", async () => {
  const pending = gate();
  let fail = true;
  server.use(
    http.get(url, async () => {
      await pending.wait;
      return fail
        ? HttpResponse.json({ detail: "Unavailable" }, { status: 503 })
        : HttpResponse.json(historyPage([historyEntry(1)]));
    }),
  );
  page();
  expect(screen.getByRole("status", { name: "Loading history" })).toBeVisible();
  pending.release();
  await screen.findByText("Couldn't load your history.");
  fail = false;
  await userEvent.setup().click(screen.getByRole("button", { name: "Retry" }));
  expect(await screen.findByRole("link", { name: "Entry 1" })).toBeVisible();
});
it("ends an empty history on its first page and offers Explore", async () => {
  const reads: number[] = [];
  server.use(
    http.get(url, ({ request }) => {
      reads.push(Number(new URL(request.url).searchParams.get("page")));
      return HttpResponse.json(historyPage([]));
    }),
  );
  page();
  expect(await screen.findByText("Your history is empty")).toBeVisible();
  expect(screen.getByRole("link", { name: "Explore films" })).toHaveAttribute(
    "href",
    "/browse",
  );
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 200));
  });
  expect(reads).toEqual([1]);
});
it("retries a later page, drops repeated entries and stops after its last page", async () => {
  let fail = true;
  const reads: number[] = [];
  server.use(
    http.get(url, ({ request }) => {
      const page = Number(new URL(request.url).searchParams.get("page"));
      reads.push(page);
      if (page === 2 && fail)
        return HttpResponse.json({ detail: "Unavailable" }, { status: 503 });
      return HttpResponse.json(
        historyPage(
          page === 1
            ? Array.from({ length: 100 }, (_, i) => historyEntry(i + 1))
            : [historyEntry(100), historyEntry(101)],
          page,
          2,
          102,
        ),
      );
    }),
  );
  page();
  await screen.findByRole("link", { name: "Entry 1" });
  await scrollLibrary(50000);
  await screen.findByText("Couldn't load your history.");
  const lastRow = screen.getAllByTestId("history-row").at(-1);
  if (!lastRow) throw new Error("Missing loaded timeline rows");
  expect(
    lastRow.compareDocumentPosition(
      screen.getByRole("button", { name: "Retry" }),
    ) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).not.toBe(0);
  fail = false;
  await userEvent.setup().click(screen.getByRole("button", { name: "Retry" }));
  expect(await screen.findByRole("link", { name: "Entry 101" })).toBeVisible();
  expect(screen.getAllByRole("article", { name: "Entry 100" })).toHaveLength(1);
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 200));
  });
  expect(reads).toEqual([1, 2, 2]);
});
it.each(["record", "entry"])(
  "refreshes History after a %s write",
  async (kind) => {
    let changed = false;
    server.use(
      http.get(url, () =>
        HttpResponse.json(
          historyPage([
            historyEntry(1, {
              title: changed ? "Changed history" : "Original history",
            }),
          ]),
        ),
      ),
      http.patch(`${apiBaseUrl}/user-movie-data/1`, () => {
        changed = true;
        return HttpResponse.json(
          createMockUserMovieData({
            tmdb_id: 1,
            user_watched: true,
            user_liked: true,
          }),
        );
      }),
      http.post(`${apiBaseUrl}/user-movie-data/1/entries`, () => {
        changed = true;
        return HttpResponse.json(
          {
            entry: {
              id: 1,
              tmdb_id: 1,
              watched_on: "2026-11-14",
              rating: null,
              review: null,
              rewatch: false,
            },
            record: createMockUserMovieData({
              tmdb_id: 1,
              user_watched: true,
              has_entries: true,
              last_logged_on: "2026-11-14",
            }),
          },
          { status: 201 },
        );
      }),
    );
    page();
    await screen.findByRole("link", { name: "Original history" });
    await userEvent.setup().click(
      screen.getByRole("button", {
        name: kind === "record" ? "Save film" : "Log viewing",
      }),
    );
    expect(
      await screen.findByRole("link", { name: "Changed history" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("link", { name: "Original history" }),
    ).not.toBeInTheDocument();
  },
);
it("does not read a further page while loaded History pages are refetching", async () => {
  const pending = gate();
  const entered = gate();
  let changed = false;
  const reads: number[] = [];
  server.use(
    http.get(url, async ({ request }) => {
      const page = Number(new URL(request.url).searchParams.get("page"));
      reads.push(page);
      if (changed && page === 1) {
        entered.release();
        await pending.wait;
      }
      return HttpResponse.json(
        historyPage(
          page < 3
            ? Array.from({ length: 100 }, (_, i) =>
                historyEntry((page - 1) * 100 + i + 1),
              )
            : [historyEntry(201)],
          page,
          3,
          201,
        ),
      );
    }),
    http.patch(`${apiBaseUrl}/user-movie-data/1`, () => {
      changed = true;
      return HttpResponse.json(
        createMockUserMovieData({ tmdb_id: 1, user_liked: true }),
      );
    }),
  );
  page();
  await screen.findByRole("link", { name: "Entry 1" });
  await scrollLibrary(12000);
  await screen.findByRole("link", { name: "Entry 101" });
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "Save film" }));
  await act(async () => {
    await entered.wait;
  });
  await scrollLibrary(100000);
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 200));
  });
  expect(reads).toEqual([1, 2, 1]);
  pending.release();
  await waitFor(() => expect(reads.slice(0, 4)).toEqual([1, 2, 1, 2]));
});
