import { afterEach, beforeEach, expect, it } from "vitest";
import { act, render, screen, waitFor } from "@tests/helpers/test-renderer";
import userEvent from "@testing-library/user-event";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { http, HttpResponse } from "msw/http";
import { apiBaseUrl } from "@/config/baseUrls";
import { Toaster, toaster } from "@/components/core/chakra/toaster";
import { beginUserChange, getChangeCount } from "@/lib/session";
import type {
  UserMovieDataPatchSchema,
  UserMovieDataSchema,
} from "@/services/userMovieDataService";
import { clearBrowserAuth } from "@tests/helpers/auth";
import { createMockUserMovieData } from "@tests/mocks/movieData";
import { server } from "@tests/mocks/server";
import { saveMutationOptions, useUserMovieState } from "../useUserMovieState";

function Probe({
  shown,
  changes,
}: {
  shown: UserMovieDataSchema;
  changes: UserMovieDataPatchSchema;
}) {
  const { state, save } = useUserMovieState(1, shown);
  const client = useQueryClient();
  return (
    <>
      <output aria-label="Film state">{JSON.stringify(state)}</output>
      <button onClick={() => save(changes)}>Save</button>
      <button onClick={() => beginUserChange(client)}>Change user</button>
    </>
  );
}

beforeEach(() => {
  clearBrowserAuth();
  document.cookie = "csrftoken=feedback-test; path=/";
  act(() => toaster.remove());
});
afterEach(() => act(() => toaster.remove()));

const cases = [
  {
    name: "marking watched removes the watchlist",
    shown: { user_on_watchlist: true },
    changes: { user_watched: true },
    returned: { user_watched: true },
    title: "Marked as watched",
    description: "Also removed from your watchlist.",
    undo: {
      user_watched: false,
      user_on_watchlist: true,
      user_liked: false,
      undo: true,
    },
  },
  {
    name: "liking also marks watched and removes the watchlist",
    shown: { user_on_watchlist: true },
    changes: { user_liked: true },
    returned: { user_watched: true, user_liked: true },
    title: "Liked",
    description: "Also marked as watched and removed from your watchlist.",
    undo: {
      user_liked: false,
      user_watched: false,
      user_on_watchlist: true,
      undo: true,
    },
  },
  {
    name: "rating also marks watched and removes the watchlist",
    shown: { user_on_watchlist: true },
    changes: { user_rating: 4 },
    returned: { user_watched: true, user_rating: 4 },
    title: "Rated",
    description: "Also marked as watched and removed from your watchlist.",
    undo: {
      user_rating: null,
      user_watched: false,
      user_on_watchlist: true,
      user_liked: false,
      undo: true,
    },
  },
  {
    name: "clearing a rating restores just that rating",
    shown: { user_watched: true, user_rating: 4 },
    changes: { user_rating: null },
    returned: { user_watched: true },
    title: "Rating cleared",
    description: undefined,
    undo: { user_rating: 4, undo: true },
  },
  {
    name: "unmarking watched clears a like and preserves watchlist membership",
    shown: { user_watched: true, user_liked: true, user_on_watchlist: true },
    changes: { user_watched: false },
    returned: { user_on_watchlist: true },
    title: "Marked as not watched",
    description: "Your like was removed.",
    undo: {
      user_watched: true,
      user_liked: true,
      user_on_watchlist: true,
      undo: true,
    },
  },
] satisfies {
  name: string;
  shown: Partial<UserMovieDataSchema>;
  changes: UserMovieDataPatchSchema;
  returned: Partial<UserMovieDataSchema>;
  title: string;
  description: string | undefined;
  undo: UserMovieDataPatchSchema;
}[];

it.each(cases)("$name", async (testCase) => {
  const initial = createMockUserMovieData(testCase.shown);
  const accepted = createMockUserMovieData(testCase.returned);
  const requests: unknown[] = [];
  server.use(
    http.patch(`${apiBaseUrl}/user-movie-data/1`, async ({ request }) => {
      requests.push(await request.json());
      return HttpResponse.json(requests.length === 1 ? accepted : initial);
    }),
  );
  const user = userEvent.setup();
  render(
    <>
      <Probe shown={initial} changes={testCase.changes} />
      <Toaster />
    </>,
  );
  await user.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() => expect(screen.getByText(testCase.title)).toBeVisible());
  if (testCase.description)
    expect(screen.getByText(testCase.description)).toBeVisible();
  expect(screen.queryByText("Also marked as watched.")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Undo" }));
  await waitFor(() =>
    expect(requests).toEqual(
      [testCase.changes, testCase.undo].map((body) => ({
        ...body,
        time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })),
    ),
  );
  await waitFor(() =>
    expect(
      screen.getByRole("status", { name: "Film state" }),
    ).toHaveTextContent(JSON.stringify(initial)),
  );
  if (accepted.user_on_watchlist !== initial.user_on_watchlist)
    await waitFor(() =>
      expect(screen.getByText("Added to watchlist")).toBeVisible(),
    );
  else expect(screen.queryByText("Added to watchlist")).not.toBeInTheDocument();
  await waitFor(() =>
    expect(
      screen.queryByRole("button", { name: "Undo" }),
    ).not.toBeInTheDocument(),
  );
});

