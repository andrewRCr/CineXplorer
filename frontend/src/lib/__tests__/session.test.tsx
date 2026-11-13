import { beforeEach, expect, it } from "vitest";
import { useEffect } from "react";
import { isCancel } from "axios";
import {
  useQuery,
  useQueryClient,
  useMutationState,
} from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@tests/helpers/test-renderer";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { Toaster, toaster } from "@/components/core/chakra/toaster";
import { useUserMovieState } from "@/hooks/movie/useUserMovieState";
import apiClient from "@/services/apiClient";
import { apiBaseUrl } from "@/config/baseUrls";
import { createMockUserMovieData } from "@tests/mocks/movieData";
import { clearBrowserAuth } from "@tests/helpers/auth";
import { gate } from "@tests/helpers/web-locks";
import { server } from "@tests/mocks/server";
import { beginUserChange, changeOfUser, sessionKey } from "../session";

beforeEach(() => {
  clearBrowserAuth();
  document.cookie = "csrftoken=change-test; path=/";
  act(() => toaster.remove());
});
// Retire fixture-owned saves before cleanup replaces the network handlers.
function useFixtureClient() {
  const client = useQueryClient();
  useEffect(() => () => beginUserChange(client), [client]);
  return client;
}
function Probe() {
  const client = useFixtureClient();
  const { state, save } = useUserMovieState(1, null);
  const movie = useQuery({
    queryKey: ["movies", "change-probe"],
    queryFn: () => apiClient.get("/change-movie").then((r) => r.data),
  });
  const library = useQuery({
    queryKey: ["library", "change-probe"],
    queryFn: () => apiClient.get("/change-library").then((r) => r.data),
  });
  const session = useQuery({
    queryKey: sessionKey,
    queryFn: () => apiClient.get("/change-session").then((r) => r.data),
    staleTime: Infinity,
  });
  return (
    <>
      <output aria-label="watchlist">{String(state.user_on_watchlist)}</output>
      <output aria-label="reads">
        {JSON.stringify([movie.data, library.data, session.data])}
      </output>
      <button
        onClick={() => save({ user_on_watchlist: !state.user_on_watchlist })}
      >
        Save
      </button>
      <button onClick={() => void changeOfUser(client)}>Change user</button>
    </>
  );
}
function reads() {
  const counts = { movie: 0, library: 0, session: 0 };
  server.use(
    ...(["movie", "library", "session"] as const).map((name) =>
      http.get(`${apiBaseUrl}/change-${name}`, () =>
        HttpResponse.json(++counts[name]),
      ),
    ),
  );
  return counts;
}
it.each([200, 429])(
  "drops running and queued saves on a change of user (%s)",
  async (status) => {
    const release = gate();
    const requests: unknown[] = [];
    server.use(
      http.patch(`${apiBaseUrl}/user-movie-data/1`, async ({ request }) => {
        requests.push(await request.json());
        await release.wait;
        return status === 200
          ? HttpResponse.json(
              createMockUserMovieData({ user_on_watchlist: true }),
            )
          : HttpResponse.json({ detail: "Save limit reached" }, { status });
      }),
    );
    const counts = reads();
    const user = userEvent.setup();
    // Keep a reference only to await the running operation after it leaves the cache.
    let running: { state: { status: string; error?: unknown } } | undefined;
    function Capture() {
      const client = useQueryClient();
      return (
        <button
          onClick={() => {
            running = client.getMutationCache().getAll()[0];
          }}
        >
          Capture operation
        </button>
      );
    }
    render(
      <>
        <Probe />
        <Capture />
        <Toaster />
      </>,
    );
    await waitFor(() =>
      expect(screen.getByLabelText("reads")).toHaveTextContent("[1,1,1]"),
    );
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(requests).toHaveLength(1));
    await user.click(screen.getByRole("button", { name: "Capture operation" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    await user.click(screen.getByRole("button", { name: "Change user" }));
    await waitFor(() =>
      expect(screen.getByLabelText("reads")).toHaveTextContent("[2,2,1]"),
    );
    expect(screen.getByLabelText("watchlist")).toHaveTextContent("false");
    const before = counts.library;
    release.release();
    await waitFor(() => expect(running?.state.status).toBe("error"));
    expect(isCancel(running?.state.error)).toBe(true);
    expect(requests).toEqual([{ user_on_watchlist: true }]);
    expect(counts.library).toBe(before);
    expect(screen.queryByText("Added to watchlist")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Failed to update watchlist"),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("watchlist")).toHaveTextContent("false");
  },
);
it("dismisses save toasts and preserves the server-error toast and session", async () => {
  server.use(
    http.patch(`${apiBaseUrl}/user-movie-data/1`, () =>
      HttpResponse.json(createMockUserMovieData({ user_on_watchlist: true })),
    ),
  );
  reads();
  const user = userEvent.setup();
  render(
    <>
      <Probe />
      <Toaster />
    </>,
  );
  await waitFor(() =>
    expect(screen.getByLabelText("reads")).toHaveTextContent("[1,1,1]"),
  );
  await user.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() =>
    expect(screen.getByText("Added to watchlist")).toBeVisible(),
  );
  act(() => toaster.error({ id: "server-error", title: "Server error" }));
  await user.click(screen.getByRole("button", { name: "Change user" }));
  await waitFor(() =>
    expect(screen.queryByText("Added to watchlist")).not.toBeInTheDocument(),
  );
  await waitFor(() => expect(screen.getByText("Server error")).toBeVisible());
  await waitFor(() =>
    expect(screen.getByLabelText("reads")).toHaveTextContent("[2,3,1]"),
  );
});

function ManySaveToasts() {
  const client = useFixtureClient();
  const { save } = useUserMovieState(1, null);
  const completed = useMutationState({ filters: { status: "success" } });
  return (
    <>
      <output aria-label="Completed saves">{completed.length}</output>
      <button
        onClick={() => {
          for (let i = 0; i < 3; i++) save({ user_on_watchlist: true });
        }}
      >
        Save three times
      </button>
      <button onClick={() => void changeOfUser(client)}>Change user</button>
    </>
  );
}
it("removes queued save confirmations and Undo while retaining unrelated errors", async () => {
  server.use(
    http.patch(`${apiBaseUrl}/user-movie-data/1`, () =>
      HttpResponse.json(createMockUserMovieData({ user_on_watchlist: true })),
    ),
  );
  const user = userEvent.setup();
  render(
    <>
      <ManySaveToasts />
      <Toaster />
    </>,
  );
  const unrelatedIds = Array.from({ length: 22 }, (_, i) => `unrelated-${i}`);
  act(() => {
    toaster.error({ id: "server-error", title: "Server error" });
    for (const id of unrelatedIds)
      toaster.error({ id, title: "Unrelated error" });
  });
  await user.click(screen.getByRole("button", { name: "Save three times" }));
  await waitFor(() =>
    expect(screen.getByLabelText("Completed saves")).toHaveTextContent("3"),
  );
  // Unrelated notifications leave one slot, so two completed saves are queued.
  expect(screen.getAllByText("Added to watchlist")).toHaveLength(1);
  await user.click(screen.getByRole("button", { name: "Change user" }));
  await waitFor(() =>
    expect(screen.queryAllByText("Added to watchlist")).toHaveLength(0),
  );
  expect(
    screen.queryByRole("button", { name: "Undo" }),
  ).not.toBeInTheDocument();
  expect(screen.getByText("Server error")).toBeVisible();
  act(() => {
    for (const id of unrelatedIds) toaster.remove(id);
    toaster.info({ id: "queue-probe", title: "Slots reopened" });
  });
  await screen.findByText("Slots reopened");
  expect(screen.queryAllByText("Added to watchlist")).toHaveLength(0);
  expect(
    screen.queryByRole("button", { name: "Undo" }),
  ).not.toBeInTheDocument();
});

it("does not dispatch a save retired while mutation setup yields", async () => {
  let requests = 0;
  let running: { state: { status: string } } | undefined;
  server.use(
    http.patch(`${apiBaseUrl}/user-movie-data/1`, () => {
      requests++;
      return HttpResponse.json({ detail: "Save failed" }, { status: 500 });
    }),
  );
  function SaveAndChange() {
    const client = useFixtureClient();
    const { save } = useUserMovieState(1, null);
    return (
      <button
        onClick={() => {
          save({ user_on_watchlist: true });
          running = client.getMutationCache().getAll()[0];
          void changeOfUser(client);
        }}
      >
        Save and change user
      </button>
    );
  }
  const user = userEvent.setup();
  render(
    <>
      <SaveAndChange />
      <Toaster />
    </>,
  );
  await user.click(
    screen.getByRole("button", { name: "Save and change user" }),
  );
  await waitFor(() => expect(running?.state.status).toBe("error"));
  expect(requests).toBe(0);
  expect(screen.queryByText("Server error")).not.toBeInTheDocument();
  expect(
    screen.queryByText("Failed to update watchlist"),
  ).not.toBeInTheDocument();
});
