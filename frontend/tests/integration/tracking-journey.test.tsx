import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw/http";
import { delay } from "msw";
import App from "@/App";
import { ThemeSelectProvider } from "@/components/core/chakra/theme-provider";
import { Toaster, toaster } from "@/components/core/chakra/toaster";
import { apiBaseUrl } from "@/config/baseUrls";
import { setAuthTokens } from "@/utilities/tokenUtils";
import type { MovieEntries } from "@/services/userMovieDataService";
import { TestProviders } from "@tests/helpers/test-providers";
import { authHandlers, clearBrowserAuth, token } from "@tests/helpers/auth";
import { waitForFocusWithin } from "@tests/helpers/focus";
import {
  createMockMovieDetail,
  createMockMovieListItem,
  createMockUserMovieData,
} from "@tests/mocks/movieData";
import { server } from "@tests/mocks/server";

const title = "A film to remember";
const today = "2026-11-14";
const initial = createMockUserMovieData({ tmdb_id: 550 });
const queued = { ...initial, user_on_watchlist: true };
const firstLog = {
  ...queued,
  user_watched: true,
  user_on_watchlist: false,
  user_rating: 7,
  has_entries: true,
  last_logged_on: today,
};
const requeued = { ...firstLog, user_on_watchlist: true };
const secondLog = { ...firstLog, user_rating: 10 };
const firstEntry = {
  id: 1,
  tmdb_id: 550,
  watched_on: today,
  rating: 7,
  review: "First viewing",
  rewatch: false,
};
const secondEntry = {
  id: 2,
  tmdb_id: 550,
  watched_on: today,
  rating: 10,
  review: "Second viewing",
  rewatch: true,
};
let record = initial;
let entries: MovieEntries["entries"] = [];
let patches: unknown[] = [];
let creates: unknown[] = [];
let initialBrowseDelay = 0;

function alignLocation(url: string | URL | null | undefined) {
  if (url == null) return;
  const next = new URL(String(url), window.location.href);
  window.location.pathname = next.pathname;
  window.location.search = next.search;
  window.location.hash = next.hash;
  window.location.href = next.href;
}
function isRendered(element: HTMLElement | null): boolean {
  if (!element) return true;
  const style = getComputedStyle(element);
  if (
    element.hidden ||
    style.display === "none" ||
    style.visibility === "hidden"
  )
    return false;
  return isRendered(element.parentElement);
}
function start() {
  // The test environment has a writable location; keep it aligned with native history updates.
  const push = window.history.pushState.bind(window.history);
  const replace = window.history.replaceState.bind(window.history);
  vi.spyOn(window.history, "pushState").mockImplementation(
    (data, unused, url) => {
      push(data, unused, url);
      alignLocation(url);
    },
  );
  vi.spyOn(window.history, "replaceState").mockImplementation(
    (data, unused, url) => {
      replace(data, unused, url);
      alignLocation(url);
    },
  );
  window.history.replaceState({}, "", "/browse");
  return render(
    <ThemeSelectProvider>
      <TestProviders>
        <App />
        <Toaster />
      </TestProviders>
    </ThemeSelectProvider>,
  );
}
const actions = () =>
  screen.getByRole("group", { name: `Your actions for ${title}` });
const nav = () => screen.getByRole("navigation", { name: "Main" });
// A route's first visit loads its module, which alone can outlast the default second on a slow runner.
const coldRoute = { timeout: 5000 };

