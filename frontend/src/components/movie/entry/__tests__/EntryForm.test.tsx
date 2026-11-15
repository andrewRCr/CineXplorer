import { useState } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@tests/helpers/test-renderer";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { apiBaseUrl } from "@/config/baseUrls";
import { useUserMovieState } from "@/hooks/movie/useUserMovieState";
import { Toaster } from "@/components/core/chakra/toaster";
import type { EntryDialogOptions } from "@/contexts/EntryDialogContext";
import type {
  EntryWriteResponse,
  MovieEntries,
} from "@/services/userMovieDataService";
import { clearBrowserAuth } from "@tests/helpers/auth";
import {
  createMockMovieListItem,
  createMockUserMovieData,
} from "@tests/mocks/movieData";
import { gate } from "@tests/helpers/web-locks";
import { server } from "@tests/mocks/server";
import { EntryForm, type EntrySavedResult } from "../EntryForm";

const film = { tmdbId: 1, title: "First film", year: "2024", posterPath: null };
const entry = {
  id: 7,
  tmdb_id: 1,
  watched_on: "2026-11-01",
  rating: 7,
  review: "An earlier review",
  rewatch: false,
};
const record = createMockUserMovieData({
  user_watched: true,
  user_rating: 7,
  user_liked: true,
  has_entries: true,
  last_logged_on: entry.watched_on,
});
function Probe(options: Partial<EntryDialogOptions>) {
  const [saved, setSaved] = useState<EntrySavedResult[]>([]);
  const [cancelled, setCancelled] = useState(false);
  const [dirty, setDirty] = useState(false);
  return (
    <>
      <EntryForm
        film={film}
        dateOn
        filmChangeable={false}
        {...options}
        onSaved={(value) => setSaved((previous) => [...previous, value])}
        onCancel={() => setCancelled(true)}
        onReviewDirtyChange={setDirty}
      />
      <output aria-label="Saved">{JSON.stringify(saved)}</output>
      <output aria-label="Cancelled">{String(cancelled)}</output>
      <output aria-label="Dirty review">{String(dirty)}</output>
      <Toaster />
    </>
  );
}
function log(data: MovieEntries = { record, entries: [entry] }) {
  server.use(
    http.get(`${apiBaseUrl}/user-movie-data/1/entries`, () =>
      HttpResponse.json(data),
    ),
  );
}
const savedResults = (): EntrySavedResult[] =>
  JSON.parse(screen.getByRole("status", { name: "Saved" }).textContent ?? "[]");
const saveButton = () => screen.getByRole("button", { name: "Save" });
const dateInput = () => screen.getByLabelText("Date watched");
beforeEach(() => {
  clearBrowserAuth();
  document.cookie = "csrftoken=form-test; path=/";
  vi.stubEnv("TZ", "America/Chicago");
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-15T02:00:00Z"));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

it("prefills a new entry from its log and uses today's local calendar date", async () => {
  log();
  render(<Probe />);
  await waitFor(() => expect(saveButton()).toBeEnabled());
  expect(screen.getByText("First film")).toBeVisible();
  expect(screen.getByText("2024")).toBeVisible();
  expect(
    screen.queryByRole("button", { name: "Change" }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("switch", { name: "Watched on" })).toBeChecked();
  expect(dateInput()).toHaveValue("2026-11-14");
  expect(dateInput()).toHaveAttribute("max", "2026-11-14");
  await waitFor(() =>
    expect(screen.getByRole("checkbox", { name: "Rewatch" })).toBeChecked(),
  );
  expect(screen.getByRole("checkbox", { name: "Liked" })).toBeChecked();
  expect(
    within(screen.getByRole("radiogroup", { name: "Rating" })).getByRole(
      "radio",
      { checked: true },
    ),
  ).toHaveAccessibleName(/3.5/);
  expect(screen.getByRole("textbox", { name: "Review" })).toHaveValue("");
});

it.each(["dated", "review", "save", "edit"] as const)(
  "sends the %s save path and reports its returned record once",
  async (kind) => {
    log();
    const received: unknown[] = [];
    const returned = createMockUserMovieData({
      user_watched: true,
      user_rating: kind === "save" ? null : 7,
      user_liked: true,
      has_entries: true,
      last_logged_on: "2026-11-14",
    });
    const response = {
      entry: { ...entry, id: 8 },
      record: returned,
    } satisfies EntryWriteResponse;
    const handler = async ({ request }: { request: Request }) => {
      received.push(await request.json());
      return HttpResponse.json(kind === "save" ? returned : response);
    };
    server.use(
      http.post(`${apiBaseUrl}/user-movie-data/1/entries`, handler),
      http.put(`${apiBaseUrl}/user-movie-data/1/entries/7`, handler),
      http.patch(`${apiBaseUrl}/user-movie-data/1`, handler),
    );
    const user = userEvent.setup();
    render(
      <Probe
        dateOn={kind === "dated"}
        entry={kind === "edit" ? entry : undefined}
      />,
    );
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "Review" })).toBeEnabled(),
    );
    if (kind === "review" || kind === "edit") {
      await user.clear(screen.getByRole("textbox", { name: "Review" }));
      await user.type(
        screen.getByRole("textbox", { name: "Review" }),
        "A new review",
      );
    }
    if (kind === "save")
      await user.click(screen.getByRole("button", { name: "Clear" }));
    await user.click(saveButton());
    await waitFor(() => expect(savedResults()).toHaveLength(1));
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    expect(received).toEqual([
      kind === "save"
        ? { user_rating: null, user_liked: true }
        : {
            watched_on:
              kind === "review"
                ? null
                : kind === "edit"
                  ? entry.watched_on
                  : "2026-11-14",
            rating: 7,
            review: kind === "dated" ? null : "A new review",
            ...(kind === "review" ? {} : { rewatch: kind === "dated" }),
            liked: true,
            time_zone: zone,
          },
    ]);
    expect(savedResults()[0]).toEqual({
      kind: kind === "dated" || kind === "review" ? "create" : kind,
      dateOn: kind === "dated" || kind === "edit",
      shown: record,
      record: returned,
      ...(kind === "dated" || kind === "review" ? { entryId: 8 } : {}),
      sent: {
        user_liked: true,
        ...(kind === "save" ? { user_rating: null } : {}),
        ...(kind === "dated" || kind === "edit" ? { user_watched: true } : {}),
      },
    });
    expect(screen.queryByText("Rating cleared")).not.toBeInTheDocument();
  },
);

