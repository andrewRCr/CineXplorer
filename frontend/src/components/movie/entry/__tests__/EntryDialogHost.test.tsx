import { useEffect, useRef, useState } from "react";
import { createMemoryRouter, RouterProvider, useLocation } from "react-router";
import { afterEach, beforeEach, expect, it } from "vitest";
import { act, render, screen, waitFor } from "@tests/helpers/test-renderer";
import { render as rawRender } from "@testing-library/react";
import { useQueryClient } from "@tanstack/react-query";
import { http, HttpResponse } from "msw/http";
import { apiBaseUrl } from "@/config/baseUrls";
import { Toaster, toaster } from "@/components/core/chakra/toaster";
import { beginUserChange } from "@/lib/session";
import { TestProviders } from "@tests/helpers/test-providers";
import { clearBrowserAuth } from "@tests/helpers/auth";
import {
  createMockMovieListItem,
  createMockUserMovieData,
} from "@tests/mocks/movieData";
import { gate } from "@tests/helpers/web-locks";
import { server } from "@tests/mocks/server";
import userEvent from "@testing-library/user-event";
import { useEntryDialog } from "@/hooks/movie/useEntryDialog";
import { EntryDialogHost } from "../EntryDialogHost";

const film = { tmdbId: 1, title: "Test film", year: "2024", posterPath: null };
const entry = {
  id: 7,
  tmdb_id: 1,
  watched_on: "2026-11-01",
  rating: 7,
  review: "A viewing",
  rewatch: false,
};
function Opener({
  edit = false,
  unmount = false,
  dateOn = true,
  picker = false,
  preferReturnFocus = false,
}: {
  edit?: boolean;
  unmount?: boolean;
  dateOn?: boolean;
  picker?: boolean;
  preferReturnFocus?: boolean;
}) {
  const { open } = useEntryDialog();
  const client = useQueryClient();
  const [visible, setVisible] = useState(true);
  const fallback = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  return (
    <>
      <output aria-label="Current location">
        {location.pathname}
        {location.search}
      </output>
      <button ref={fallback}>Surviving control</button>
      <button onClick={() => beginUserChange(client)}>Change user</button>
      <Toaster />
      {visible && (
        <button
          onClick={() => {
            open({
              film: picker ? undefined : film,
              dateOn,
              filmChangeable: false,
              entry: edit ? entry : undefined,
              returnFocus: () => fallback.current,
              preferReturnFocus,
            });
            if (unmount) setVisible(false);
          }}
        >
          Open entry
        </button>
      )}
    </>
  );
}

it.each([false, true])(
  "opens one titled dialog without navigation; editing: %s",
  async (edit) => {
    const user = userEvent.setup();
    render(
      <EntryDialogHost>
        <Opener edit={edit} />
      </EntryDialogHost>,
    );
    const location = screen.getByRole("status", { name: "Current location" });
    const original = location.textContent;
    await user.click(screen.getByRole("button", { name: "Open entry" }));
    expect(
      await screen.findByRole("dialog", {
        name: edit ? "Edit entry" : "Review or log",
      }),
    ).toBeVisible();
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(location.textContent).toBe(original);
  },
);

it.each([false, true])(
  "returns focus to the opener or its fallback; opener gone: %s",
  async (unmount) => {
    const user = userEvent.setup();
    render(
      <EntryDialogHost>
        <Opener unmount={unmount} />
      </EntryDialogHost>,
    );
    const opener = screen.getByRole("button", { name: "Open entry" });
    const fallback = screen.getByRole("button", { name: "Surviving control" });
    await user.click(opener);
    await screen.findByRole("dialog", { name: "Review or log" });
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(unmount ? fallback : opener).toHaveFocus());
  },
);

it("Escape closes and returns focus", async () => {
  const user = userEvent.setup();
  render(
    <EntryDialogHost>
      <Opener />
    </EntryDialogHost>,
  );
  const opener = screen.getByRole("button", { name: "Open entry" });
  await user.click(opener);
  await screen.findByRole("dialog", { name: "Review or log" });
  await user.keyboard("{Escape}");
  await waitFor(() => expect(opener).toHaveFocus());
});