async function visitFilm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(within(nav()).getByRole("link", { name: "Explore" }));
  const links = await screen.findAllByRole("link", { name: title });
  const link = links[0];
  if (!link) throw new Error("Expected a film link");
  await user.click(link);
  await screen.findByRole("heading", { name: title }, coldRoute);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-14T18:00:00Z"));
  clearBrowserAuth();
  authHandlers();
  setAuthTokens(token());
  act(() => toaster.remove());
  record = initial;
  entries = [];
  patches = [];
  creates = [];
  vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
    matches: query === "(hover: hover)" || query.includes("min-width"),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  // Zag determines focusability from layout boxes, which jsdom does not calculate.
  const clientRects = HTMLElement.prototype.getClientRects;
  vi.spyOn(HTMLElement.prototype, "getClientRects").mockImplementation(
    function (this: HTMLElement) {
      // eslint-disable-next-line testing-library/no-node-access -- Scope layout boxes to the open dialog.
      const dialog = this.closest('[role="dialog"][data-state="open"]');
      if (!this.isConnected || !dialog || !isRendered(this))
        return clientRects.call(this);
      const rect = new DOMRect(0, 0, 100, 24);
      return Object.assign([rect], {
        item: (index: number) => (index === 0 ? rect : null),
      });
    },
  );
  server.use(
    http.get(`${apiBaseUrl}/movies/browse`, async () => {
      const firstResponseDelay = initialBrowseDelay;
      initialBrowseDelay = 0;
      await delay(firstResponseDelay);
      return HttpResponse.json({
        page: 1,
        total_pages: 1,
        total_results: 1,
        next_tmdb_page_start: null,
        results: [
          createMockMovieListItem({
            tmdb_id: 550,
            title,
            user_movie_data: record,
          }),
        ],
      });
    }),
    http.get(`${apiBaseUrl}/movies/550`, () =>
      HttpResponse.json(
        createMockMovieDetail({ tmdb_id: 550, title, user_movie_data: record }),
      ),
    ),
    http.get(`${apiBaseUrl}/user-movie-data/550/entries`, () =>
      HttpResponse.json({ record, entries } satisfies MovieEntries),
    ),
    http.get(`${apiBaseUrl}/user-movie-data/movies`, () => {
      const results = record.user_on_watchlist
        ? [
            createMockMovieListItem({
              tmdb_id: 550,
              title,
              user_movie_data: record,
            }),
          ]
        : [];
      return HttpResponse.json({
        page: 1,
        total_pages: results.length ? 1 : 0,
        total_results: results.length,
        results,
      });
    }),
    http.patch(`${apiBaseUrl}/user-movie-data/550`, async ({ request }) => {
      patches.push(await request.json());
      record = patches.length === 1 ? queued : requeued;
      return HttpResponse.json(record);
    }),
    http.post(
      `${apiBaseUrl}/user-movie-data/550/entries`,
      async ({ request }) => {
        creates.push(await request.json());
        const entry = creates.length === 1 ? firstEntry : secondEntry;
        record = creates.length === 1 ? firstLog : secondLog;
        entries =
          creates.length === 1 ? [firstEntry] : [secondEntry, firstEntry];
        return HttpResponse.json({ entry, record });
      },
    ),
    http.post(`${apiBaseUrl}/logs/`, () =>
      HttpResponse.json({ success: true }),
    ),
  );
});
afterEach(() => {
  vi.useRealTimers();
  act(() => toaster.remove());
  window.history.replaceState({}, "", "/");
  delete window.__dismissPreloadOverlay;
  vi.restoreAllMocks();
});

