import { beforeEach, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { render, screen, within, waitFor } from "@tests/helpers/test-renderer";
import { authHandlers, clearBrowserAuth, token } from "@tests/helpers/auth";
import {
  createMockMovieDetail,
  createMockUserMovieData,
} from "@tests/mocks/movieData";
import { gate } from "@tests/helpers/web-locks";
import { server } from "@tests/mocks/server";
import { apiBaseUrl } from "@/config/baseUrls";
import { setAuthTokens } from "@/utilities/tokenUtils";
import type { MovieEntries } from "@/services/userMovieDataService";
import AuthContextProvider from "@/components/auth/AuthContextProvider";
import useAuthContext from "@/hooks/auth/useAuthContext";
import { FilmLog } from "../FilmLog";

const movie = createMockMovieDetail({ tmdb_id: 550, title: "A film" });
const record = createMockUserMovieData({
  tmdb_id: 550,
  user_watched: true,
  has_entries: true,
  last_logged_on: "2026-11-14",
});
const entries: MovieEntries["entries"] = [
  {
    id: 8,
    tmdb_id: 550,
    watched_on: "2026-11-14",
    rating: 7,
    review: "Latest review",
    rewatch: true,
  },
  {
    id: 6,
    tmdb_id: 550,
    watched_on: "2026-11-14",
    rating: 4,
    review: "Same day",
    rewatch: false,
  },
  {
    id: 9,
    tmdb_id: 550,
    watched_on: null,
    rating: null,
    review: "Undated review",
    rewatch: false,
  },
  {
    id: 1,
    tmdb_id: 550,
    watched_on: "2026-01-01",
    rating: 10,
    review: "Oldest review",
    rewatch: false,
  },
];
let response: MovieEntries;
let reads = 0;
function Session() {
  return <output aria-label="Session">{useAuthContext()?.status}</output>;
}
function show() {
  return render(
    <AuthContextProvider>
      <Session />
      <FilmLog movie={movie} />
    </AuthContextProvider>,
  );
}
beforeEach(() => {
  clearBrowserAuth();
  authHandlers();
  setAuthTokens(token());
  reads = 0;
  response = { record, entries };
  server.use(
    http.get(`${apiBaseUrl}/user-movie-data/550/entries`, () => {
      reads++;
      return HttpResponse.json(response);
    }),
  );
});

it("keeps server order, dates, rewatch and ratings, with unique positional controls", async () => {
  show();
  const log = await screen.findByRole("region", { name: "Your log" });
  const rows = await within(log).findAllByRole("listitem");
  expect(rows).toHaveLength(3);
  const [first, second, third] = rows;
  if (!first || !second || !third) throw new Error("Expected three entries");
  expect(
    rows.map((row) => within(row).getByText(/review|Same day/).textContent),
  ).toEqual(["Latest review", "Same day", "Undated review"]);
  expect(within(first).getByText("Nov 14, 2026")).toBeVisible();
  expect(within(first).getByRole("img", { name: "Rewatch" })).toBeVisible();
  expect(
    within(first).getByRole("img", { name: "Rated 3.5 out of 5 stars" }),
  ).toBeVisible();
  expect(
    within(second).queryByRole("img", { name: "Rewatch" }),
  ).not.toBeInTheDocument();
  expect(within(third).getByText("No date")).toBeVisible();
  expect(within(third).queryByRole("img")).not.toBeInTheDocument();
  for (const [position, date] of [
    [1, "Nov 14, 2026"],
    [2, "Nov 14, 2026"],
    [3, "undated"],
  ]) {
    expect(
      within(log).getByRole("button", {
        name: `Edit entry ${position}, ${date}`,
      }),
    ).toBeVisible();
    expect(
      within(log).getByRole("button", {
        name: `Delete entry ${position}, ${date}`,
      }),
    ).toBeVisible();
  }
  await userEvent
    .setup()
    .click(within(log).getByRole("button", { name: "Show all (4)" }));
  expect(within(log).getAllByRole("listitem")).toHaveLength(4);
  expect(within(log).getByText("Oldest review")).toBeVisible();
  expect(
    within(log).queryByRole("button", { name: "Show all (4)" }),
  ).not.toBeInTheDocument();
});

it("excerpts at a word boundary and expands plain text with its line breaks", async () => {
  const preview =
    "<b>Opening</b>\n" + Array.from({ length: 37 }, () => "cinema").join(" ");
  const review =
    preview + " extraordinary conclusion with a longer ending.\nOne last line.";
  response = {
    ...response,
    record: { ...record, last_logged_on: null },
    entries: [
      {
        id: 8,
        tmdb_id: 550,
        watched_on: null,
        rating: null,
        rewatch: false,
        review,
      },
    ],
  };
  show();
  const log = await screen.findByRole("region", { name: "Your log" });
  const excerpt = await within(log).findByText(
    (_, node) => node?.tagName === "P" && node.textContent === preview + "…",
  );
  expect(excerpt).toBeVisible();
  expect(getComputedStyle(excerpt).whiteSpace).toBe("pre-wrap");
  expect(
    within(log).queryByText("Opening", { selector: "b" }),
  ).not.toBeInTheDocument();
  const user = userEvent.setup();
  await user.click(within(log).getByRole("button", { name: "Read more" }));
  expect(
    within(log).getByText(
      (_, node) => node?.tagName === "P" && node.textContent === review,
    ),
  ).toBeVisible();
  await user.click(within(log).getByRole("button", { name: "Show less" }));
  expect(
    within(log).getByText(
      (_, node) => node?.tagName === "P" && node.textContent === preview + "…",
    ),
  ).toBeVisible();
});

it("keeps reviews up to 280 characters whole without an expansion control", async () => {
  const review = "A".repeat(280);
  response = {
    ...response,
    record: { ...record, last_logged_on: null },
    entries: [
      {
        id: 8,
        tmdb_id: 550,
        watched_on: null,
        rating: null,
        rewatch: false,
        review,
      },
    ],
  };
  show();
  expect(await screen.findByText(review)).toBeVisible();
  expect(
    screen.queryByRole("button", { name: "Read more" }),
  ).not.toBeInTheDocument();
});

it("still excerpts a long word without a space", async () => {
  response = {
    record: { ...record, last_logged_on: null },
    entries: [
      {
        id: 8,
        tmdb_id: 550,
        watched_on: null,
        rating: null,
        rewatch: false,
        review: "A".repeat(281),
      },
    ],
  };
  show();
  expect(await screen.findByText("A".repeat(280) + "…")).toBeVisible();
  expect(screen.getByRole("button", { name: "Read more" })).toBeVisible();
});

it("shows placeholder rows while loading, then no list for an empty log", async () => {
  const held = gate();
  server.use(
    http.get(`${apiBaseUrl}/user-movie-data/550/entries`, async () => {
      reads++;
      await held.wait;
      return HttpResponse.json({
        record: { ...record, has_entries: false, last_logged_on: null },
        entries: [],
      });
    }),
  );
  const view = show();
  try {
    const loading = await screen.findByRole("status", {
      name: "Loading your log",
    });
    expect(within(loading).getAllByLabelText("Loading entry")).toHaveLength(3);
    held.release();
    await waitFor(() =>
      expect(
        screen.queryByRole("status", { name: "Loading your log" }),
      ).not.toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("region", { name: "Your log" }),
    ).not.toBeInTheDocument();
    expect(reads).toBe(1);
  } finally {
    held.release();
    view.unmount();
  }
});

it("shows no log and sends no entry read while signed out", async () => {
  clearBrowserAuth();
  show();
  await waitFor(() =>
    expect(screen.getByLabelText("Session")).toHaveTextContent("anonymous"),
  );
  expect(
    screen.queryByRole("region", { name: "Your log" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("status", { name: "Loading your log" }),
  ).not.toBeInTheDocument();
  expect(reads).toBe(0);
});

it("explains a failed read and retries the log in place", async () => {
  server.use(
    http.get(`${apiBaseUrl}/user-movie-data/550/entries`, () => {
      reads++;
      return reads === 1
        ? HttpResponse.json({ detail: "Unavailable" }, { status: 400 })
        : HttpResponse.json(response);
    }),
  );
  show();
  expect(await screen.findByText("Couldn't load your log.")).toBeVisible();
  await userEvent.setup().click(screen.getByRole("button", { name: "Retry" }));
  expect(await screen.findByText("Latest review")).toBeVisible();
  expect(reads).toBe(2);
  expect(screen.queryByText("Couldn't load your log.")).not.toBeInTheDocument();
});