it("Liked alone on an unwatched film uses a record save", async () => {
  const shown = createMockUserMovieData();
  log({ record: shown, entries: [] });
  const returned = { ...shown, user_liked: true, user_watched: true };
  let received: unknown;
  server.use(
    http.patch(`${apiBaseUrl}/user-movie-data/1`, async ({ request }) => {
      received = await request.json();
      return HttpResponse.json(returned);
    }),
  );
  const user = userEvent.setup();
  render(<Probe dateOn={false} />);
  await waitFor(() =>
    expect(screen.getByRole("checkbox", { name: "Liked" })).toBeEnabled(),
  );
  expect(saveButton()).toBeDisabled();
  await user.click(screen.getByRole("checkbox", { name: "Liked" }));
  await user.click(saveButton());
  await waitFor(() => expect(savedResults()[0]?.record).toEqual(returned));
  expect(received).toEqual({ user_rating: null, user_liked: true });
});

it("validates dates, treats whitespace as empty and keeps an edited entry's date or review", async () => {
  log();
  const user = userEvent.setup();
  render(<Probe entry={entry} />);
  await waitFor(() =>
    expect(screen.getByRole("textbox", { name: "Review" })).toBeEnabled(),
  );
  expect(saveButton()).toBeDisabled();
  await user.clear(screen.getByRole("textbox", { name: "Review" }));
  await user.click(screen.getByRole("switch", { name: "Watched on" }));
  expect(screen.getByText("An entry needs a date or a review.")).toBeVisible();
  expect(saveButton()).toBeDisabled();
  await user.type(screen.getByRole("textbox", { name: "Review" }), "   ");
  expect(saveButton()).toBeDisabled();
  await user.type(screen.getByRole("textbox", { name: "Review" }), "A review");
  expect(saveButton()).toBeEnabled();
  await user.click(screen.getByRole("switch", { name: "Watched on" }));
  await user.clear(dateInput());
  expect(
    screen.getByText(
      "Enter a date no later than today, or turn off Watched on.",
    ),
  ).toBeVisible();
  expect(saveButton()).toBeDisabled();
  await user.type(dateInput(), "2026-11-15");
  expect(saveButton()).toBeDisabled();
  await user.clear(dateInput());
  await user.type(dateInput(), "2026-11-14");
  expect(saveButton()).toBeEnabled();
});

it("prefills an undated edit with the switch off and preserves its rewatch choice", async () => {
  const undated = { ...entry, watched_on: null, rating: null, rewatch: false };
  log({ record, entries: [undated] });
  render(<Probe entry={undated} />);
  await waitFor(() =>
    expect(screen.getByRole("textbox", { name: "Review" })).toBeEnabled(),
  );
  expect(screen.getByRole("switch", { name: "Watched on" })).not.toBeChecked();
  expect(
    screen.queryByRole("checkbox", { name: "Rewatch" }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "Review" })).toHaveValue(
    entry.review,
  );
  expect(
    within(screen.getByRole("radiogroup", { name: "Rating" })).queryByRole(
      "radio",
      { checked: true },
    ),
  ).not.toBeInTheDocument();
});