it.each([0, 1250])("tracks two viewings (%ims startup)", async (ms) => {
  initialBrowseDelay = ms;
  const view = start();
  try {
    const user = userEvent.setup();
    // Initial readiness spans cold route loading, session resolution and the first catalogue response.
    await screen.findByRole(
      "group",
      { name: `Your actions for ${title}` },
      { timeout: 5000 },
    );
    await user.hover(screen.getByRole("img", { name: title }));
    await user.click(
      within(actions()).getByRole("button", { name: "Watchlist" }),
    );
    await waitFor(() =>
      expect(
        within(actions()).getByRole("button", { name: "Watchlist" }),
      ).toHaveAttribute("aria-pressed", "true"),
    );
    await user.click(
      within(actions()).getByRole("button", { name: "Review or log" }),
    );
    const firstDialog = await screen.findByRole("dialog", {
      name: "Review or log",
    });
    await waitForFocusWithin(firstDialog);
    await waitFor(() =>
      expect(
        within(firstDialog).getByRole("textbox", { name: "Review" }),
      ).toBeEnabled(),
    );
    expect(within(firstDialog).getByLabelText("Date watched")).toHaveValue(
      today,
    );
    expect(
      within(firstDialog).getByRole("checkbox", { name: "Rewatch" }),
    ).not.toBeChecked();
    const stars = within(firstDialog).getByRole("radiogroup", {
      name: "Rating",
    });
    await user.click(
      within(firstDialog).getByRole("textbox", { name: "Review" }),
    );
    await user.tab({ shift: true });
    expect(within(stars).getByRole("radio", { name: "1 stars" })).toHaveFocus();
    await user.keyboard("{ArrowRight>7/}");
    expect(
      within(stars).getByRole("radio", { checked: true }),
    ).toHaveAccessibleName("3.5 stars");
    await user.type(
      within(firstDialog).getByRole("textbox", { name: "Review" }),
      firstEntry.review,
    );
    await user.click(within(firstDialog).getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(
      await screen.findByRole("img", { name: "Rated 3.5 out of 5 stars" }),
    ).toBeVisible();
    expect(screen.getByRole("img", { name: "Watched" })).toBeVisible();
    const logged = await screen.findByRole("status", { name: "Logged" });
    expect(
      within(logged).getByText("Also removed from your watchlist."),
    ).toBeVisible();
    expect(within(logged).getByRole("button", { name: "Undo" })).toBeVisible();
    expect(creates).toEqual([
      {
        watched_on: today,
        rating: 7,
        review: firstEntry.review,
        rewatch: false,
        liked: false,
        time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    ]);
    await user.click(within(nav()).getByRole("link", { name: "Watchlist" }));
    expect(
      await screen.findByText("Your watchlist is empty", {}, coldRoute),
    ).toBeVisible();
    await visitFilm(user);
    const log = await screen.findByRole("region", { name: "Your log" });
    expect(await within(log).findByText(firstEntry.review)).toBeVisible();
    const panel = screen.getByRole("region", { name: "Your film" });
    await user.click(within(panel).getByRole("button", { name: "Watchlist" }));
    await waitFor(() =>
      expect(
        within(panel).getByRole("button", { name: "Watchlist" }),
      ).toHaveAttribute("aria-pressed", "true"),
    );
    await user.click(screen.getByRole("button", { name: "Log" }));
    const secondDialog = await screen.findByRole("dialog", {
      name: "Review or log",
    });
    await waitForFocusWithin(secondDialog);
    expect(
      within(secondDialog).getByRole("checkbox", { name: "Rewatch" }),
    ).toBeChecked();
    expect(within(secondDialog).getByLabelText("Date watched")).toHaveValue(
      today,
    );
    await user.click(
      within(
        within(secondDialog).getByRole("radiogroup", { name: "Rating" }),
      ).getByRole("radio", { name: "5 stars" }),
    );
    await user.type(
      within(secondDialog).getByRole("textbox", { name: "Review" }),
      secondEntry.review,
    );
    await user.click(
      within(secondDialog).getByRole("button", { name: "Save" }),
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    const updated = screen.getByRole("region", { name: "Your log" });
    await within(updated).findByText(secondEntry.review);
    const rows = within(updated).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    const [latest, earlier] = rows;
    if (!latest || !earlier) throw new Error("Expected both viewings");
    expect(within(latest).getByText(secondEntry.review)).toBeVisible();
    expect(
      within(latest).getByRole("img", { name: "Rated 5 out of 5 stars" }),
    ).toBeVisible();
    expect(within(latest).getByRole("img", { name: "Rewatch" })).toBeVisible();
    expect(within(earlier).getByText(firstEntry.review)).toBeVisible();
    expect(
      within(earlier).getByRole("img", { name: "Rated 3.5 out of 5 stars" }),
    ).toBeVisible();
    expect(creates).toEqual([
      {
        watched_on: today,
        rating: 7,
        review: firstEntry.review,
        rewatch: false,
        liked: false,
        time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      {
        watched_on: today,
        rating: 10,
        review: secondEntry.review,
        rewatch: true,
        liked: false,
        time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    ]);
    expect(patches).toEqual([
      {
        user_on_watchlist: true,
        time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      {
        user_on_watchlist: true,
        time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    ]);
    await user.click(within(nav()).getByRole("link", { name: "Watchlist" }));
    expect(await screen.findByText("Your watchlist is empty")).toBeVisible();
    await user.click(within(nav()).getByRole("link", { name: "Explore" }));
    expect(
      await screen.findByRole("img", { name: "Rated 5 out of 5 stars" }),
    ).toBeVisible();
  } finally {
    view.unmount();
  }
});
