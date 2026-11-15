import { useLayoutEffect, useRef } from "react";
import { afterEach, beforeEach, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import {
  act,
  render,
  screen,
  within,
  waitFor,
} from "@tests/helpers/test-renderer";
import { authHandlers, clearBrowserAuth, token } from "@tests/helpers/auth";
import {
  createMockMovieDetail,
  createMockUserMovieData,
} from "@tests/mocks/movieData";
import { gate } from "@tests/helpers/web-locks";
import { server } from "@tests/mocks/server";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { changeOfUser } from "@/lib/session";
import { movieEntriesQuery } from "@/lib/queries";
import { apiBaseUrl } from "@/config/baseUrls";
import { setAuthTokens } from "@/utilities/tokenUtils";
import type {
  EntryWriteResponse,
  MovieEntries,
} from "@/services/userMovieDataService";
import AuthContextProvider from "@/components/auth/AuthContextProvider";
import useAuthContext from "@/hooks/auth/useAuthContext";
import { EntryDialogHost } from "@/components/movie/entry/EntryDialogHost";
import { Toaster, toaster } from "@/components/core/chakra/toaster";
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
let deletes: number[] = [];
let activeClient: QueryClient | undefined;
function Session() {
  const client = useQueryClient();
  useLayoutEffect(() => {
    activeClient = client;
  }, [client]);
  return <output aria-label="Session">{useAuthContext()?.status}</output>;
}
function LogView() {
  const fallback = useRef<HTMLButtonElement>(null);
  return (
    <AuthContextProvider>
      <Session />
      <EntryDialogHost>
        <button ref={fallback}>Fallback review</button>
        <FilmLog movie={movie} fallbackFocus={() => fallback.current} />
        <Toaster />
      </EntryDialogHost>
    </AuthContextProvider>
  );
}
function show() {
  return render(<LogView />);
}
afterEach(() => act(() => toaster.remove()));
beforeEach(() => {
  act(() => toaster.remove());
  clearBrowserAuth();
  authHandlers();
  setAuthTokens(token());
  reads = 0;
  deletes = [];
  response = { record, entries };
  server.use(
    http.get(`${apiBaseUrl}/user-movie-data/550/entries`, () => {
      reads++;
      return HttpResponse.json(response);
    }),
    http.delete(
      `${apiBaseUrl}/user-movie-data/550/entries/:entryId`,
      ({ params }) => {
        const id = Number(params.entryId);
        deletes.push(id);
        const entry = response.entries.find((value) => value.id === id);
        if (!entry)
          return HttpResponse.json({ detail: "Not found" }, { status: 404 });
        const remaining = response.entries.filter((value) => value.id !== id);
        response = {
          record: {
            ...response.record,
            has_entries: remaining.length > 0,
            last_logged_on:
              remaining
                .flatMap((value) =>
                  value.watched_on ? [value.watched_on] : [],
                )
                .sort()
                .at(-1) ?? null,
          },
          entries: remaining,
        };
        return HttpResponse.json({
          entry,
          record: response.record,
        } satisfies EntryWriteResponse);
      },
    ),
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

it("Edit opens the entry dialog with that viewing's date, rating and review", async () => {
  show();
  await userEvent
    .setup()
    .click(
      await screen.findByRole("button", { name: "Edit entry 1, Nov 14, 2026" }),
    );
  const dialog = await screen.findByRole("dialog", { name: "Edit entry" });
  expect(within(dialog).getByLabelText("Date watched")).toHaveValue(
    "2026-11-14",
  );
  expect(within(dialog).getByRole("textbox", { name: "Review" })).toHaveValue(
    "Latest review",
  );
  expect(
    within(dialog).getByRole("checkbox", { name: "Rewatch" }),
  ).toBeChecked();
  expect(
    within(
      within(dialog).getByRole("radiogroup", { name: "Rating" }),
    ).getByRole("radio", { checked: true }),
  ).toHaveAccessibleName("3.5 stars");
  expect(
    within(dialog).queryByRole("combobox", { name: "Film" }),
  ).not.toBeInTheDocument();
});

it("Delete asks first and Cancel preserves the entry and its trigger focus", async () => {
  show();
  const user = userEvent.setup();
  const trigger = await screen.findByRole("button", {
    name: "Delete entry 1, Nov 14, 2026",
  });
  await user.click(trigger);
  const dialog = await screen.findByRole("alertdialog", {
    name: "Delete this entry?",
  });
  expect(
    within(dialog).getByText(
      "This removes its date, rating and review. Watched and your current rating stay as they are.",
    ),
  ).toBeVisible();
  expect(deletes).toEqual([]);
  await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
  await waitFor(() =>
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
  );
  expect(screen.getByText("Latest review")).toBeVisible();
  await waitFor(() => expect(trigger).toHaveFocus());
  expect(deletes).toEqual([]);
});

it.each([
  [
    "Delete entry 1, Nov 14, 2026",
    false,
    8,
    "Latest review",
    "Edit entry 1, Nov 14, 2026",
  ],
  [
    "Delete entry 3, undated",
    false,
    9,
    "Undated review",
    "Edit entry 3, Jan 1, 2026",
  ],
  [
    "Delete entry 4, Jan 1, 2026",
    true,
    1,
    "Oldest review",
    "Edit entry 3, undated",
  ],
] as const)(
  "%s removes the confirmed row and restores focus while refresh is held",
  async (name, all, id, review, next) => {
    const held = gate();
    server.use(
      http.get(`${apiBaseUrl}/user-movie-data/550/entries`, async () => {
        reads++;
        if (reads > 1) await held.wait;
        return HttpResponse.json(response);
      }),
    );
    const view = show();
    try {
      const user = userEvent.setup();
      await screen.findByText("Latest review");
      if (all)
        await user.click(screen.getByRole("button", { name: "Show all (4)" }));
      await user.click(screen.getByRole("button", { name }));
      const dialog = await screen.findByRole("alertdialog", {
        name: "Delete this entry?",
      });
      await user.click(within(dialog).getByRole("button", { name: "Delete" }));
      await waitFor(() => expect(deletes).toEqual([id]));
      await waitFor(() =>
        expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
      );
      expect(screen.queryByText(review)).not.toBeInTheDocument();
      await waitFor(() =>
        expect(screen.getByRole("button", { name: next })).toHaveFocus(),
      );
      expect(screen.queryAllByRole("status")).toEqual([
        screen.getByLabelText("Session"),
      ]);
      expect(reads).toBe(2);
    } finally {
      held.release();
      view.unmount();
    }
  },
);

it("deleting the only entry returns focus to the supplied fallback", async () => {
  response = { record, entries: entries.slice(0, 1) };
  show();
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole("button", { name: "Delete entry 1, Nov 14, 2026" }),
  );
  const dialog = await screen.findByRole("alertdialog", {
    name: "Delete this entry?",
  });
  await user.click(within(dialog).getByRole("button", { name: "Delete" }));
  await waitFor(() =>
    expect(
      screen.queryByRole("region", { name: "Your log" }),
    ).not.toBeInTheDocument(),
  );
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Fallback review" }),
    ).toHaveFocus(),
  );
  expect(deletes).toEqual([8]);
});

it("a failed deletion leaves the entry and confirmation available for retry", async () => {
  server.use(
    http.delete(`${apiBaseUrl}/user-movie-data/550/entries/8`, () => {
      deletes.push(8);
      return HttpResponse.json({ detail: "Unavailable" }, { status: 400 });
    }),
  );
  show();
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole("button", { name: "Delete entry 1, Nov 14, 2026" }),
  );
  const dialog = await screen.findByRole("alertdialog", {
    name: "Delete this entry?",
  });
  await user.click(within(dialog).getByRole("button", { name: "Delete" }));
  await waitFor(() =>
    expect(screen.getByText("Failed to save entry")).toBeVisible(),
  );
  expect(dialog).toBeVisible();
  expect(within(dialog).getByRole("button", { name: "Delete" })).toBeEnabled();
  await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
  expect(await screen.findByText("Latest review")).toBeVisible();
  expect(deletes).toEqual([8]);
});