it("follows the date for a new entry's rewatch default until the visitor chooses", async () => {
  log({ record, entries: [{ ...entry, watched_on: "2026-11-14" }] });
  const user = userEvent.setup();
  render(<Probe />);
  await waitFor(() => expect(saveButton()).toBeEnabled());
  await waitFor(() =>
    expect(screen.getByRole("checkbox", { name: "Rewatch" })).toBeChecked(),
  );
  await user.clear(dateInput());
  await user.type(dateInput(), "2026-11-13");
  expect(screen.getByRole("checkbox", { name: "Rewatch" })).not.toBeChecked();
  await user.clear(dateInput());
  await user.type(dateInput(), "2026-11-14");
  await waitFor(() =>
    expect(screen.getByRole("checkbox", { name: "Rewatch" })).toBeChecked(),
  );
  await user.click(screen.getByRole("checkbox", { name: "Rewatch" }));
  await user.clear(dateInput());
  await user.type(dateInput(), "2026-11-14");
  expect(screen.getByRole("checkbox", { name: "Rewatch" })).not.toBeChecked();
});

it("keeps fields inert while loading and allows retry after a read failure", async () => {
  const held = gate();
  let reads = 0;
  server.use(
    http.get(`${apiBaseUrl}/user-movie-data/1/entries`, async () => {
      reads++;
      if (reads === 1) {
        await held.wait;
        return HttpResponse.json({ detail: "Unavailable" }, { status: 429 });
      }
      return HttpResponse.json({ record, entries: [entry] });
    }),
  );
  const user = userEvent.setup();
  const view = render(<Probe />);
  try {
    expect(saveButton()).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Review" })).toBeDisabled();
    held.release();
    expect(
      await screen.findByText("Couldn't load this film's log."),
    ).toBeVisible();
    expect(saveButton()).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(saveButton()).toBeEnabled());
  } finally {
    held.release();
    view.unmount();
  }
});

it("retains typed fields after a write failure and Cancel never writes", async () => {
  log();
  let writes = 0;
  server.use(
    http.post(`${apiBaseUrl}/user-movie-data/1/entries`, () => {
      writes++;
      return HttpResponse.json({ detail: "Refused" }, { status: 429 });
    }),
  );
  const user = userEvent.setup();
  render(<Probe />);
  await waitFor(() => expect(saveButton()).toBeEnabled());
  await user.type(
    screen.getByRole("textbox", { name: "Review" }),
    "Keep these words",
  );
  expect(
    screen.getByRole("status", { name: "Dirty review" }),
  ).toHaveTextContent("true");
  await user.click(saveButton());
  await waitFor(() =>
    expect(screen.getByText("Failed to save entry")).toBeVisible(),
  );
  expect(screen.getByRole("textbox", { name: "Review" })).toHaveValue(
    "Keep these words",
  );
  expect(savedResults()).toEqual([]);
  await user.clear(screen.getByRole("textbox", { name: "Review" }));
  expect(
    screen.getByRole("status", { name: "Dirty review" }),
  ).toHaveTextContent("false");
  await user.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.getByRole("status", { name: "Cancelled" })).toHaveTextContent(
    "true",
  );
  expect(writes).toBe(1);
});

it("changing films keeps date and review and resets rating, Liked and Rewatch", async () => {
  log();
  const other = createMockUserMovieData({ tmdb_id: 2 });
  server.use(
    http.get(`${apiBaseUrl}/movies/search`, () =>
      HttpResponse.json({
        page: 1,
        total_pages: 1,
        total_results: 1,
        results: [
          createMockMovieListItem({ tmdb_id: 2, title: "Second film" }),
        ],
      }),
    ),
    http.get(`${apiBaseUrl}/user-movie-data/2/entries`, () =>
      HttpResponse.json({ record: other, entries: [] }),
    ),
  );
  const user = userEvent.setup();
  render(<Probe filmChangeable />);
  await waitFor(() => expect(saveButton()).toBeEnabled());
  await user.type(
    screen.getByRole("textbox", { name: "Review" }),
    "Keep my review",
  );
  await user.clear(dateInput());
  await user.type(dateInput(), "2026-11-12");
  await user.click(screen.getByRole("button", { name: "Change" }));
  await user.type(screen.getByRole("combobox", { name: "Film" }), "second");
  await user.click(
    await screen.findByRole("option", { name: "Second film 2024" }),
  );
  await waitFor(() =>
    expect(screen.getByRole("checkbox", { name: "Liked" })).toBeEnabled(),
  );
  await waitFor(() =>
    expect(screen.getByRole("checkbox", { name: "Liked" })).not.toBeChecked(),
  );
  expect(screen.getByRole("checkbox", { name: "Rewatch" })).not.toBeChecked();
  expect(dateInput()).toHaveValue("2026-11-12");
  expect(screen.getByRole("textbox", { name: "Review" })).toHaveValue(
    "Keep my review",
  );
  expect(
    within(screen.getByRole("radiogroup", { name: "Rating" })).queryByRole(
      "radio",
      { checked: true },
    ),
  ).not.toBeInTheDocument();
});