it("an old user's Undo cannot send a request", async () => {
  let requests = 0;
  server.use(
    http.patch(`${apiBaseUrl}/user-movie-data/1`, () => {
      requests++;
      return HttpResponse.json(createMockUserMovieData({ user_watched: true }));
    }),
  );
  const user = userEvent.setup();
  render(
    <>
      <Probe
        shown={createMockUserMovieData({ user_watched: true, user_rating: 3 })}
        changes={{ user_rating: null }}
      />
      <Toaster />
    </>,
  );
  await user.click(screen.getByRole("button", { name: "Save" }));
  const undo = await screen.findByRole("button", { name: "Undo" });
  await user.click(screen.getByRole("button", { name: "Change user" }));
  await user.click(undo);
  expect(requests).toBe(1);
});

it.each([
  {
    name: "watched",
    shown: {},
    changes: { user_watched: true },
    returned: { user_watched: true },
  },
  {
    name: "like marks watched",
    shown: {},
    changes: { user_liked: true },
    returned: { user_watched: true, user_liked: true },
  },
  {
    name: "rating marks watched",
    shown: {},
    changes: { user_rating: 3 },
    returned: { user_watched: true, user_rating: 3 },
  },
  {
    name: "unlike",
    shown: { user_watched: true, user_liked: true },
    changes: { user_liked: false },
    returned: { user_watched: true },
  },
  {
    name: "unwatch without a like",
    shown: { user_watched: true },
    changes: { user_watched: false },
    returned: {},
  },
])("$name stays silent", async ({ shown, changes, returned }) => {
  const accepted = createMockUserMovieData(returned);
  server.use(
    http.patch(`${apiBaseUrl}/user-movie-data/1`, () =>
      HttpResponse.json(accepted),
    ),
  );
  const user = userEvent.setup();
  render(
    <>
      <Probe shown={createMockUserMovieData(shown)} changes={changes} />
      <Toaster />
    </>,
  );
  await user.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() =>
    expect(
      screen.getByRole("status", { name: "Film state" }),
    ).toHaveTextContent(JSON.stringify(accepted)),
  );
  expect(
    screen.queryByRole("button", { name: "Undo" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByText(/^(Marked as|Liked|Rated|Also marked)/),
  ).not.toBeInTheDocument();
});

it.each([true, false])(
  "watchlist feedback has no description and only a changed field offers Undo: %s",
  async (changed) => {
    const accepted = createMockUserMovieData({ user_watched: true });
    server.use(
      http.patch(`${apiBaseUrl}/user-movie-data/1`, () =>
        HttpResponse.json(accepted),
      ),
    );
    const user = userEvent.setup();
    render(
      <>
        <Probe
          shown={{ ...accepted, user_on_watchlist: changed }}
          changes={{ user_on_watchlist: false }}
        />
        <Toaster />
      </>,
    );
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(screen.getByText("Removed from watchlist")).toBeVisible(),
    );
    expect(screen.queryByText(/^(Also |Your like)/)).not.toBeInTheDocument();
    if (changed)
      expect(screen.getByRole("button", { name: "Undo" })).toBeVisible();
    else
      expect(
        screen.queryByRole("button", { name: "Undo" }),
      ).not.toBeInTheDocument();
  },
);

function SilentProbe() {
  const save = useMutation(saveMutationOptions(1));
  return (
    <>
      <button
        onClick={() =>
          save.mutate({
            kind: "save",
            shown: createMockUserMovieData(),
            changes: { user_on_watchlist: true },
            silent: true,
            change: getChangeCount(),
          })
        }
      >
        Silent save
      </button>
      <output aria-label="Save status">{save.status}</output>
    </>
  );
}

it.each([true, false])(
  "a silent save suppresses success feedback but keeps errors; succeeds: %s",
  async (success) => {
    server.use(
      http.patch(`${apiBaseUrl}/user-movie-data/1`, () =>
        HttpResponse.json(
          success
            ? createMockUserMovieData({ user_on_watchlist: true })
            : { detail: "Try again" },
          { status: success ? 200 : 429 },
        ),
      ),
    );
    const user = userEvent.setup();
    render(
      <>
        <SilentProbe />
        <Toaster />
      </>,
    );
    await user.click(screen.getByRole("button", { name: "Silent save" }));
    await waitFor(() =>
      expect(
        screen.getByRole("status", { name: "Save status" }),
      ).toHaveTextContent(success ? "success" : "error"),
    );
    expect(screen.queryByText("Added to watchlist")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Undo" }),
    ).not.toBeInTheDocument();
    if (!success)
      await waitFor(() =>
        expect(screen.getByText("Failed to update watchlist")).toBeVisible(),
      );
  },
);

it("a refused watched unmark explains the conflict and keeps the film watched", async () => {
  const initial = createMockUserMovieData({ user_watched: true });
  const reason =
    "Remove your rating and entries before marking this film unwatched.";
  server.use(
    http.patch(`${apiBaseUrl}/user-movie-data/1`, () =>
      HttpResponse.json({ detail: reason }, { status: 409 }),
    ),
  );
  const user = userEvent.setup();
  render(
    <>
      <Probe shown={initial} changes={{ user_watched: false }} />
      <Toaster />
    </>,
  );
  await user.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() =>
    expect(screen.getByText("Couldn't change Watched")).toBeVisible(),
  );
  expect(screen.getByText(reason)).toBeVisible();
  expect(screen.getByRole("status", { name: "Film state" })).toHaveTextContent(
    JSON.stringify(initial),
  );
});