it("prefers an explicit focus target when the opener remains", async () => {
  const user = userEvent.setup();
  render(
    <EntryDialogHost>
      <Opener preferReturnFocus />
    </EntryDialogHost>,
  );
  const opener = screen.getByRole("button", { name: "Open entry" });
  const target = screen.getByRole("button", { name: "Surviving control" });
  await user.click(opener);
  await screen.findByRole("dialog", { name: "Review or log" });
  await user.click(screen.getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(target).toHaveFocus());
  expect(opener).toBeInTheDocument();
});

it("renders outside a host and reports a missing host only when open is called", async () => {
  function Outside() {
    const { open } = useEntryDialog();
    const [error, setError] = useState("");
    return (
      <>
        <button
          onClick={() => {
            try {
              open({ dateOn: true, filmChangeable: true });
            } catch (error) {
              if (error instanceof Error) setError(error.message);
            }
          }}
        >
          Open outside
        </button>
        <output aria-label="Error">{error}</output>
      </>
    );
  }
  const user = userEvent.setup();
  render(<Outside />);
  expect(screen.getByRole("status", { name: "Error" })).toBeEmptyDOMElement();
  await user.click(screen.getByRole("button", { name: "Open outside" }));
  expect(screen.getByRole("status", { name: "Error" })).toHaveTextContent(
    "EntryDialogHost",
  );
});

beforeEach(() => {
  clearBrowserAuth();
  document.cookie = "csrftoken=host-test; path=/";
  act(() => toaster.remove());
  server.use(
    http.get(`${apiBaseUrl}/user-movie-data/1/entries`, () =>
      HttpResponse.json({ record: createMockUserMovieData(), entries: [] }),
    ),
  );
});
afterEach(() => act(() => toaster.remove()));

