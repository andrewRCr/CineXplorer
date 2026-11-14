import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@tests/helpers/test-renderer";
import userEvent from "@testing-library/user-event";
import { useQuery } from "@tanstack/react-query";
import { http, HttpResponse } from "msw/http";
import { server } from "@tests/mocks/server";
import { createMockUserMovieData } from "@tests/mocks/movieData";
import { clearBrowserAuth } from "@tests/helpers/auth";
import { gate } from "@tests/helpers/web-locks";
import { apiBaseUrl } from "@/config/baseUrls";
import apiClient from "@/services/apiClient";
import { Toaster, toaster } from "@/components/core/chakra/toaster";
import type { UserMovieDataSchema } from "@/services/userMovieDataService";
import { useUserMovieState } from "../useUserMovieState";

const payload = createMockUserMovieData({
  user_watched: true,
  has_entries: false,
  last_logged_on: null,
});
function Probe({ value = payload }: { value?: UserMovieDataSchema | null }) {
  const { state, save } = useUserMovieState(1, value);
  return (
    <>
      <output aria-label="state">{JSON.stringify(state)}</output>
      <button
        onClick={() => save({ user_on_watchlist: !state?.user_on_watchlist })}
      >
        Watchlist
      </button>
      <button onClick={() => save({ user_watched: false })}>Unwatch</button>
      <button onClick={() => save({ user_liked: true })}>Like</button>
    </>
  );
}
function Queries() {
  const library = useQuery({
    queryKey: ["library", "probe"],
    queryFn: () => apiClient.get("/library-probe").then((r) => r.data),
  });
  const movies = useQuery({
    queryKey: ["movies", "list"],
    queryFn: () => apiClient.get("/movies-probe").then((r) => r.data),
  });
  const detail = useQuery({
    queryKey: ["movies", "detail", 1],
    queryFn: () => apiClient.get("/detail-probe").then((r) => r.data),
  });
  return (
    <output aria-label="queries">
      {JSON.stringify([library.data, movies.data, detail.data])}
    </output>
  );
}
const shown = () =>
  JSON.parse(screen.getByLabelText("state").textContent ?? "null");
beforeEach(() => {
  clearBrowserAuth();
  document.cookie = "csrftoken=save-test; path=/";
  act(() => toaster.remove());
});
afterEach(() => {
  act(() => toaster.remove());
  vi.useRealTimers();
});

