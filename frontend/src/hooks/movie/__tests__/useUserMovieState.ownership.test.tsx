import { act, renderHook, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { isCancel } from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { http, HttpResponse } from "msw/http";
import { useUserMovieState } from "@/hooks/movie/useUserMovieState";
import { beginUserChange, changeOfUser } from "@/lib/session";
import apiClient, {
  getAuthSessionVersion,
  invalidateAuthSession,
} from "@/services/apiClient";
import { clearAuthTokens, setAuthTokens } from "@/utilities/tokenUtils";
import { Toaster, toaster } from "@/components/core/chakra/toaster";
import { apiBaseUrl } from "@/config/baseUrls";
import { TestProviders } from "@tests/helpers/test-providers";
import { authHandlers, clearBrowserAuth, token } from "@tests/helpers/auth";
import { createMockUserMovieData } from "@tests/mocks/movieData";
import { gate, installWebLocks } from "@tests/helpers/web-locks";
import { server } from "@tests/mocks/server";

function mountSave() {
  let libraries = 0;
  server.use(
    http.get(`${apiBaseUrl}/ownership-library`, () =>
      HttpResponse.json(++libraries),
    ),
  );
  const view = renderHook(
    () => {
      const library = useQuery({
        queryKey: ["library", "ownership"],
        queryFn: () =>
          apiClient.get<number>("/ownership-library").then((r) => r.data),
      });
      return {
        ...useUserMovieState(1, null),
        client: useQueryClient(),
        library: library.data,
      };
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
  return {
    ...view,
    get libraries() {
      return libraries;
    },
  };
}

beforeEach(() => {
  invalidateAuthSession();
  clearBrowserAuth();
  authHandlers();
  installWebLocks();
  document.cookie = "csrftoken=save-owner-test; path=/";
  window.location.href = "http://localhost:3000/browse";
  act(() => toaster.remove());
});
afterEach(() => act(() => toaster.remove()));

it.each([false, true])(
  "cancels native cookie preparation and permits the next owner's save; Undo: %s",
  async (undo) => {
    setAuthTokens(token());
    let patches = 0;
    server.use(
      http.patch(`${apiBaseUrl}/user-movie-data/1`, () => {
        patches++;
        return HttpResponse.json(
          createMockUserMovieData({ user_on_watchlist: true }),
        );
      }),
    );
    const view = mountSave();
    const cookie = gate();
    const entered = gate();
    const originalCookieStore = Object.getOwnPropertyDescriptor(
      window,
      "cookieStore",
    );
    const restoreCookieStore = () => {
      if (originalCookieStore)
        Object.defineProperty(window, "cookieStore", originalCookieStore);
      else Reflect.deleteProperty(window, "cookieStore");
    };
    try {
      await waitFor(() => expect(view.result.current.library).toBe(1));
      if (undo) {
        act(() => view.result.current.save({ user_on_watchlist: true }));
        await waitFor(() =>
          expect(screen.getByText("Added to watchlist")).toBeVisible(),
        );
        await waitFor(() => expect(view.result.current.library).toBe(2));
      }
      Object.defineProperty(window, "cookieStore", {
        configurable: true,
        value: {
          get: async () => {
            entered.release();
            await cookie.wait;
            return null;
          },
        },
      });
      if (undo)
        await userEvent
          .setup()
          .click(screen.getByRole("button", { name: "Undo" }));
      else act(() => view.result.current.save({ user_on_watchlist: true }));
      await entered.wait;
      const running = view.result.current.client
        .getMutationCache()
        .getAll()
        .at(-1);
      const version = getAuthSessionVersion();
      const stored = localStorage.getItem("access_token");
      act(() => {
        void changeOfUser(view.result.current.client);
      });
      await act(async () => cookie.release());
      await waitFor(() => expect(running?.state.status).not.toBe("pending"));
      await waitFor(() =>
        expect(view.result.current.library).toBe(undo ? 3 : 2),
      );
      expect(patches).toBe(undo ? 1 : 0);
      expect(isCancel(running?.state.error)).toBe(true);
      expect(view.result.current.state.user_on_watchlist).toBe(false);
      expect(localStorage.getItem("access_token")).toBe(stored);
      expect(getAuthSessionVersion()).toBe(version);
      expect(window.location.href).toBe("http://localhost:3000/browse");
      expect(screen.queryByText("Added to watchlist")).not.toBeInTheDocument();
      expect(
        screen.queryByText("Failed to update watchlist"),
      ).not.toBeInTheDocument();
      restoreCookieStore();
      act(() => view.result.current.save({ user_on_watchlist: true }));
      await waitFor(() =>
        expect(screen.getByText("Added to watchlist")).toBeVisible(),
      );
      expect(patches).toBe(undo ? 2 : 1);
      expect(view.result.current.state.user_on_watchlist).toBe(true);
    } finally {
      cookie.release();
      restoreCookieStore();
      act(() => beginUserChange(view.result.current.client));
      view.unmount();
    }
  },
);

it("cancels a save retired during CSRF initialization without changing the authentication version", async () => {
  const stored = token();
  setAuthTokens(stored);
  document.cookie = "csrftoken=; Max-Age=0; path=/";
  const csrf = gate();
  const entered = gate();
  let patches = 0;
  server.use(
    http.get(`${apiBaseUrl}/csrf/`, async () => {
      entered.release();
      await csrf.wait;
      document.cookie = "csrftoken=save-owner-test; path=/";
      return HttpResponse.json({});
    }),
    http.patch(`${apiBaseUrl}/user-movie-data/1`, () => {
      patches++;
      return HttpResponse.json(createMockUserMovieData());
    }),
  );
  const view = mountSave();
  try {
    await waitFor(() => expect(view.result.current.library).toBe(1));
    act(() => view.result.current.save({ user_on_watchlist: true }));
    await entered.wait;
    const running = view.result.current.client.getMutationCache().getAll()[0];
    const version = getAuthSessionVersion();
    await act(async () => changeOfUser(view.result.current.client));
    await act(async () => csrf.release());
    await waitFor(() => expect(running?.state.status).not.toBe("pending"));
    expect(patches).toBe(0);
    expect(isCancel(running?.state.error)).toBe(true);
    expect(getAuthSessionVersion()).toBe(version);
    expect(localStorage.getItem("access_token")).toBe(stored);
    expect(window.location.href).toBe("http://localhost:3000/browse");
    expect(view.libraries).toBe(2);
    expect(screen.queryByText("Added to watchlist")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Failed to update watchlist"),
    ).not.toBeInTheDocument();
  } finally {
    csrf.release();
    act(() => beginUserChange(view.result.current.client));
    view.unmount();
  }
});

it.each([
  ["expired request", 200],
  ["expired request", 401],
  ["expired request", 500],
  ["401 response", 200],
  ["401 response", 401],
  ["401 response", 500],
] as const)(
  "retires a save through shared renewal without taking another caller's transport (%s, %s)",
  async (path, status) => {
    setAuthTokens(token());
    const renewal = gate();
    const entered = gate();
    const fresh = token(Math.floor(Date.now() / 1000) + 900);
    let patches = 0;
    let renewals = 0;
    server.use(
      http.patch(`${apiBaseUrl}/user-movie-data/1`, ({ request }) => {
        patches++;
        return request.headers.get("Authorization") === `Bearer ${fresh}`
          ? HttpResponse.json(
              createMockUserMovieData({ user_on_watchlist: true }),
            )
          : HttpResponse.json({ detail: "Unauthorized" }, { status: 401 });
      }),
      http.get(`${apiBaseUrl}/live-renewal`, ({ request }) =>
        request.headers.get("Authorization") === `Bearer ${fresh}`
          ? HttpResponse.json({ current: true })
          : HttpResponse.json({ detail: "Unauthorized" }, { status: 401 }),
      ),
      http.post(`${apiBaseUrl}/auth/refresh`, async () => {
        renewals++;
        entered.release();
        await renewal.wait;
        return status === 200
          ? HttpResponse.json({ access_token: fresh })
          : HttpResponse.json({ detail: "Renewal refused" }, { status });
      }),
    );
    const view = mountSave();
    try {
      await waitFor(() => expect(view.result.current.library).toBe(1));
      const stored = path === "expired request" ? token(1) : token();
      setAuthTokens(stored);
      act(() => view.result.current.save({ user_on_watchlist: true }));
      const running = view.result.current.client.getMutationCache().getAll()[0];
      await entered.wait;
      const live =
        status === 200
          ? Promise.allSettled([apiClient.get("/live-renewal")])
          : undefined;
      if (live)
        await act(
          async () => new Promise((resolve) => setTimeout(resolve, 20)),
        );
      const version = getAuthSessionVersion();
      act(() => beginUserChange(view.result.current.client));
      await act(async () => {
        renewal.release();
        if (live)
          expect(await live).toMatchObject([
            { status: "fulfilled", value: { data: { current: true } } },
          ]);
      });
      await waitFor(() => expect(running?.state.status).not.toBe("pending"));
      expect(patches).toBe(path === "expired request" ? 0 : 1);
      expect(isCancel(running?.state.error)).toBe(true);
      expect(renewals).toBe(1);
      expect(localStorage.getItem("access_token")).toBe(
        status === 200 ? fresh : stored,
      );
      expect(getAuthSessionVersion()).toBe(version);
      expect(window.location.href).toBe("http://localhost:3000/browse");
      expect(view.libraries).toBe(1);
      expect(screen.queryByText("Added to watchlist")).not.toBeInTheDocument();
      expect(
        screen.queryByText("Failed to update watchlist"),
      ).not.toBeInTheDocument();
      expect(screen.queryByText("Server error")).not.toBeInTheDocument();
    } finally {
      renewal.release();
      act(() => beginUserChange(view.result.current.client));
      view.unmount();
    }
  },
);

it.each([200, 500])(
  "cancels already-sent save transport and suppresses obsolete settlement (%s)",
  async (status) => {
    setAuthTokens(token());
    const response = gate();
    const entered = gate();
    const finished = gate();
    let received: Request | undefined;
    let patches = 0;
    server.use(
      http.patch(`${apiBaseUrl}/user-movie-data/1`, async ({ request }) => {
        patches++;
        received = request;
        entered.release();
        await response.wait;
        finished.release();
        return status === 200
          ? HttpResponse.json(
              createMockUserMovieData({ user_on_watchlist: true }),
            )
          : HttpResponse.json({ detail: "Save failed" }, { status });
      }),
    );
    const view = mountSave();
    try {
      await waitFor(() => expect(view.result.current.library).toBe(1));
      act(() => view.result.current.save({ user_on_watchlist: true }));
      const running = view.result.current.client.getMutationCache().getAll()[0];
      await entered.wait;
      await act(async () => changeOfUser(view.result.current.client));
      await waitFor(() => expect(received?.signal.aborted).toBe(true));
      await act(async () => {
        response.release();
        await finished.wait;
      });
      await waitFor(() => expect(running?.state.status).not.toBe("pending"));
      expect(isCancel(running?.state.error)).toBe(true);
      expect(patches).toBe(1);
      expect(view.result.current.state.user_on_watchlist).toBe(false);
      expect(view.libraries).toBe(2);
      expect(window.location.href).toBe("http://localhost:3000/browse");
      expect(screen.queryByText("Added to watchlist")).not.toBeInTheDocument();
      expect(
        screen.queryByText("Failed to update watchlist"),
      ).not.toBeInTheDocument();
      expect(screen.queryByText("Server error")).not.toBeInTheDocument();
    } finally {
      response.release();
      act(() => beginUserChange(view.result.current.client));
      view.unmount();
    }
  },
);

it.each(["provider", "password"] as const)(
  "rejects a retired save before preparation can acquire replacement %s credentials",
  async (kind) => {
    setAuthTokens(token());
    const requests: Array<string | null> = [];
    server.use(
      http.patch(`${apiBaseUrl}/user-movie-data/1`, ({ request }) => {
        requests.push(request.headers.get("Authorization"));
        return HttpResponse.json(
          createMockUserMovieData({ user_on_watchlist: true }),
        );
      }),
    );
    const view = mountSave();
    await waitFor(() => expect(view.result.current.library).toBe(1));
    const replacement = token(Math.floor(Date.now() / 1000) + 900);
    let changed = false;
    const unsubscribe = view.result.current.client
      .getMutationCache()
      .subscribe((event) => {
        if (
          changed ||
          event.type !== "updated" ||
          event.action.type !== "pending" ||
          event.mutation.state.context === undefined
        )
          return;
        changed = true;
        // TanStack publishes onMutate's result just before calling mutationFn. This
        // replacement runs after its synchronous guard, ahead of Axios preparation.
        queueMicrotask(() => {
          invalidateAuthSession();
          clearAuthTokens();
          if (kind === "password") setAuthTokens(replacement);
          void changeOfUser(view.result.current.client);
        });
      });
    try {
      act(() => view.result.current.save({ user_on_watchlist: true }));
      const running = view.result.current.client.getMutationCache().getAll()[0];
      await waitFor(() => expect(running?.state.status).not.toBe("pending"));
      await waitFor(() => expect(view.result.current.library).toBe(2));
      expect(requests).toEqual([]);
      expect(view.result.current.state.user_on_watchlist).toBe(false);
      expect(screen.queryByText("Added to watchlist")).not.toBeInTheDocument();
      expect(
        screen.queryByText("Failed to update watchlist"),
      ).not.toBeInTheDocument();
      expect(view.libraries).toBe(2);
      expect(window.location.href).toBe("http://localhost:3000/browse");
      expect(localStorage.getItem("access_token")).toBe(
        kind === "password" ? replacement : null,
      );
    } finally {
      unsubscribe();
      act(() => beginUserChange(view.result.current.client));
      view.unmount();
    }
  },
);
