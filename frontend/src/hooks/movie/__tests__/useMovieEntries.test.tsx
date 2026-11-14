import { useEffect } from "react";
import { act, renderHook, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it } from "vitest";
import { onlineManager, useQuery, useQueryClient } from "@tanstack/react-query";
import { isCancel } from "axios";
import { http, HttpResponse } from "msw/http";
import { Toaster, toaster } from "@/components/core/chakra/toaster";
import { apiBaseUrl } from "@/config/baseUrls";
import { activityQuery, libraryQuery, movieEntriesQuery } from "@/lib/queries";
import { beginUserChange, changeOfUser } from "@/lib/session";
import { TestProviders } from "@tests/helpers/test-providers";
import { clearBrowserAuth } from "@tests/helpers/auth";
import { createMockUserMovieData } from "@tests/mocks/movieData";
import { gate } from "@tests/helpers/web-locks";
import { server } from "@tests/mocks/server";
import { useUserMovieState } from "../useUserMovieState";
import { useMovieEntries } from "../useMovieEntries";

const entry = {
  id: 7,
  tmdb_id: 1,
  watched_on: "2026-11-01",
  rating: 7,
  review: "A viewing",
  rewatch: false,
};
const body = {
  watched_on: entry.watched_on,
  rating: 7,
  review: entry.review,
  rewatch: false,
  liked: true,
};
const record = createMockUserMovieData({
  user_watched: true,
  user_liked: true,
  user_rating: 7,
  has_entries: true,
  last_logged_on: entry.watched_on,
});
function mount(retireOnUnmount = true) {
  return renderHook(
    () => {
      const client = useQueryClient();
      useEffect(
        () => () => {
          if (retireOnUnmount) beginUserChange(client);
        },
        [client],
      );
      return { ...useUserMovieState(1, null), ...useMovieEntries(1), client };
    },
    {
      wrapper: ({ children }) => (
        <TestProviders>
          {children}
          <Toaster />
        </TestProviders>
      ),
    },
  );
}
beforeEach(() => {
  clearBrowserAuth();
  document.cookie = "csrftoken=entry-test; path=/";
  act(() => toaster.remove());
});
afterEach(() => act(() => toaster.remove()));

it("queues entry writes with saves in both directions and overlays only confirmed entry effects", async () => {
  const first = gate();
  const second = gate();
  const third = gate();
  const events: string[] = [];
  server.use(
    http.patch(`${apiBaseUrl}/user-movie-data/1`, async () => {
      events.push("save");
      if (events.length === 1) {
        await first.wait;
        return HttpResponse.json(createMockUserMovieData({ user_liked: true }));
      }
      await third.wait;
      return HttpResponse.json({ ...record, user_on_watchlist: true });
    }),
    http.post(`${apiBaseUrl}/user-movie-data/1/entries`, async () => {
      events.push("entry");
      await second.wait;
      return HttpResponse.json({ entry, record });
    }),
  );
  const view = mount();
  try {
    act(() => view.result.current.save({ user_liked: true }));
    await waitFor(() => expect(events).toEqual(["save"]));
    let result: Promise<unknown>;
    act(() => {
      result = view.result.current.createEntry(body).catch(() => {});
    });
    await waitFor(() => expect(view.result.current.isPending).toBe(true));
    expect(events).toEqual(["save"]);
    expect(view.result.current.state).toEqual(
      createMockUserMovieData({ user_liked: true }),
    );
    first.release();
    await waitFor(() => expect(events).toEqual(["save", "entry"]));
    // A pending viewing must not invent watched/rating/log state in the overlay.
    expect(view.result.current.state).toEqual(
      createMockUserMovieData({ user_liked: true }),
    );
    act(() => view.result.current.save({ user_on_watchlist: true }));
    await waitFor(() =>
      expect(view.result.current.state.user_on_watchlist).toBe(true),
    );
    expect(events).toEqual(["save", "entry"]);
    second.release();
    await act(async () => {
      await result;
    });
    await waitFor(() => expect(events).toEqual(["save", "entry", "save"]));
    await waitFor(() =>
      expect(view.result.current.state).toEqual({
        ...record,
        user_on_watchlist: true,
      }),
    );
    third.release();
  } finally {
    first.release();
    second.release();
    third.release();
    view.unmount();
  }
});