it("counts a long review and stops text at ten thousand characters", async () => {
  log();
  const user = userEvent.setup();
  render(<Probe />);
  const review = screen.getByRole("textbox", { name: "Review" });
  await waitFor(() => expect(review).toBeEnabled());
  await user.click(review);
  await user.paste("x".repeat(9001));
  expect(screen.getByText("9001 / 10000")).toBeVisible();
  await user.paste("x".repeat(2000));
  expect(review).toHaveValue("x".repeat(10000));
  expect(screen.getByText("10000 / 10000")).toBeVisible();
});

it("zero stars reached by keyboard clears the rating", async () => {
  log();
  let received: unknown;
  server.use(
    http.patch(`${apiBaseUrl}/user-movie-data/1`, async ({ request }) => {
      received = await request.json();
      return HttpResponse.json({ ...record, user_rating: null });
    }),
  );
  const user = userEvent.setup();
  render(<Probe dateOn={false} />);
  await waitFor(() =>
    expect(screen.getByRole("checkbox", { name: "Liked" })).toBeChecked(),
  );
  await user.tab();
  await user.tab();
  await user.keyboard("{ArrowLeft>7/}");
  expect(
    screen.queryByRole("button", { name: "Clear" }),
  ).not.toBeInTheDocument();
  await user.click(saveButton());
  await waitFor(() => expect(savedResults()).toHaveLength(1));
  expect(received).toEqual({ user_rating: null, user_liked: true });
});

it("shows progress and makes fields inert until the save answers", async () => {
  log();
  const held = gate();
  server.use(
    http.post(`${apiBaseUrl}/user-movie-data/1/entries`, async () => {
      await held.wait;
      return HttpResponse.json({ entry, record });
    }),
  );
  const user = userEvent.setup();
  const view = render(<Probe />);
  try {
    await waitFor(() => expect(saveButton()).toBeEnabled());
    await user.click(saveButton());
    expect(
      await screen.findByRole("button", { name: "Saving…" }),
    ).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Review" })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "Liked" })).toBeDisabled();
    expect(savedResults()).toEqual([]);
    held.release();
    await waitFor(() => expect(savedResults()).toHaveLength(1));
  } finally {
    held.release();
    view.unmount();
  }
});

it("prefills rating and Liked from saves newer than the log response", async () => {
  log();
  const newer = { ...record, user_rating: 9, user_liked: false };
  server.use(
    http.patch(`${apiBaseUrl}/user-movie-data/1`, () =>
      HttpResponse.json(newer),
    ),
  );
  function RecentSave() {
    const { state, save } = useUserMovieState(1, record);
    const [show, setShow] = useState(false);
    return (
      <>
        <button onClick={() => save({ user_rating: 9, user_liked: false })}>
          Change film
        </button>
        <button onClick={() => setShow(true)}>Start entry</button>
        <output aria-label="Film rating">{state.user_rating}</output>
        {show && <Probe />}
      </>
    );
  }
  const user = userEvent.setup();
  render(<RecentSave />);
  await user.click(screen.getByRole("button", { name: "Change film" }));
  await waitFor(() =>
    expect(
      screen.getByRole("status", { name: "Film rating" }),
    ).toHaveTextContent("9"),
  );
  await user.click(screen.getByRole("button", { name: "Start entry" }));
  await waitFor(() =>
    expect(
      within(screen.getByRole("radiogroup", { name: "Rating" })).getByRole(
        "radio",
        { checked: true },
      ),
    ).toHaveAccessibleName(/4.5/),
  );
  expect(screen.getByRole("checkbox", { name: "Liked" })).not.toBeChecked();
});

it("treats a whitespace-only review as unchanged when editing an entry without a review", async () => {
  const noReview = { ...entry, review: null };
  log({ record, entries: [noReview] });
  const user = userEvent.setup();
  render(<Probe entry={noReview} />);
  await waitFor(() =>
    expect(screen.getByRole("checkbox", { name: "Liked" })).toBeChecked(),
  );
  await user.type(screen.getByRole("textbox", { name: "Review" }), "   ");
  expect(saveButton()).toBeDisabled();
});