it.each(["dated", "review", "save", "edit"] as const)(
  "closes a %s save with one toast and restores only its changes",
  async (kind) => {
    const shown = createMockUserMovieData(
      kind === "save" || kind === "edit"
        ? {
            user_watched: true,
            user_liked: true,
            user_rating: 7,
            has_entries: kind === "edit",
          }
        : { user_on_watchlist: true },
    );
    const returned =
      kind === "save"
        ? { ...shown, user_rating: null }
        : kind === "edit"
          ? { ...shown, user_liked: false }
          : {
              ...shown,
              user_watched: true,
              user_on_watchlist: false,
              has_entries: true,
              last_logged_on:
                kind === "dated"
                  ? new Date().toLocaleDateString("en-CA")
                  : null,
            };
    const createdEntry = {
      ...entry,
      id: 8,
      watched_on: returned.last_logged_on,
      rating: null,
      review: kind === "review" ? "A review" : null,
    };
    const events: { method: string; body?: unknown }[] = [];
    server.use(
      http.get(`${apiBaseUrl}/user-movie-data/1/entries`, () =>
        HttpResponse.json({
          record: shown,
          entries: kind === "edit" ? [entry] : [],
        }),
      ),
      http.post(
        `${apiBaseUrl}/user-movie-data/1/entries`,
        async ({ request }) => {
          events.push({ method: "create", body: await request.json() });
          return HttpResponse.json({ entry: createdEntry, record: returned });
        },
      ),
      http.put(
        `${apiBaseUrl}/user-movie-data/1/entries/7`,
        async ({ request }) => {
          events.push({ method: "edit", body: await request.json() });
          return HttpResponse.json({ entry, record: returned });
        },
      ),
      http.delete(`${apiBaseUrl}/user-movie-data/1/entries/8`, () => {
        events.push({ method: "delete" });
        return HttpResponse.json({
          entry: createdEntry,
          record: { ...returned, has_entries: false, last_logged_on: null },
        });
      }),
      http.patch(`${apiBaseUrl}/user-movie-data/1`, async ({ request }) => {
        events.push({ method: "save", body: await request.json() });
        return HttpResponse.json(
          kind === "save" && events.length === 1 ? returned : shown,
        );
      }),
    );
    const user = userEvent.setup();
    render(
      <EntryDialogHost>
        <Opener edit={kind === "edit"} dateOn={kind === "dated"} />
      </EntryDialogHost>,
    );
    await user.click(screen.getByRole("button", { name: "Open entry" }));
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "Review" })).toBeEnabled(),
    );
    if (kind === "review")
      await user.type(
        screen.getByRole("textbox", { name: "Review" }),
        "A review",
      );
    if (kind === "save")
      await user.click(screen.getByRole("button", { name: "Clear" }));
    if (kind === "edit")
      await user.click(screen.getByRole("checkbox", { name: "Liked" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    const title =
      kind === "dated"
        ? "Logged"
        : kind === "review"
          ? "Review saved"
          : kind === "save"
            ? "Saved"
            : "Entry updated";
    await waitFor(() => expect(screen.getByText(title)).toBeVisible());
    expect(screen.getAllByText(title)).toHaveLength(1);
    expect(screen.queryByText("Rating cleared")).not.toBeInTheDocument();
    if (kind === "dated") {
      expect(
        screen.getByText("Also removed from your watchlist."),
      ).toBeVisible();
      expect(
        screen.queryByText("Also marked as watched."),
      ).not.toBeInTheDocument();
    }
    if (kind === "review")
      expect(
        screen.getByText(
          "Also marked as watched and removed from your watchlist.",
        ),
      ).toBeVisible();
    if (kind === "edit") {
      expect(
        screen.queryByText("Your like was removed."),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Undo" }),
      ).not.toBeInTheDocument();
      return;
    }
    await user.click(screen.getByRole("button", { name: "Undo" }));
    await waitFor(() =>
      expect(events.map((event) => event.method)).toEqual(
        kind === "save" ? ["save", "save"] : ["create", "delete", "save"],
      ),
    );
    expect(events.at(-1)?.body).toEqual(
      kind === "save"
        ? {
            user_rating: 7,
            undo: true,
            time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          }
        : {
            user_watched: false,
            user_on_watchlist: true,
            user_liked: false,
            undo: true,
            time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Undo" }),
      ).not.toBeInTheDocument(),
    );
  },
);

it.each([true, false])(
  "a create with no changed tracking field offers deletion-only Undo; deletion succeeds: %s",
  async (success) => {
    const shown = createMockUserMovieData({ user_watched: true });
    const events: string[] = [];
    server.use(
      http.get(`${apiBaseUrl}/user-movie-data/1/entries`, () =>
        HttpResponse.json({ record: shown, entries: [] }),
      ),
      http.post(`${apiBaseUrl}/user-movie-data/1/entries`, () => {
        events.push("create");
        return HttpResponse.json({
          entry: freshEntry(),
          record: { ...shown, has_entries: true },
        });
      }),
      http.delete(`${apiBaseUrl}/user-movie-data/1/entries/7`, () => {
        events.push("delete");
        return success
          ? HttpResponse.json({ entry: freshEntry(), record: shown })
          : HttpResponse.json({ detail: "Refused" }, { status: 429 });
      }),
      http.patch(`${apiBaseUrl}/user-movie-data/1`, () => {
        events.push("save");
        return HttpResponse.json(shown);
      }),
    );
    const user = userEvent.setup();
    render(
      <EntryDialogHost>
        <Opener />
      </EntryDialogHost>,
    );
    await user.click(screen.getByRole("button", { name: "Open entry" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Save" })).toBeEnabled(),
    );
    await user.click(screen.getByRole("button", { name: "Save" }));
    await user.click(await screen.findByRole("button", { name: "Undo" }));
    if (!success)
      await waitFor(() =>
        expect(screen.getByText("Failed to save entry")).toBeVisible(),
      );
    await waitFor(() => expect(events).toEqual(["create", "delete"]));
  },
);

it("a failed deletion stops Undo before a differing record could be restored", async () => {
  const shown = createMockUserMovieData({ user_on_watchlist: true });
  let patches = 0;
  server.use(
    http.get(`${apiBaseUrl}/user-movie-data/1/entries`, () =>
      HttpResponse.json({ record: shown, entries: [] }),
    ),
    http.post(`${apiBaseUrl}/user-movie-data/1/entries`, () =>
      HttpResponse.json({
        entry: freshEntry(),
        record: {
          ...shown,
          user_watched: true,
          user_on_watchlist: false,
          has_entries: true,
        },
      }),
    ),
    http.delete(`${apiBaseUrl}/user-movie-data/1/entries/7`, () =>
      HttpResponse.json({ detail: "Refused" }, { status: 429 }),
    ),
    http.patch(`${apiBaseUrl}/user-movie-data/1`, () => {
      patches++;
      return HttpResponse.json(shown);
    }),
  );
  const user = userEvent.setup();
  render(
    <EntryDialogHost>
      <Opener />
    </EntryDialogHost>,
  );
  await user.click(screen.getByRole("button", { name: "Open entry" }));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled(),
  );
  await user.click(screen.getByRole("button", { name: "Save" }));
  await user.click(await screen.findByRole("button", { name: "Undo" }));
  await waitFor(() =>
    expect(screen.getByText("Failed to save entry")).toBeVisible(),
  );
  expect(patches).toBe(0);
});

it("failed saves retain the dialog and typed review", async () => {
  server.use(
    http.post(`${apiBaseUrl}/user-movie-data/1/entries`, () =>
      HttpResponse.json({ detail: "Refused" }, { status: 429 }),
    ),
  );
  const user = userEvent.setup();
  render(
    <EntryDialogHost>
      <Opener />
    </EntryDialogHost>,
  );
  await user.click(screen.getByRole("button", { name: "Open entry" }));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled(),
  );
  await user.type(
    screen.getByRole("textbox", { name: "Review" }),
    "Keep my review",
  );
  await user.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() =>
    expect(screen.getByText("Failed to save entry")).toBeVisible(),
  );
  expect(screen.getByRole("dialog", { name: "Review or log" })).toBeVisible();
  expect(screen.getByRole("textbox", { name: "Review" })).toHaveValue(
    "Keep my review",
  );
});