it.each(["create", "edit", "delete"] as const)(
  "%s sends the entry request, shows its record, and refetches both entry lists and Library without a success toast",
  async (operation) => {
    const counts = { library: 0, film: 0, activity: 0 };
    server.use(
      http.get(`${apiBaseUrl}/user-movie-data/movies`, () => {
        counts.library++;
        return HttpResponse.json({
          page: 1,
          total_pages: 0,
          total_results: 0,
          results: [],
          next_tmdb_page_start: null,
        });
      }),
      http.get(`${apiBaseUrl}/user-movie-data/1/entries`, () => {
        counts.film++;
        return HttpResponse.json({ record, entries: [entry] });
      }),
      http.get(`${apiBaseUrl}/user-movie-data/entries`, () => {
        counts.activity++;
        return HttpResponse.json({
          page: 1,
          total_pages: 0,
          total_results: 0,
          results: [],
        });
      }),
    );
    const handler =
      operation === "create"
        ? http.post
        : operation === "edit"
          ? http.put
          : http.delete;
    let received: unknown;
    server.use(
      handler(
        `${apiBaseUrl}/user-movie-data/1/entries${operation === "create" ? "" : "/7"}`,
        async ({ request }) => {
          received = operation === "delete" ? null : await request.json();
          if (
            operation !== "delete" &&
            JSON.stringify(received) !==
              JSON.stringify({
                ...body,
                time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              })
          )
            return HttpResponse.json(
              { detail: "Invalid entry" },
              { status: 422 },
            );
          return HttpResponse.json({ entry, record });
        },
      ),
    );
    function Reads() {
      useQuery(libraryQuery({}));
      useQuery(movieEntriesQuery(1));
      useQuery(activityQuery({}));
      return null;
    }
    const view = renderHook(
      () => ({ ...useUserMovieState(1, null), ...useMovieEntries(1) }),
      {
        wrapper: ({ children }) => (
          <TestProviders>
            <Reads />
            {children}
            <Toaster />
          </TestProviders>
        ),
      },
    );
    await waitFor(() =>
      expect(counts).toEqual({ library: 1, film: 1, activity: 1 }),
    );
    await act(async () => {
      if (operation === "create") await view.result.current.createEntry(body);
      else if (operation === "edit")
        await view.result.current.editEntry(7, body);
      else await view.result.current.deleteEntry(7);
    });
    expect(received).toEqual(
      operation === "delete"
        ? null
        : {
            ...body,
            time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
    );
    await waitFor(() => expect(view.result.current.state).toEqual(record));
    await waitFor(() =>
      expect(counts).toEqual({ library: 2, film: 2, activity: 2 }),
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Undo" }),
    ).not.toBeInTheDocument();
  },
);

it("reports an entry failure and keeps the prior record", async () => {
  server.use(
    http.post(`${apiBaseUrl}/user-movie-data/1/entries`, () =>
      HttpResponse.json({ detail: "Entry refused" }, { status: 409 }),
    ),
  );
  const view = mount();
  await act(async () => {
    await view.result.current.createEntry(body).catch(() => {});
  });
  await waitFor(() =>
    expect(screen.getByText("Failed to save entry")).toBeVisible(),
  );
  expect(view.result.current.state).toEqual(createMockUserMovieData());
});

it.each(["mounted", "multiple", "unmounted", "offline"] as const)(
  "settles retired queued entries and permits the next owner's write (%s)",
  async (mode) => {
    const release = gate();
    const entered = gate();
    let posts = 0;
    const outcomes: unknown[] = [];
    const pending: Promise<void>[] = [];
    server.use(
      http.patch(`${apiBaseUrl}/user-movie-data/1`, async () => {
        entered.release();
        await release.wait;
        return HttpResponse.json(record);
      }),
      http.post(`${apiBaseUrl}/user-movie-data/1/entries`, () => {
        posts++;
        return HttpResponse.json({ entry, record });
      }),
    );
    const view = mount(mode !== "unmounted");
    const client = view.result.current.client;
    try {
      act(() => view.result.current.save({ user_liked: true }));
      await entered.wait;
      if (mode === "offline") onlineManager.setOnline(false);
      act(() => {
        const writes = [() => view.result.current.createEntry(body)];
        if (mode === "multiple") {
          writes.push(
            () => view.result.current.editEntry(7, body),
            () => view.result.current.deleteEntry(7),
          );
        }
        for (const write of writes) {
          pending.push(
            write().then(
              (value) => {
                outcomes.push(value);
              },
              (error: unknown) => {
                outcomes.push(error);
              },
            ),
          );
        }
      });
      await waitFor(() =>
        expect(
          client
            .getMutationCache()
            .getAll()
            .filter((item) => item.state.isPaused),
        ).toHaveLength(pending.length),
      );
      expect(view.result.current.isPending).toBe(true);
      if (mode === "unmounted") {
        view.unmount();
        expect(outcomes).toHaveLength(0);
      }
      await act(async () => {
        await changeOfUser(client);
      });
      await waitFor(() => expect(outcomes).toHaveLength(pending.length));
      expect(outcomes.every(isCancel)).toBe(true);
      await Promise.all(pending);
      expect(client.getMutationCache().getAll()).toHaveLength(0);
      expect(posts).toBe(0);
      expect(
        screen.queryByText("Failed to save entry"),
      ).not.toBeInTheDocument();
      if (mode !== "unmounted") {
        expect(view.result.current.isPending).toBe(false);
        expect(view.result.current.state).toEqual(createMockUserMovieData());
        onlineManager.setOnline(true);
        await act(async () => {
          await view.result.current.createEntry(body);
        });
        await waitFor(() => expect(view.result.current.state).toEqual(record));
        expect(view.result.current.isPending).toBe(false);
        expect(posts).toBe(1);
      }
    } finally {
      onlineManager.setOnline(true);
      release.release();
      view.unmount();
      act(() => beginUserChange(client));
    }
  },
);

it("aborts an entry already in transport and ignores its obsolete response", async () => {
  const release = gate();
  const entered = gate();
  let aborted = false;
  server.use(
    http.post(
      `${apiBaseUrl}/user-movie-data/1/entries`,
      async ({ request }) => {
        request.signal.addEventListener("abort", () => {
          aborted = true;
        });
        entered.release();
        await release.wait;
        return HttpResponse.json({ entry, record });
      },
    ),
  );
  const view = mount();
  try {
    let result: Promise<unknown>;
    act(() => {
      result = view.result.current.createEntry(body).catch(() => {});
    });
    await entered.wait;
    await act(async () => {
      await changeOfUser(view.result.current.client);
      release.release();
      await result;
    });
    await waitFor(() => expect(aborted).toBe(true));
    expect(view.result.current.state).toEqual(createMockUserMovieData());
    expect(screen.queryByText("Failed to save entry")).not.toBeInTheDocument();
  } finally {
    release.release();
    view.unmount();
  }
});
