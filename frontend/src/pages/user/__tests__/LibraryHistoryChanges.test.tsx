import { Route, Routes, useSearchParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { libraryKey } from "@/lib/queries";
import { beginUserChange } from "@/lib/session";
import { BackToCollectionLink } from "@/components/navigation/BackToCollectionLink";
import { beforeEach, expect, it } from "vitest";
import { act, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { gate } from "@tests/helpers/web-locks";
import { http, HttpResponse } from "msw/http";
import { apiBaseUrl } from "@/config/baseUrls";
import { clearLibraryScrollMemory } from "@/components/movie/library/libraryScrollMemory";
import {
  prepareLibrary,
  renderLibrary,
  scrollLibrary,
} from "@tests/helpers/library";
import {
  historyChanges,
  historyPage,
  historyEntry,
} from "@tests/helpers/history";
import { server } from "@tests/mocks/server";
import LibraryHistory from "@/pages/user/LibraryHistory";

const url = `${apiBaseUrl}/user-movie-data/history`;
beforeEach(() => {
  prepareLibrary();
  clearLibraryScrollMemory();
});

it.each([
  ["watchlist", "Added to your watchlist"],
  ["watched", "Marked watched"],
  ["liked", "Liked"],
  ["rating", "Rated"],
] as const)(
  "draws three %s changes as quiet rows with film links",
  async (field, label) => {
    server.use(
      http.get(url, () =>
        HttpResponse.json(historyPage([historyChanges(field, [3, 2, 1])])),
      ),
    );
    renderLibrary(<LibraryHistory />, "/library/history");
    expect(await screen.findAllByText(label)).toHaveLength(3);
    expect(screen.getAllByText("Nov 14")).toHaveLength(1);
    expect(
      screen.queryByRole("button", { name: /Show all/ }),
    ).not.toBeInTheDocument();
    for (const id of [3, 2, 1]) {
      const row = screen.getByRole("article", { name: `${label}: Film ${id}` });
      expect(
        within(row).getByRole("link", { name: `Film ${id}` }),
      ).toHaveAttribute("href", `/movie/${id}?from=history`);
      expect(within(row).getByAltText("")).toHaveAttribute(
        "src",
        `https://image.tmdb.org/t/p/w92/film-${id}.jpg`,
      );
      if (field === "rating")
        expect(
          within(row).getByRole("img", { name: "Rated 4 out of 5 stars" }),
        ).toBeVisible();
    }
  },
);

it.each([
  ["watchlist", "Added 4 films to your watchlist"],
  ["watched", "Marked 4 films watched"],
  ["liked", "Liked 4 films"],
  ["rating", "Rated 4 films"],
] as const)("groups four %s changes behind Show all", async (field, label) => {
  server.use(
    http.get(url, () =>
      HttpResponse.json(historyPage([historyChanges(field, [4, 3, 2, 1])])),
    ),
  );
  renderLibrary(<LibraryHistory />, "/library/history");
  expect(await screen.findByText(label)).toBeVisible();
  const group = screen.getByRole("group", { name: `${label}: Nov 14, 2026` });
  expect(within(group).getAllByAltText("")).toHaveLength(4);
  expect(
    within(group).getByRole("button", { name: "Show all 4" }),
  ).toHaveAttribute("aria-expanded", "false");
  expect(within(group).queryByRole("link")).not.toBeInTheDocument();
});

it("expands sampled films, retries each failed page and explicitly pages to the end", async () => {
  const ids = Array.from({ length: 104 }, (_, i) => 104 - i);
  const group = historyChanges("watched", ids);
  const loading = gate();
  const reads: number[] = [];
  let failFirst = true;
  let failNext = true;
  server.use(
    http.get(url, () => HttpResponse.json(historyPage([group]))),
    http.get(`${url}/changes`, async ({ request }) => {
      const params = new URL(request.url).searchParams;
      expect(Object.fromEntries(params)).toEqual({
        day: group.day,
        field: "watched",
        page: expect.any(String),
        page_size: "100",
      });
      const page = Number(params.get("page"));
      reads.push(page);
      await loading.wait;
      if ((page === 1 && failFirst) || (page === 2 && failNext))
        return HttpResponse.json({ detail: "Unavailable" }, { status: 503 });
      const films = ids
        .slice(page === 1 ? 0 : 100, page === 1 ? 100 : 104)
        .map((id) => historyChanges("watched", [id]).films[0]);
      return HttpResponse.json({
        page,
        total_pages: 2,
        total_results: 104,
        results: films,
      });
    }),
  );
  renderLibrary(<LibraryHistory />, "/library/history");
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "Show all 104" }));
  expect(screen.getByRole("status", { name: "Loading changes" })).toBeVisible();
  loading.release();
  await screen.findByRole("button", { name: "Retry" });
  failFirst = false;
  await user.click(screen.getByRole("button", { name: "Retry" }));
  expect(await screen.findByRole("link", { name: "Film 104" })).toHaveAttribute(
    "href",
    "/movie/104?from=history",
  );
  expect(screen.getAllByRole("article")).toHaveLength(100);
  expect(screen.getAllByText("Nov 14")).toHaveLength(1);
  expect(reads.every((page) => page === 1)).toBe(true);
  await user.click(screen.getByRole("button", { name: "Show more" }));
  await screen.findByRole("button", { name: "Retry" });
  expect(screen.getByRole("link", { name: "Film 104" })).toBeVisible();
  failNext = false;
  await user.click(screen.getByRole("button", { name: "Retry" }));
  expect(await screen.findByRole("link", { name: "Film 1" })).toBeVisible();
  expect(screen.getAllByRole("article")).toHaveLength(104);
  expect(
    screen.queryByRole("button", { name: "Show more" }),
  ).not.toBeInTheDocument();
  expect(reads.slice(-2)).toEqual([2, 2]);
  await user.click(screen.getByRole("button", { name: "Show fewer" }));
  expect(
    screen.queryByRole("link", { name: "Film 104" }),
  ).not.toBeInTheDocument();
  expect(screen.getAllByAltText("")).toHaveLength(8);
});