describe("shared movie saves", () => {
  it.each([false, true])(
    "Undo sends one opposite save without offering another Undo; unmounted: %s",
    async (unmounted) => {
      const requests: unknown[] = [];
      const undo = gate();
      server.use(
        http.patch(`${apiBaseUrl}/user-movie-data/1`, async ({ request }) => {
          const changes = await request.json();
          requests.push(changes);
          if (requests.length === 2) await undo.wait;
          return HttpResponse.json(
            createMockUserMovieData({
              user_on_watchlist: requests.length === 1,
            }),
          );
        }),
      );
      const user = userEvent.setup();
      const view = render(
        <>
          <Probe key="probe" />
          <Toaster key="toasts" />
        </>,
      );
      await user.click(screen.getByRole("button", { name: "Watchlist" }));
      await waitFor(() =>
        expect(screen.getByText("Added to watchlist")).toBeVisible(),
      );
      if (unmounted) view.rerender(<Toaster key="toasts" />);
      await user.click(screen.getByRole("button", { name: "Undo" }));
      await waitFor(() => expect(requests).toHaveLength(2));
      if (!unmounted) expect(shown()).not.toHaveProperty("undo");
      undo.release();
      await waitFor(() =>
        expect(screen.getByText("Removed from watchlist")).toBeVisible(),
      );
      await waitFor(() =>
        expect(
          screen.queryByRole("button", { name: "Undo" }),
        ).not.toBeInTheDocument(),
      );
      expect(requests).toEqual([
        { user_on_watchlist: true },
        { user_on_watchlist: false, undo: true },
      ]);
      if (!unmounted) expect(shown()).not.toHaveProperty("undo");
    },
  );

  it.each([true, false])(
    "takes its watchlist toast from the server record: %s",
    async (onWatchlist) => {
      server.use(
        http.patch(`${apiBaseUrl}/user-movie-data/1`, () =>
          HttpResponse.json(
            createMockUserMovieData({ user_on_watchlist: onWatchlist }),
          ),
        ),
      );
      const user = userEvent.setup();
      render(
        <>
          <Probe />
          <Toaster />
        </>,
      );
      await user.click(screen.getByRole("button", { name: "Watchlist" }));
      await waitFor(() =>
        expect(
          screen.getByText(
            onWatchlist ? "Added to watchlist" : "Removed from watchlist",
          ),
        ).toBeVisible(),
      );
      expect(shown().user_on_watchlist).toBe(onWatchlist);
    },
  );

  it("shows an empty record for a null payload", () => {
    render(<Probe value={null} />);
    expect(shown()).toEqual(createMockUserMovieData());
  });
  it("shows a pending save and replaces the whole record on success", async () => {
    const release = gate();
    const accepted = createMockUserMovieData({
      has_entries: true,
      last_logged_on: "2026-11-01",
      user_watched: true,
      user_liked: true,
    });
    server.use(
      http.patch(`${apiBaseUrl}/user-movie-data/1`, async () => {
        await release.wait;
        return HttpResponse.json(accepted);
      }),
    );
    const user = userEvent.setup();
    render(
      <>
        <Probe />
        <Toaster />
      </>,
    );
    await user.click(screen.getByRole("button", { name: "Like" }));
    await waitFor(() =>
      expect(shown()).toEqual({ ...payload, user_liked: true }),
    );
    release.release();
    await waitFor(() => expect(shown()).toEqual(accepted));
  });
  it.each([false, true])(
    "runs two queued saves in order; first succeeds: %s",
    async (firstSucceeds) => {
      const first = gate();
      const second = gate();
      const requests: unknown[] = [];
      const accepted = createMockUserMovieData({ user_on_watchlist: true });
      server.use(
        http.patch(`${apiBaseUrl}/user-movie-data/1`, async ({ request }) => {
          requests.push(await request.json());
          const index = requests.length;
          await (index === 1 ? first : second).wait;
          return index === 1 && firstSucceeds
            ? HttpResponse.json(accepted)
            : HttpResponse.json({}, { status: 429 });
        }),
      );
      const user = userEvent.setup();
      render(
        <>
          <Probe />
          <Toaster />
        </>,
      );
      await user.click(screen.getByRole("button", { name: "Watchlist" }));
      await waitFor(() => expect(requests).toHaveLength(1));
      await user.click(screen.getByRole("button", { name: "Watchlist" }));
      expect(shown().user_on_watchlist).toBe(false);
      expect(requests).toEqual([{ user_on_watchlist: true }]);
      first.release();
      await waitFor(() =>
        expect(requests).toEqual([
          { user_on_watchlist: true },
          { user_on_watchlist: false },
        ]),
      );
      second.release();
      await waitFor(() =>
        expect(shown()).toEqual(firstSucceeds ? accepted : payload),
      );
      await waitFor(() =>
        expect(
          screen.getAllByText("Failed to update watchlist").length,
        ).toBeGreaterThan(0),
      );
    },
  );
  it.each([
    [500, "Watchlist", "Failed to update watchlist"],
    [429, "Watchlist", "Failed to update watchlist"],
    [429, "Like", "Failed to save changes"],
  ] as const)("rolls back %s on %s", async (status, button, title) => {
    server.use(
      http.patch(`${apiBaseUrl}/user-movie-data/1`, () =>
        HttpResponse.json({}, { status }),
      ),
    );
    const user = userEvent.setup();
    render(
      <>
        <Probe />
        <Toaster />
      </>,
    );
    await user.click(screen.getByRole("button", { name: button }));
    await waitFor(() => expect(screen.getByText(title)).toBeVisible());
    expect(shown()).toEqual(payload);
    expect(screen.getByText("Please try again.")).toBeVisible();
    if (status === 500)
      await waitFor(() =>
        expect(screen.getByText("Server error")).toBeVisible(),
      );
  });
  it.each([true, false])(
    "invalidates only the Library on success, including after unmount; success: %s",
    async (success) => {
      const release = gate();
      const counts = { library: 0, movies: 0, detail: 0 };
      server.use(
        ...(["library", "movies", "detail"] as const).map((name) =>
          http.get(`${apiBaseUrl}/${name}-probe`, () => {
            counts[name]++;
            return HttpResponse.json(name);
          }),
        ),
        http.patch(`${apiBaseUrl}/user-movie-data/1`, async () => {
          await release.wait;
          return HttpResponse.json(
            createMockUserMovieData({ user_on_watchlist: true }),
            { status: success ? 200 : 429 },
          );
        }),
      );
      const user = userEvent.setup();
      const view = render(
        <>
          <Probe key="probe" />
          <Queries key="queries" />
          <Toaster key="toasts" />
        </>,
      );
      await waitFor(() =>
        expect(screen.getByLabelText("queries")).toHaveTextContent(
          '["library","movies","detail"]',
        ),
      );
      await user.click(screen.getByRole("button", { name: "Watchlist" }));
      view.rerender(
        <>
          <Queries key="queries" />
          <Toaster key="toasts" />
        </>,
      );
      release.release();
      await waitFor(() =>
        expect(
          screen.getByText(
            success ? "Added to watchlist" : "Failed to update watchlist",
          ),
        ).toBeVisible(),
      );
      await waitFor(() =>
        expect(counts).toEqual({
          library: success ? 2 : 1,
          movies: 1,
          detail: 1,
        }),
      );
      expect(screen.getByLabelText("queries")).toHaveTextContent(
        '["library","movies","detail"]',
      );
    },
  );
  it("keeps settled saves after five minutes without an observer", async () => {
    server.use(
      http.patch(`${apiBaseUrl}/user-movie-data/1`, () =>
        HttpResponse.json(createMockUserMovieData({ user_on_watchlist: true })),
      ),
    );
    const user = userEvent.setup();
    const view = render(
      <>
        <Probe />
        <Toaster />
      </>,
    );
    await user.click(screen.getByRole("button", { name: "Watchlist" }));
    await waitFor(() => expect(shown().user_on_watchlist).toBe(true));
    await waitFor(() =>
      expect(screen.getByText("Added to watchlist")).toBeVisible(),
    );
    vi.useFakeTimers();
    view.rerender(<div />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6 * 60 * 1000);
    });
    view.rerender(<Probe />);
    expect(shown().user_on_watchlist).toBe(true);
  });
});