it("a failed background refresh keeps deletion final and lets the log Retry", async () => {
  server.use(
    http.get(`${apiBaseUrl}/user-movie-data/550/entries`, () => {
      reads++;
      return reads === 2
        ? HttpResponse.json({ detail: "Unavailable" }, { status: 400 })
        : HttpResponse.json(response);
    }),
  );
  show();
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole("button", { name: "Delete entry 1, Nov 14, 2026" }),
  );
  await user.click(
    within(await screen.findByRole("alertdialog")).getByRole("button", {
      name: "Delete",
    }),
  );
  await screen.findByText("Couldn't load your log.");
  await waitFor(() =>
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
  );
  await user.click(screen.getByRole("button", { name: "Retry" }));
  expect(await screen.findByText("Same day")).toBeVisible();
  expect(screen.queryByText("Latest review")).not.toBeInTheDocument();
  expect(deletes).toEqual([8]);
  expect(reads).toBe(3);
});

it("cancels an older in-flight log read so it cannot restore a confirmed deletion", async () => {
  const held = gate();
  let aborted = false;
  let oldFinished = false;
  server.use(
    http.get(
      `${apiBaseUrl}/user-movie-data/550/entries`,
      async ({ request }) => {
        reads++;
        const snapshot = response;
        if (reads === 2) {
          request.signal.addEventListener(
            "abort",
            () => {
              aborted = true;
            },
            { once: true },
          );
          await held.wait;
          oldFinished = true;
        }
        return HttpResponse.json(snapshot);
      },
    ),
  );
  const view = show();
  try {
    await screen.findByText("Latest review");
    const client = activeClient;
    if (!client) throw new Error("Expected mounted query provider");
    act(() => {
      void client.invalidateQueries({
        queryKey: movieEntriesQuery(550).queryKey,
      });
    });
    await waitFor(() => expect(reads).toBe(2));
    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: "Delete entry 1, Nov 14, 2026" }),
    );
    await user.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Delete",
      }),
    );
    await waitFor(() => expect(aborted).toBe(true));
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    held.release();
    await waitFor(() => expect(oldFinished).toBe(true));
    expect(screen.queryByText("Latest review")).not.toBeInTheDocument();
    expect(screen.getByText("Same day")).toBeVisible();
    expect(reads).toBe(3);
  } finally {
    held.release();
    view.unmount();
  }
});

