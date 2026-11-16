import { useState } from "react";
import { Route, Routes, useNavigate, useSearchParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { BackToCollectionLink } from "@/components/navigation/BackToCollectionLink";
import { clearLibraryScrollMemory } from "@/components/movie/library/libraryScrollMemory";
import { beginUserChange } from "@/lib/session";
import { measuredCollectionGeometry } from "@tests/helpers/measuredCollectionGeometry";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
import LibraryHistory from "@/pages/user/LibraryHistory";

const url = `${apiBaseUrl}/user-movie-data/history`;
beforeEach(prepareLibrary);
afterEach(() => vi.unstubAllGlobals());
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
  await act(async () => {
    await entered.wait;
  });
  const beforeFailure = window.scrollY;
  expect(beforeFailure).toBeGreaterThan(0);
  failure.release();
  await screen.findByText("Couldn't load your history.");
  const lastRow = screen.getAllByTestId("history-row").at(-1);
  if (!lastRow) throw new Error("Missing loaded timeline rows");
  expect(
    lastRow.compareDocumentPosition(
      screen.getByRole("button", { name: "Retry" }),
    ) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).not.toBe(0);
  expect(window.scrollY).toBe(beforeFailure);
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

function HistoryDetail() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [status, setStatus] = useState("");
  return (
    <>
      <h1>Film detail</h1>
      <SaveProbe />
      <BackToCollectionLink searchParams={params} />
      <button onClick={() => void navigate("/library/history")}>
        Open History fresh
      </button>
      <button
        onClick={() => {
          clearLibraryScrollMemory();
          setStatus("Reloaded");
        }}
      >
        Simulate reload
      </button>
      <button
        onClick={() => {
          beginUserChange(client);
          setStatus("User changed");
        }}
      >
        Change user
      </button>
      <output>{status}</output>
    </>
  );
}

describe("measured History returns", () => {
  let geometry: ReturnType<typeof measuredCollectionGeometry>;
  beforeEach(() => {
    clearLibraryScrollMemory();
    geometry = measuredCollectionGeometry();
    server.use(
      http.get(url, () =>
        HttpResponse.json(
          historyPage(
            Array.from({ length: 99 }, (_, i) => historyEntry(i + 1)),
          ),
        ),
      ),
    );
  });
  function journey() {
    return renderLibrary(
      <Routes>
        <Route path="/library/history" element={<LibraryHistory />} />
        <Route path="/movie/:id" element={<HistoryDetail />} />
      </Routes>,
      "/library/history",
    );
  }
  function entryRow(name: string) {
    const row = screen
      .getAllByTestId("history-row")
      .find((row) => within(row).queryByRole("article", { name }));
    if (!row) throw new Error(`Missing history row for ${name}`);
    return row;
  }
  async function openDeep() {
    await screen.findByRole("link", { name: "Entry 1" });
    for (let offset = 500; offset <= 6500; offset += 500)
      await scrollLibrary(offset);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 250));
    });
    expect(entryRow("Entry 20")).toHaveStyle({
      transform: "translateY(6000px)",
    });
    await userEvent
      .setup()
      .click(screen.getByRole("link", { name: "Entry 20" }));
    await screen.findByRole("heading", { name: "Film detail" });
    await scrollLibrary(0);
    geometry.stopMeasuring();
  }
  it("restores a deep position over the measured timeline rows", async () => {
    journey();
    await openDeep();
    await userEvent
      .setup()
      .click(screen.getByRole("link", { name: "Back to History" }));
    await waitFor(() => expect(window.scrollY).toBe(6500));
    expect(entryRow("Entry 20")).toHaveStyle({
      transform: "translateY(6000px)",
    });
  });
  it("keeps an entry's measured height when a logged viewing adds a row before it", async () => {
    let changed = false;
    server.use(
      http.get(url, () =>
        HttpResponse.json(
          historyPage([
            ...(changed
              ? [historyEntry(1001, { tmdb_id: 1, title: "Entry 1" })]
              : []),
            ...Array.from({ length: 99 }, (_, i) => historyEntry(i + 1)),
          ]),
        ),
      ),
      http.post(`${apiBaseUrl}/user-movie-data/1/entries`, () => {
        changed = true;
        return HttpResponse.json(
          {
            entry: {
              id: 1001,
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
    journey();
    await openDeep();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Log viewing" }));
    await userEvent
      .setup()
      .click(screen.getByRole("link", { name: "Back to History" }));
    await waitFor(() => {
      const row = entryRow("Entry 20");
      expect(row).toHaveStyle({ transform: "translateY(6100px)" });
    });
    expect(entryRow("Entry 21")).toHaveStyle({
      transform: "translateY(6400px)",
    });
    expect(window.scrollY).toBe(6500);
  });
  it.each(["fresh", "reload", "user"])(
    "starts without old heights after %s",
    async (mode) => {
      journey();
      await openDeep();
      const user = userEvent.setup();
      if (mode === "reload")
        await user.click(
          screen.getByRole("button", { name: "Simulate reload" }),
        );
      if (mode === "user")
        await user.click(screen.getByRole("button", { name: "Change user" }));
      await user.click(
        screen.getByRole(mode === "fresh" ? "button" : "link", {
          name: mode === "fresh" ? "Open History fresh" : "Back to History",
        }),
      );
      await waitFor(() => expect(window.scrollY).toBe(0));
      // Unmeasurable rows have zero height here; their offsets expose any old cache.
      await waitFor(() =>
        expect(screen.getAllByTestId("history-row")[0]).toHaveStyle({
          transform: "translateY(0px)",
        }),
      );
      if (mode === "reload" || mode === "fresh") {
        // Opening a film without scrolling must not revive the previous visit's position.
        const firstLink = screen
          .getAllByRole("link")
          .find((link) => link.getAttribute("href")?.includes("from=history"));
        if (!firstLink) throw new Error("Missing returned history entry");
        await user.click(firstLink);
        await user.click(screen.getByRole("link", { name: "Back to History" }));
        await waitFor(() => expect(window.scrollY).toBe(0));
      }
    },
  );
});