function ChangeUser() {
  const client = useQueryClient();
  return <button onClick={() => beginUserChange(client)}>Change user</button>;
}
function Detail() {
  const [params] = useSearchParams();
  return (
    <>
      <h1>Film detail</h1>
      <BackToCollectionLink searchParams={params} />
      <ChangeUser />
    </>
  );
}
it("keeps an expanded group on a film return and collapses all groups on a change of user", async () => {
  server.use(
    http.get(url, () =>
      HttpResponse.json(
        historyPage([
          historyChanges("liked", [4, 3, 2, 1]),
          historyChanges("watched", [8, 7, 6, 5]),
        ]),
      ),
    ),
    http.get(`${url}/changes`, ({ request }) => {
      const ids =
        new URL(request.url).searchParams.get("field") === "liked"
          ? [4, 3, 2, 1]
          : [8, 7, 6, 5];
      return HttpResponse.json({
        page: 1,
        total_pages: 1,
        total_results: 4,
        results: historyChanges("liked", ids).films,
      });
    }),
  );
  renderLibrary(
    <Routes>
      <Route
        path="/library/history"
        element={
          <>
            <LibraryHistory />
            <ChangeUser />
          </>
        }
      />
      <Route path="/movie/:id" element={<Detail />} />
    </Routes>,
    "/library/history",
  );
  const user = userEvent.setup();
  await user.click(
    within(
      await screen.findByRole("group", { name: "Liked 4 films: Nov 14, 2026" }),
    ).getByRole("button", { name: "Show all 4" }),
  );
  await user.click(screen.getByRole("button", { name: "Show all 4" }));
  await user.click(await screen.findByRole("link", { name: "Film 4" }));
  await user.click(screen.getByRole("link", { name: "Back to History" }));
  expect(await screen.findByRole("link", { name: "Film 4" })).toBeVisible();
  expect(screen.getByRole("link", { name: "Film 8" })).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Change user" }));
  await waitFor(() =>
    expect(screen.getAllByRole("button", { name: "Show all 4" })).toHaveLength(
      2,
    ),
  );
  expect(
    screen.queryByRole("link", { name: "Film 4" }),
  ).not.toBeInTheDocument();
});

it("draws a group only once when a later timeline page repeats its day and field", async () => {
  const group = historyChanges("liked", [4, 3, 2, 1]);
  const second = gate();
  server.use(
    http.get(url, async ({ request }) => {
      const page = Number(new URL(request.url).searchParams.get("page"));
      if (page === 2) {
        second.release();
        return HttpResponse.json(historyPage([group], 2, 2, 101));
      }
      return HttpResponse.json(
        historyPage(
          [group, ...Array.from({ length: 99 }, (_, i) => historyEntry(i + 1))],
          1,
          2,
          101,
        ),
      );
    }),
  );
  renderLibrary(<LibraryHistory />, "/library/history");
  await screen.findByRole("button", { name: "Show all 4" });
  for (let position = 500; position <= 29500; position += 500)
    await scrollLibrary(position);
  await act(async () => second.wait);
  await waitFor(() =>
    expect(
      screen.queryByLabelText("Loading more history"),
    ).not.toBeInTheDocument(),
  );
  expect(
    screen.queryByRole("button", { name: "Show all 4" }),
  ).not.toBeInTheDocument();
  await scrollLibrary(0);
  expect(
    await screen.findAllByRole("button", { name: "Show all 4" }),
  ).toHaveLength(1);
});

function RefreshHistory() {
  const client = useQueryClient();
  return (
    <button
      onClick={() => void client.invalidateQueries({ queryKey: libraryKey })}
    >
      Refresh History
    </button>
  );
}
it("keeps Show more disabled during a group refetch", async () => {
  const pending = gate();
  const entered = gate();
  let refreshing = false;
  const reads: number[] = [];
  const group = historyChanges(
    "watched",
    Array.from({ length: 101 }, (_, i) => i + 1),
  );
  server.use(
    http.get(url, () => HttpResponse.json(historyPage([group]))),
    http.get(`${url}/changes`, async ({ request }) => {
      const page = Number(new URL(request.url).searchParams.get("page"));
      reads.push(page);
      if (refreshing) {
        entered.release();
        await pending.wait;
      }
      return HttpResponse.json({
        page,
        total_pages: 2,
        total_results: 101,
        results: Array.from(
          { length: page === 1 ? 100 : 1 },
          (_, i) =>
            historyChanges("watched", [page === 1 ? i + 1 : 101]).films[0],
        ),
      });
    }),
  );
  renderLibrary(
    <>
      <LibraryHistory />
      <RefreshHistory />
    </>,
    "/library/history",
  );
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "Show all 101" }));
  await screen.findByRole("link", { name: "Film 1" });
  refreshing = true;
  await user.click(screen.getByRole("button", { name: "Refresh History" }));
  await entered.wait;
  const more = screen.getByRole("button", { name: "Show more" });
  expect(more).toBeDisabled();
  await user.click(more);
  expect(reads).toEqual([1, 1]);
  pending.release();
  await waitFor(() => expect(more).toBeEnabled());
  await user.click(more);
  expect(await screen.findByRole("link", { name: "Film 101" })).toBeVisible();
});