it("a retired user's held deletion cannot patch the next user's log or move focus", async () => {
  const held = gate();
  let started = false;
  let finished = false;
  const oldEntry = entries[0];
  if (!oldEntry) throw new Error("Expected a viewing fixture");
  server.use(
    http.delete(`${apiBaseUrl}/user-movie-data/550/entries/8`, async () => {
      started = true;
      await held.wait;
      finished = true;
      return HttpResponse.json({
        entry: oldEntry,
        record: { ...record, has_entries: false, last_logged_on: null },
      } satisfies EntryWriteResponse);
    }),
  );
  const view = show();
  try {
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("button", {
        name: "Delete entry 1, Nov 14, 2026",
      }),
    );
    await user.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Delete",
      }),
    );
    await waitFor(() => expect(started).toBe(true));
    response = {
      record: { ...record, user_liked: true, last_logged_on: null },
      entries: [
        {
          ...oldEntry,
          id: 80,
          watched_on: null,
          rewatch: false,
          review: "Next user's review",
        },
      ],
    };
    const client = activeClient;
    if (!client) throw new Error("Expected mounted query provider");
    await act(async () => {
      await changeOfUser(client);
    });
    await screen.findByText("Next user's review");
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    const fallback = screen.getByRole("button", { name: "Fallback review" });
    act(() => fallback.focus());
    held.release();
    await waitFor(() => expect(finished).toBe(true));
    expect(fallback).toHaveFocus();
    expect(screen.getByText("Next user's review")).toBeVisible();
    expect(
      client.getQueryData(movieEntriesQuery(550).queryKey)?.record,
    ).toEqual(response.record);
    expect(reads).toBe(2);
    expect(screen.queryByText("Failed to save entry")).not.toBeInTheDocument();
  } finally {
    held.release();
    view.unmount();
  }
});