it.each(["keyboard", "pointer"])(
  "chooses a film inside the dialog by %s without closing it",
  async (input) => {
    let written = false;
    server.use(
      http.get(`${apiBaseUrl}/movies/search`, () =>
        HttpResponse.json({
          page: 1,
          total_pages: 1,
          total_results: 1,
          results: [createMockMovieListItem({ title: "Test film" })],
        }),
      ),
      http.post(`${apiBaseUrl}/user-movie-data/1/entries`, () => {
        written = true;
        return HttpResponse.json({
          entry: freshEntry(),
          record: createMockUserMovieData({
            user_watched: true,
            has_entries: true,
          }),
        });
      }),
    );
    const user = userEvent.setup();
    render(
      <EntryDialogHost>
        <Opener picker />
      </EntryDialogHost>,
    );
    await user.click(screen.getByRole("button", { name: "Open entry" }));
    await user.type(screen.getByRole("combobox", { name: "Film" }), "test");
    const option = await screen.findByRole("option", {
      name: "Test film 2024",
    });
    if (input === "keyboard") await user.keyboard("{ArrowDown}{Enter}");
    else await user.click(option);
    expect(screen.getByRole("dialog", { name: "Review or log" })).toBeVisible();
    expect(screen.getByText("Test film")).toBeVisible();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Save" })).toBeEnabled(),
    );
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(written).toBe(true));
  },
);

it.each(["Cancel", "Close", "Escape"])(
  "%s asks before discarding a changed review and resets on the next opening",
  async (method) => {
    const user = userEvent.setup();
    render(
      <EntryDialogHost>
        <Opener />
      </EntryDialogHost>,
    );
    await user.click(screen.getByRole("button", { name: "Open entry" }));
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "Review" })).toBeEnabled(),
    );
    await user.type(
      screen.getByRole("textbox", { name: "Review" }),
      "Keep this",
    );
    const close = async () => {
      if (method === "Escape") await user.keyboard("{Escape}");
      else await user.click(screen.getByRole("button", { name: method }));
    };
    await close();
    expect(
      await screen.findByRole("alertdialog", { name: "Discard your review?" }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Keep editing" }));
    expect(screen.getByRole("textbox", { name: "Review" })).toHaveValue(
      "Keep this",
    );
    await close();
    await user.click(await screen.findByRole("button", { name: "Discard" }));
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Review or log" }),
      ).not.toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: "Open entry" }));
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "Review" })).toBeEnabled(),
    );
    expect(screen.getByRole("textbox", { name: "Review" })).toHaveValue("");
    await close();
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Review or log" }),
      ).not.toBeInTheDocument(),
    );
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  },
);

it.each([-1, 1])(
  "history navigation %s closes a dirty dialog without saving or asking",
  async (direction) => {
    const router = createMemoryRouter(
      [
        {
          path: "*",
          element: (
            <EntryDialogHost>
              <Opener />
            </EntryDialogHost>
          ),
        },
      ],
      { initialEntries: ["/first", "/second", "/third"], initialIndex: 1 },
    );
    const user = userEvent.setup();
    rawRender(
      <TestProviders>
        <RouterProvider router={router} />
      </TestProviders>,
    );
    const location = screen.getByRole("status", { name: "Current location" });
    await user.click(screen.getByRole("button", { name: "Open entry" }));
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "Review" })).toBeEnabled(),
    );
    await user.type(screen.getByRole("textbox", { name: "Review" }), "Unsaved");
    await act(async () => router.navigate(direction));
    expect(location).toHaveTextContent(direction < 0 ? "/first" : "/third");
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  },
);

it("a change of user removes an entry Undo before it can send anything", async () => {
  let deletions = 0;
  server.use(
    http.post(`${apiBaseUrl}/user-movie-data/1/entries`, () =>
      HttpResponse.json({
        entry: freshEntry(),
        record: createMockUserMovieData({
          user_watched: true,
          has_entries: true,
        }),
      }),
    ),
    http.delete(`${apiBaseUrl}/user-movie-data/1/entries/7`, () => {
      deletions++;
      return HttpResponse.json({
        entry: freshEntry(),
        record: createMockUserMovieData(),
      });
    }),
  );
  const user = userEvent.setup();
  render(
    <EntryDialogHost>
      <Opener />
    </EntryDialogHost>,
  );
  await user.click(screen.getByRole("button", { name: "Open entry" }));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled(),
  );
  await user.click(screen.getByRole("button", { name: "Save" }));
  const undo = await screen.findByRole("button", { name: "Undo" });
  await user.click(screen.getByRole("button", { name: "Change user" }));
  await user.click(undo);
  expect(deletions).toBe(0);
  expect(
    screen.queryByRole("button", { name: "Undo" }),
  ).not.toBeInTheDocument();
});

it.each(["edit", "new review", "discard confirmation"])(
  "retires the private %s without navigation when user ownership ends",
  async (draft) => {
    let retire = () => {};
    function OwnershipBoundary() {
      const client = useQueryClient();
      useEffect(() => {
        retire = () => beginUserChange(client);
      }, [client]);
      return null;
    }
    const user = userEvent.setup();
    const view = render(
      <EntryDialogHost>
        <OwnershipBoundary />
        <Opener edit={draft === "edit"} />
      </EntryDialogHost>,
    );
    const location = screen.getByRole("status", { name: "Current location" });
    const original = location.textContent;
    await user.click(screen.getByRole("button", { name: "Open entry" }));
    const review = screen.getByRole("textbox", { name: "Review" });
    await waitFor(() => expect(review).toBeEnabled());
    if (draft === "edit") expect(review).toHaveValue(entry.review);
    else await user.type(review, "Private unfinished review");
    if (draft === "discard confirmation") {
      await user.click(screen.getByRole("button", { name: "Cancel" }));
      expect(
        await screen.findByRole("alertdialog", {
          name: "Discard your review?",
        }),
      ).toBeVisible();
    }

    act(() => retire());
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
    expect(review).not.toBeInTheDocument();
    expect(location.textContent).toBe(original);

    // A later owner's entry point opens a fresh form in the same host and route.
    view.rerender(
      <EntryDialogHost>
        <OwnershipBoundary />
        <Opener />
      </EntryDialogHost>,
    );
    await user.click(screen.getByRole("button", { name: "Open entry" }));
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "Review" })).toBeEnabled(),
    );
    expect(screen.getByRole("textbox", { name: "Review" })).toHaveValue("");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  },
);

it("retires an opening whose owner ended before its listener was installed", async () => {
  function RetiringOpener() {
    const { open } = useEntryDialog();
    const client = useQueryClient();
    return (
      <button
        onClick={() => {
          open({ film, entry, dateOn: true, filmChangeable: false });
          beginUserChange(client);
        }}
      >
        Open expired entry
      </button>
    );
  }
  const user = userEvent.setup();
  render(
    <EntryDialogHost>
      <RetiringOpener />
    </EntryDialogHost>,
  );
  await user.click(screen.getByRole("button", { name: "Open expired entry" }));
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  expect(screen.queryByDisplayValue(entry.review)).not.toBeInTheDocument();
});

it("shows save progress and leaves a newly opened draft intact when an earlier save finishes", async () => {
  const held = gate();
  server.use(
    http.post(`${apiBaseUrl}/user-movie-data/1/entries`, async () => {
      await held.wait;
      return HttpResponse.json({
        entry: freshEntry(),
        record: createMockUserMovieData({
          user_watched: true,
          has_entries: true,
        }),
      });
    }),
  );
  const user = userEvent.setup();
  const view = render(
    <EntryDialogHost>
      <Opener />
    </EntryDialogHost>,
  );
  try {
    await user.click(screen.getByRole("button", { name: "Open entry" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Save" })).toBeEnabled(),
    );
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(
      await screen.findByRole("button", { name: "Saving…" }),
    ).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Review" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: "Open entry" }));
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "Review" })).toBeEnabled(),
    );
    await user.type(
      screen.getByRole("textbox", { name: "Review" }),
      "New draft",
    );
    held.release();
    await waitFor(() => expect(screen.getByText("Logged")).toBeVisible());
    expect(screen.getByRole("dialog", { name: "Review or log" })).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Review" })).toHaveValue(
      "New draft",
    );
  } finally {
    held.release();
    view.unmount();
  }
});

it("reopening after saving a changed review has no discard prompt", async () => {
  server.use(
    http.post(`${apiBaseUrl}/user-movie-data/1/entries`, () =>
      HttpResponse.json({
        entry: { ...freshEntry(), review: "Saved review" },
        record: createMockUserMovieData({
          user_watched: true,
          has_entries: true,
        }),
      }),
    ),
  );
  const user = userEvent.setup();
  render(
    <EntryDialogHost>
      <Opener />
    </EntryDialogHost>,
  );
  await user.click(screen.getByRole("button", { name: "Open entry" }));
  await waitFor(() =>
    expect(screen.getByRole("textbox", { name: "Review" })).toBeEnabled(),
  );
  await user.type(
    screen.getByRole("textbox", { name: "Review" }),
    "Saved review",
  );
  await user.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  await user.click(screen.getByRole("button", { name: "Open entry" }));
  await waitFor(() =>
    expect(screen.getByRole("textbox", { name: "Review" })).toBeEnabled(),
  );
  expect(screen.getByRole("textbox", { name: "Review" })).toHaveValue("");
  await user.click(screen.getByRole("button", { name: "Cancel" }));
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
});

function freshEntry() {
  return {
    ...entry,
    watched_on: new Date().toLocaleDateString("en-CA"),
    rating: null,
    review: null,
  };
}
