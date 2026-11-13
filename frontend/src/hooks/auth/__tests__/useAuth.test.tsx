import { useEffect } from "react";
import { useQueryClient, useIsFetching, useQuery } from "@tanstack/react-query";
import { useUserMovieState } from "@/hooks/movie/useUserMovieState";
import { createMockUserMovieData } from "@tests/mocks/movieData";
import { sessionQuery } from "@/lib/queries";
import AuthContextProvider from "@/components/auth/AuthContextProvider";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import useAuthContext from "@/hooks/auth/useAuthContext";
import Login from "@/pages/user/Login";
import userEvent from "@testing-library/user-event";
import {
  Toaster,
  PriorityToaster,
  toaster,
  priorityToaster,
} from "@/components/core/chakra/toaster";
import type { ReactNode } from "react";
import { TestProviders } from "@tests/helpers/test-providers";
import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  MemoryRouter,
  useLocation,
  useNavigate,
  Routes,
  Route,
} from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HttpResponse, http } from "msw/http";
import { isCancel } from "axios";
import { useAuth } from "../useAuth";
import { apiBaseUrl, siteOrigin } from "@/config/baseUrls";
import { setAuthTokens } from "@/utilities/tokenUtils";
import { server } from "@tests/mocks/server";
import {
  authHandlers,
  clearBrowserAuth,
  profile,
  token,
} from "@tests/helpers/auth";

import apiClient, { refreshAccessToken } from "@/services/apiClient";
import { gate, installWebLocks } from "@tests/helpers/web-locks";

function AuthTestProviders({ children }: { children: ReactNode }) {
  return (
    <TestProviders>
      <MemoryRouter>{children}</MemoryRouter>
    </TestProviders>
  );
}

function AuthStatusProbe() {
  const { isAuthenticated, user } = useAuth();
  return (
    <div role="status">
      {isAuthenticated ? (user?.username ?? "Loading") : "Signed out"}
    </div>
  );
}

function mountAuth() {
  return renderHook(() => useAuth(), { wrapper: AuthTestProviders });
}

beforeEach(() => {
  clearBrowserAuth();
  authHandlers();
  act(() => {
    toaster.remove();
    priorityToaster.remove();
  });
});
afterEach(() => {
  vi.useRealTimers();
  act(() => {
    toaster.remove();
    priorityToaster.remove();
  });
});

describe("initial authentication", () => {
  it("starts signed in with current stored tokens and loads the profile", async () => {
    setAuthTokens(token());
    const { result } = mountAuth();
    expect(result.current.isAuthenticated).toBe(true);
    await waitFor(() => expect(result.current.user).toEqual(profile));
  });
  it("ignores a lone access cookie and detects the provider session", async () => {
    document.cookie = `access_token=${token()}; Path=/`;
    const provider = { ...profile, username: "provider-user" };
    server.use(
      http.get(`${siteOrigin}/_allauth/browser/v1/auth/session`, () =>
        HttpResponse.json({
          meta: { is_authenticated: true },
          data: { user: provider },
        }),
      ),
    );
    const { result } = mountAuth();
    await waitFor(() => expect(result.current.user).toEqual(provider));
    expect(result.current.isAuthenticated).toBe(true);
    expect(localStorage.getItem("access_token")).toBeNull();
    expect(sessionStorage.getItem("access_token")).toBeNull();
  });
  it("starts signed out without tokens or an OAuth session", () => {
    const { result } = mountAuth();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });
  it("leaves an expired token signed out when refresh is unavailable", async () => {
    setAuthTokens(token(Math.floor(Date.now() / 1000) - 300));
    const { result } = mountAuth();
    await waitFor(() =>
      expect(localStorage.getItem("access_token")).toBeNull(),
    );
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });
  it.each(["google", "github"])("detects an existing %s session", async () => {
    server.use(
      http.get(`${siteOrigin}/_allauth/browser/v1/auth/session`, () =>
        HttpResponse.json({
          meta: { is_authenticated: true },
          data: { user: profile },
        }),
      ),
    );
    const { result } = mountAuth();
    await waitFor(() => expect(result.current.user).toEqual(profile));
    expect(result.current.isAuthenticated).toBe(true);
  });
});

describe("sign-in status", () => {
  const sessionUrl = `${siteOrigin}/_allauth/browser/v1/auth/session`;
  const signedOutSession = () =>
    HttpResponse.json({ status: 401 }, { status: 401 });
  const providerSession = () =>
    HttpResponse.json({
      meta: { is_authenticated: true },
      data: { user: profile },
    });

  function holdSession(respond: () => Response) {
    const held = gate();
    server.use(
      http.get(sessionUrl, async () => {
        await held.wait;
        return respond();
      }),
    );
    return held;
  }

  function mountRecordingStatus() {
    const seen: string[] = [];
    const view = renderHook(
      () => {
        const auth = useAuth();
        seen.push(auth.status);
        return auth;
      },
      { wrapper: AuthTestProviders },
    );
    return { ...view, seen };
  }

  async function settle() {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
  }

  it("starts authenticated with a current stored token", () => {
    setAuthTokens(token());
    const { result } = mountAuth();
    expect(result.current.status).toBe("authenticated");
  });

  it("resolves while the session check is pending, then reads anonymous", async () => {
    const held = holdSession(signedOutSession);
    const { result } = mountAuth();
    expect(result.current.status).toBe("resolving");
    expect(result.current.isAuthenticated).toBe(false);
    await settle();
    expect(result.current.status).toBe("resolving");
    held.release();
    await waitFor(() => expect(result.current.status).toBe("anonymous"));
  });

  it("goes from resolving to authenticated for a provider session", async () => {
    server.use(http.get(sessionUrl, providerSession));
    const { result, seen } = mountRecordingStatus();
    await waitFor(() => expect(result.current.status).toBe("authenticated"));
    expect(seen[0]).toBe("resolving");
    expect(seen).not.toContain("anonymous");
  });

  it("resolves an expired token through its refresh", async () => {
    installWebLocks();
    document.cookie = "csrftoken=django-csrf; path=/";
    setAuthTokens(token(1));
    server.use(
      http.post(`${apiBaseUrl}/auth/refresh`, () =>
        HttpResponse.json({ access_token: token() }),
      ),
    );
    const { result, seen } = mountRecordingStatus();
    await waitFor(() => expect(result.current.status).toBe("authenticated"));
    expect(seen[0]).toBe("resolving");
    expect(seen).not.toContain("anonymous");
  });

  it("reads anonymous when an expired token cannot be refreshed", async () => {
    setAuthTokens(token(1));
    const { result } = mountAuth();
    expect(result.current.status).toBe("resolving");
    await waitFor(() => expect(result.current.status).toBe("anonymous"));
  });

  it("ends anonymous when sign-out interrupts the session check", async () => {
    const held = holdSession(providerSession);
    server.use(http.delete(sessionUrl, signedOutSession));
    const { result } = mountAuth();
    await act(async () => {
      await result.current.logout();
    });
    held.release();
    await settle();
    expect(result.current.status).toBe("anonymous");
    expect(result.current.user).toBeNull();
  });

  it("keeps a password sign-in made during the session check", async () => {
    const held = holdSession(signedOutSession);
    server.use(
      http.post(`${apiBaseUrl}/token/`, () =>
        HttpResponse.json({
          user_id: profile.id,
          access_token: token(),
          username: profile.username,
        }),
      ),
    );
    const { result } = mountAuth();
    await act(async () => {
      await result.current.login("viewer", "password");
    });
    held.release();
    await settle();
    expect(result.current.status).toBe("authenticated");
  });

  it.each(["profile", "logout"] as const)(
    "reads anonymous after a signed-in session ends by %s",
    async (ending) => {
      setAuthTokens(token());
      if (ending === "profile")
        server.use(
          http.get(`${apiBaseUrl}/profile/`, () =>
            HttpResponse.json({ detail: "Not signed in" }, { status: 403 }),
          ),
        );
      const { result } = mountAuth();
      if (ending === "logout")
        await act(async () => {
          await result.current.logout();
        });
      await waitFor(() => expect(result.current.status).toBe("anonymous"));
    },
  );
});

describe("returning after a provider sign-in", () => {
  const sessionUrl = `${siteOrigin}/_allauth/browser/v1/auth/session`;

  function mountAt(entry: string) {
    return renderHook(() => ({ auth: useAuth(), location: useLocation() }), {
      wrapper: ({ children }) => (
        <TestProviders>
          <MemoryRouter initialEntries={[entry]}>{children}</MemoryRouter>
        </TestProviders>
      ),
    });
  }

  beforeEach(() => {
    sessionStorage.setItem("oauth_in_progress", "google");
  });

  it("returns to the page the visitor asked for", async () => {
    server.use(
      http.get(sessionUrl, () =>
        HttpResponse.json({
          meta: { is_authenticated: true },
          data: { user: profile },
        }),
      ),
    );
    const { result } = mountAt("/login?next=%2Fwatchlist%3Fsort%3Dadded");
    await waitFor(() =>
      expect(
        `${result.current.location.pathname}${result.current.location.search}`,
      ).toBe("/watchlist?sort=added"),
    );
  });

  it("goes home when the requested page is unsafe", async () => {
    server.use(
      http.get(sessionUrl, () =>
        HttpResponse.json({
          meta: { is_authenticated: true },
          data: { user: profile },
        }),
      ),
    );
    const { result } = mountAt("/login?next=%2F%2Fevil.example");
    await waitFor(() => expect(result.current.location.pathname).toBe("/"));
  });

  it("keeps the requested page when the provider reports an error", async () => {
    const { result } = mountAt("/login?next=%2Fwatchlist&error=oauth");
    await waitFor(() =>
      expect(result.current.location.state).toMatchObject({
        oauthError: true,
      }),
    );
    expect(
      `${result.current.location.pathname}${result.current.location.search}`,
    ).toBe("/login?next=%2Fwatchlist");
  });
});

describe("sign-in and sign-out", () => {
  it.each([false, true])(
    "stores password sign-in with remember me %s and fetches the profile",
    async (rememberMe) => {
      const access = token();
      let requestBody: unknown;
      server.use(
        http.post(`${apiBaseUrl}/token/`, async ({ request }) => {
          requestBody = await request.json();
          return HttpResponse.json({
            user_id: profile.id,
            access_token: access,
            username: profile.username,
          });
        }),
      );
      localStorage.setItem("refresh_token", "legacy-local");
      sessionStorage.setItem("refresh_token", "legacy-session");
      const { result } = mountAuth();
      await act(async () => {
        expect(
          await result.current.login("viewer", "password", rememberMe),
        ).toEqual({ success: true, data: { displayName: profile.username } });
      });
      expect(requestBody).toEqual({
        login: "viewer",
        password: "password",
        remember_me: rememberMe,
      });
      await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
      expect(localStorage.getItem("refresh_token")).toBeNull();
      expect(sessionStorage.getItem("refresh_token")).toBeNull();
      expect(result.current.user).toEqual(profile);
      expect(
        (rememberMe ? localStorage : sessionStorage).getItem("access_token"),
      ).toBe(access);
      expect(
        (rememberMe ? sessionStorage : localStorage).getItem("access_token"),
      ).toBeNull();
    },
  );
  it.each(["password", "oauth"])("clears a %s sign-in", async (kind) => {
    if (kind === "password") setAuthTokens(token());
    else
      server.use(
        http.get(`${siteOrigin}/_allauth/browser/v1/auth/session`, () =>
          HttpResponse.json({
            meta: { is_authenticated: true },
            data: { user: profile },
          }),
        ),
      );
    server.use(
      http.delete(`${siteOrigin}/_allauth/browser/v1/auth/session`, () =>
        HttpResponse.json({ status: 401 }, { status: 401 }),
      ),
    );
    const { result } = mountAuth();
    await waitFor(() => expect(result.current.user).toEqual(profile));
    await act(async () => {
      await result.current.logout();
    });
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem("access_token")).toBeNull();
    expect(sessionStorage.getItem("access_token")).toBeNull();
  });
  it("ends an idle sign-in after access expires and refresh is unavailable", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    setAuthTokens(token());
    render(
      <TestProviders>
        <MemoryRouter>
          <AuthStatusProbe />
        </MemoryRouter>
      </TestProviders>,
    );
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(profile.username),
    );
    setAuthTokens(token(1));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60000);
    });
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Signed out"),
    );
    expect(localStorage.getItem("access_token")).toBeNull();
  });
});

it.each([true, false])(
  "ends the OAuth server session using Django's CSRF token (cookie present: %s)",
  async (present) => {
    if (present) document.cookie = "csrftoken=django-csrf; path=/";
    let active = true;
    server.use(
      http.get(`${apiBaseUrl}/csrf/`, () => {
        document.cookie = "csrftoken=django-csrf; path=/";
        return HttpResponse.json({});
      }),
      http.get(`${siteOrigin}/_allauth/browser/v1/auth/session`, () =>
        active
          ? HttpResponse.json({
              meta: { is_authenticated: true },
              data: { user: profile },
            })
          : HttpResponse.json({ status: 401 }, { status: 401 }),
      ),
      http.delete(
        `${siteOrigin}/_allauth/browser/v1/auth/session`,
        ({ request }) => {
          if (request.headers.get("X-CSRFToken") !== "django-csrf")
            return HttpResponse.json({}, { status: 403 });
          active = false;
          return HttpResponse.json({ status: 401 }, { status: 401 });
        },
      ),
    );
    const { result } = mountAuth();
    await waitFor(() => expect(result.current.user).toEqual(profile));
    await act(async () => {
      await result.current.logout();
    });
    expect(
      (await fetch(`${siteOrigin}/_allauth/browser/v1/auth/session`)).status,
    ).toBe(401);
  },
);

describe("password session renewal", () => {
  beforeEach(() => {
    installWebLocks();
    document.cookie = "csrftoken=django-csrf; path=/";
  });

  it.each(["localStorage", "sessionStorage"] as const)(
    "refreshes expired tokens on load in %s",
    async (storage) => {
      const refreshed = token();
      setAuthTokens(token(1), storage);
      let refreshes = 0;
      server.use(
        http.post(`${apiBaseUrl}/auth/refresh`, () => {
          refreshes++;
          return HttpResponse.json({ access_token: refreshed });
        }),
      );
      const { result } = mountAuth();
      await waitFor(() => expect(result.current.user).toEqual(profile));
      expect(result.current.isAuthenticated).toBe(true);
      expect(refreshes).toBe(1);
      expect(window[storage].getItem("access_token")).toBe(refreshed);
      expect(
        window[
          storage === "localStorage" ? "sessionStorage" : "localStorage"
        ].getItem("access_token"),
      ).toBeNull();
    },
  );

  it("clears stored tokens after one failed refresh on load", async () => {
    setAuthTokens(token(1));
    let refreshes = 0;
    server.use(
      http.post(`${apiBaseUrl}/auth/refresh`, () => {
        refreshes++;
        return HttpResponse.json({}, { status: 401 });
      }),
    );
    const { result } = mountAuth();
    await waitFor(() =>
      expect(localStorage.getItem("access_token")).toBeNull(),
    );
    expect(refreshes).toBe(1);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it("renews an idle token at the periodic check", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    setAuthTokens(token());
    const refreshed = token(Math.floor(Date.now() / 1000) + 600);
    let refreshes = 0;
    server.use(
      http.post(`${apiBaseUrl}/auth/refresh`, () => {
        refreshes++;
        return HttpResponse.json({ access_token: refreshed });
      }),
    );
    const { result } = mountAuth();
    await vi.waitFor(async () => {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10);
      });
      expect(result.current.user).toEqual(profile);
    });
    setAuthTokens(token(1));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60000);
      // The clock controls polling; let the real network boundary settle in act.
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    await vi.waitFor(async () => {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10);
      });
      expect(localStorage.getItem("access_token")).toBe(refreshed);
    });
    expect(refreshes).toBe(1);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it.each([true, false])(
    "renews before fetching a profile (refresh succeeds: %s)",
    async (success) => {
      // Sign-in's access token can expire before its profile request starts.
      const expired = token(1);
      const refreshed = token();
      let refreshes = 0;
      let profiles = 0;
      server.use(
        http.post(`${apiBaseUrl}/token/`, () =>
          HttpResponse.json({
            user_id: profile.id,
            access_token: expired,
            username: profile.username,
          }),
        ),
        http.post(`${apiBaseUrl}/auth/refresh`, () => {
          refreshes++;
          return success
            ? HttpResponse.json({ access_token: refreshed })
            : HttpResponse.json({}, { status: 401 });
        }),
        http.get(`${apiBaseUrl}/profile/`, () => {
          profiles++;
          return HttpResponse.json(profile);
        }),
      );
      const { result } = mountAuth();
      await act(async () => {
        await result.current.login("viewer", "password");
      });
      await waitFor(() => expect(refreshes).toBe(1));
      await waitFor(() => expect(result.current.isAuthenticated).toBe(success));
      expect(result.current.user).toEqual(success ? profile : null);
      if (success) expect(profiles).toBeGreaterThan(0);
      else expect(profiles).toBe(0);
      expect(sessionStorage.getItem("access_token")).toBe(
        success ? refreshed : null,
      );
    },
  );

  it("waits for another tab and reuses its newer token", async () => {
    const releaseTab = gate();
    const tabEntered = gate();
    // The application uses one named lock for all access-token renewals.
    const otherTab = navigator.locks.request(
      "cinexplorer-auth-refresh",
      async () => {
        tabEntered.release();
        await releaseTab.wait;
      },
    );
    await tabEntered.wait;
    setAuthTokens(token(1));
    let refreshes = 0;
    let profiles = 0;
    server.use(
      http.post(`${apiBaseUrl}/auth/refresh`, () => {
        refreshes++;
        return HttpResponse.json({ access_token: token() });
      }),
      http.get(`${apiBaseUrl}/profile/`, () => {
        profiles++;
        return HttpResponse.json(profile);
      }),
    );
    const { result } = mountAuth();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(refreshes).toBe(0);
    expect(profiles).toBe(0);
    const renewed = token(Math.floor(Date.now() / 1000) + 600);
    setAuthTokens(renewed);
    releaseTab.release();
    await otherTab;
    await waitFor(() => expect(result.current.user).toEqual(profile));
    expect(localStorage.getItem("access_token")).toBe(renewed);
    expect(result.current.isAuthenticated).toBe(true);
    expect(refreshes).toBe(0);
  });

  it("shares a refresh between the loading hook and an expired-token API request", async () => {
    const releaseRefresh = gate();
    const refreshed = token();
    setAuthTokens(token(1));
    let refreshes = 0;
    let requests = 0;
    server.use(
      http.post(`${apiBaseUrl}/auth/refresh`, async () => {
        refreshes++;
        await releaseRefresh.wait;
        return HttpResponse.json({ access_token: refreshed });
      }),
      http.get(`${apiBaseUrl}/shared-refresh`, ({ request }) => {
        requests++;
        return request.headers.get("Authorization") === `Bearer ${refreshed}`
          ? HttpResponse.json({ ok: true })
          : HttpResponse.json({}, { status: 401 });
      }),
    );
    mountAuth();
    const pending = apiClient.get("/shared-refresh");
    try {
      await waitFor(() => expect(refreshes).toBe(1));
      expect(requests).toBe(0);
    } finally {
      await act(async () => {
        releaseRefresh.release();
        await pending;
      });
    }
    expect((await pending).data).toEqual({ ok: true });
    expect(refreshes).toBe(1);
    expect(requests).toBe(1);
  });

  it.each(["google", "github"])("never refreshes a %s session", async () => {
    let refreshes = 0;
    server.use(
      http.post(`${apiBaseUrl}/auth/refresh`, () => {
        refreshes++;
        return HttpResponse.json({}, { status: 401 });
      }),
      http.get(`${siteOrigin}/_allauth/browser/v1/auth/session`, () =>
        HttpResponse.json({
          meta: { is_authenticated: true },
          data: { user: profile },
        }),
      ),
    );
    const { result } = mountAuth();
    await waitFor(() => expect(result.current.user).toEqual(profile));
    expect(result.current.isAuthenticated).toBe(true);
    expect(refreshes).toBe(0);
  });

  it("renews once in the same storage without Web Locks", async () => {
    Object.defineProperty(navigator, "locks", {
      configurable: true,
      value: undefined,
    });
    setAuthTokens(token(1), "sessionStorage");
    const refreshed = token();
    let refreshes = 0;
    server.use(
      http.post(`${apiBaseUrl}/auth/refresh`, () => {
        refreshes++;
        return HttpResponse.json({ access_token: refreshed });
      }),
    );
    const { result } = mountAuth();
    await waitFor(() => expect(result.current.user).toEqual(profile));
    expect(refreshes).toBe(1);
    expect(result.current.isAuthenticated).toBe(true);
    expect(sessionStorage.getItem("access_token")).toBe(refreshed);
    expect(localStorage.getItem("access_token")).toBeNull();
  });
});

describe("sign-out during idle renewal", () => {
  beforeEach(() => installWebLocks());
  it.each(
    (["localStorage", "sessionStorage"] as const).flatMap((storage) =>
      (["lock", "response"] as const).flatMap((heldAt) =>
        [false, true].map((signInAgain) => ({ storage, heldAt, signInAgain })),
      ),
    ),
  )(
    "keeps sign-out authoritative ($storage, held at $heldAt, sign in again: $signInAgain)",
    async ({ storage, heldAt, signInAgain }) => {
      vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
      setAuthTokens(token(), storage);
      const { result } = mountAuth();
      await vi.waitFor(async () => {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(10);
        });
        expect(result.current.user).toEqual(profile);
      });
      const release = gate();
      const entered = gate();
      let refreshes = 0;
      const staleToken = token(Math.floor(Date.now() / 1000) + 600);
      const newToken = token(Math.floor(Date.now() / 1000) + 900);
      server.use(
        http.post(`${apiBaseUrl}/auth/refresh`, async () => {
          refreshes++;
          entered.release();
          if (heldAt === "response") await release.wait;
          return HttpResponse.json({ access_token: staleToken });
        }),
        http.post(`${apiBaseUrl}/token/`, () =>
          HttpResponse.json({
            user_id: profile.id,
            username: profile.username,
            access_token: newToken,
          }),
        ),
      );
      const otherTab =
        heldAt === "lock"
          ? navigator.locks.request("cinexplorer-auth-refresh", async () => {
              entered.release();
              await release.wait;
            })
          : Promise.resolve();
      if (heldAt === "lock") await entered.wait;
      setAuthTokens(token(1), storage);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(60000);
      });
      if (heldAt === "response") await entered.wait;
      // Observe completion through the same public renewal shared by its callers.
      const renewal = refreshAccessToken().catch(() => undefined);
      try {
        await act(async () => {
          await result.current.logout();
        });
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.user).toBeNull();
        expect(localStorage.getItem("access_token")).toBeNull();
        expect(sessionStorage.getItem("access_token")).toBeNull();
        if (signInAgain) {
          await act(async () => {
            await result.current.login(
              "viewer",
              "password",
              storage === "localStorage",
            );
          });
        }
      } finally {
        await act(async () => {
          release.release();
          await otherTab;
          await renewal;
        });
      }
      await vi.waitFor(async () => {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(10);
        });
        expect(result.current.isAuthenticated).toBe(signInAgain);
      });
      expect(result.current.user).toEqual(signInAgain ? profile : null);
      expect(window[storage].getItem("access_token")).toBe(
        signInAgain ? newToken : null,
      );
      expect(
        window[
          storage === "localStorage" ? "sessionStorage" : "localStorage"
        ].getItem("access_token"),
      ).toBeNull();
      expect(refreshes).toBe(heldAt === "response" ? 1 : 0);
    },
  );
});

describe("obsolete renewal callers", () => {
  beforeEach(() => installWebLocks());
  it.each(
    (["load", "profile", "interceptor", "request"] as const).flatMap((caller) =>
      [
        { refreshSucceeds: true, signInAgain: false },
        { refreshSucceeds: true, signInAgain: true },
        { refreshSucceeds: false, signInAgain: true },
      ].map((outcome) => ({ caller, ...outcome })),
    ),
  )(
    "ignores old $caller completion (refresh succeeds: $refreshSucceeds, sign in again: $signInAgain)",
    async ({ caller, refreshSucceeds, signInAgain }) => {
      installWebLocks();
      const release = gate();
      const entered = gate();
      let logins = 0;
      let refreshes = 0;
      let publicRequests = 0;
      const newToken = token(Math.floor(Date.now() / 1000) + 900);
      server.use(
        http.post(`${apiBaseUrl}/auth/refresh`, async () => {
          refreshes++;
          entered.release();
          await release.wait;
          return refreshSucceeds
            ? HttpResponse.json({ access_token: token() })
            : HttpResponse.json({}, { status: 401 });
        }),
        http.post(`${apiBaseUrl}/token/`, () => {
          logins++;
          return HttpResponse.json({
            user_id: profile.id,
            username: profile.username,
            access_token:
              caller === "profile" && logins === 1 ? token(1) : newToken,
          });
        }),
        http.get(`${apiBaseUrl}/renewal-overlap`, () => {
          publicRequests++;
          return caller === "request"
            ? HttpResponse.json({ accepted: true })
            : HttpResponse.json({}, { status: 401 });
        }),
      );
      if (caller === "load") setAuthTokens(token(1));
      if (caller === "interceptor" || caller === "request")
        setAuthTokens(token());
      const { result } = mountAuth();
      let pending: Promise<unknown> | undefined;
      if (caller === "profile") {
        await waitFor(() => expect(result.current.status).toBe("anonymous"));
        act(() => {
          pending = result.current.login("viewer", "password");
        });
      } else if (caller === "interceptor" || caller === "request") {
        await waitFor(() => expect(result.current.user).toEqual(profile));
        if (caller === "request") setAuthTokens(token(1));
        pending = apiClient.get("/renewal-overlap").catch(() => undefined);
      }
      if (caller === "request") {
        await waitFor(() => expect(refreshes).toBe(1));
      } else {
        await entered.wait;
      }
      const renewal = refreshAccessToken().catch(() => undefined);
      try {
        await act(async () => {
          await result.current.logout();
        });
        if (signInAgain) {
          await act(async () => {
            await result.current.login("viewer", "password");
          });
        }
      } finally {
        await act(async () => {
          release.release();
          await renewal;
          await pending;
        });
      }
      if (caller === "request") expect(publicRequests).toBe(0);
      await waitFor(() =>
        expect(result.current.isAuthenticated).toBe(signInAgain),
      );
      expect(result.current.user).toEqual(signInAgain ? profile : null);
      expect(sessionStorage.getItem("access_token")).toBe(
        signInAgain ? newToken : null,
      );
      expect(localStorage.getItem("access_token")).toBeNull();
    },
  );
});

describe("password sign-in completion", () => {
  it("waits for the fresh profile and commits it to the session cache", async () => {
    const entered = gate();
    const release = gate();
    server.use(
      http.post(`${apiBaseUrl}/token/`, () =>
        HttpResponse.json({
          user_id: profile.id,
          username: profile.username,
          access_token: token(),
        }),
      ),
      http.get(`${apiBaseUrl}/profile/`, async () => {
        entered.release();
        await release.wait;
        return HttpResponse.json(profile);
      }),
    );
    const { result } = renderHook(
      () => ({ auth: useAuth(), client: useQueryClient() }),
      { wrapper: AuthTestProviders },
    );
    await waitFor(() => expect(result.current.auth.status).toBe("anonymous"));
    let settled = false;
    let pending: ReturnType<typeof result.current.auth.login> | undefined;
    act(() => {
      pending = result.current.auth
        .login("viewer", "password")
        .then((response) => {
          settled = true;
          return response;
        });
    });
    await entered.wait;
    expect(settled).toBe(false);
    await act(async () => {
      release.release();
      await pending;
    });
    expect(result.current.client.getQueryData(sessionQuery().queryKey)).toEqual(
      profile,
    );
    await waitFor(() => expect(result.current.auth.user).toEqual(profile));
  });

  it("opens the protected destination without bouncing back to sign-in", async () => {
    const entered = gate();
    const release = gate();
    const locations: string[] = [];
    function LocationAndStatus() {
      const location = useLocation();
      const status = useAuthContext()?.status;
      useEffect(() => {
        locations.push(location.pathname + location.search);
      }, [location.pathname, location.search]);
      const reads = useIsFetching({ queryKey: sessionQuery().queryKey });
      return (
        <>
          <output aria-label="Session status">{status}</output>
          <output aria-label="Session reads">{reads}</output>
        </>
      );
    }
    server.use(
      http.post(`${apiBaseUrl}/token/`, () =>
        HttpResponse.json({
          user_id: profile.id,
          username: profile.username,
          access_token: token(),
        }),
      ),
      http.get(`${apiBaseUrl}/profile/`, async () => {
        entered.release();
        await release.wait;
        return HttpResponse.json(profile);
      }),
    );
    const user = userEvent.setup();
    render(
      <TestProviders>
        <MemoryRouter initialEntries={["/login?next=%2Fprivate"]}>
          <AuthContextProvider>
            <LocationAndStatus />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/private" element={<h1>Protected film list</h1>} />
              </Route>
            </Routes>
            <Toaster />
            <PriorityToaster />
          </AuthContextProvider>
        </MemoryRouter>
      </TestProviders>,
    );
    await waitFor(() =>
      expect(screen.getByLabelText("Session status")).toHaveTextContent(
        "anonymous",
      ),
    );
    await user.type(
      screen.getByRole("textbox", { name: "Username or Email Address" }),
      "viewer",
    );
    await user.type(
      screen.getByLabelText("Password", { exact: true }),
      "password",
    );
    await user.click(screen.getByRole("button", { name: "Login" }));
    await entered.wait;
    await waitFor(() =>
      expect(screen.getByLabelText("Session reads")).toHaveTextContent("1"),
    );
    expect(locations).toEqual(["/login?next=%2Fprivate"]);
    await act(async () => release.release());
    await screen.findByRole("heading", { name: "Protected film list" });
    expect(locations).toEqual(["/login?next=%2Fprivate", "/private"]);
  });
});

describe("the first session read on a provider return", () => {
  const sessionUrl = `${siteOrigin}/_allauth/browser/v1/auth/session`;
  const provider = {
    ...profile,
    id: 88,
    username: "provider",
    first_name: "Provider",
  };
  function mountReturn(entry = "/login?next=%2Fwatchlist%3Fsort%3Dadded") {
    return renderHook(
      () => ({
        auth: useAuth(),
        location: useLocation(),
        navigate: useNavigate(),
      }),
      {
        wrapper: ({ children }) => (
          <TestProviders>
            <MemoryRouter initialEntries={[entry]}>
              {children}
              <PriorityToaster />
            </MemoryRouter>
          </TestProviders>
        ),
      },
    );
  }
  beforeEach(() => {
    sessionStorage.setItem("oauth_in_progress", "google");
    sessionStorage.setItem("oauth_start_time", String(Date.now()));
  });
  it.each(["expired", "current"])(
    "lands the provider over a %s password token, once",
    async (age) => {
      setAuthTokens(
        token(age === "expired" ? 1 : Math.floor(Date.now() / 1000) + 300),
      );
      sessionStorage.setItem("access_token", token(1));
      let reads = 0;
      server.use(
        http.get(sessionUrl, () => {
          reads++;
          return HttpResponse.json({
            meta: { is_authenticated: true },
            data: { user: provider },
          });
        }),
        http.post(`${apiBaseUrl}/auth/refresh`, () =>
          HttpResponse.json({ access_token: token() }),
        ),
      );
      const { result } = mountReturn();
      await waitFor(() => expect(result.current.auth.user).toEqual(provider));
      expect(localStorage.getItem("access_token")).toBeNull();
      expect(sessionStorage.getItem("access_token")).toBeNull();
      await waitFor(() =>
        expect(
          result.current.location.pathname + result.current.location.search,
        ).toBe("/watchlist?sort=added"),
      );
      expect(sessionStorage.getItem("oauth_in_progress")).toBeNull();
      expect(sessionStorage.getItem("oauth_start_time")).toBeNull();
      await waitFor(() =>
        expect(screen.getByText("Welcome back, Provider!")).toBeVisible(),
      );
      expect(reads).toBe(1);
    },
  );
  it.each([false, true])(
    "falls through after no provider user, with stored token: %s",
    async (stored) => {
      const renewed = token();
      if (stored) setAuthTokens(token(1));
      let reads = 0;
      server.use(
        http.get(sessionUrl, () => {
          reads++;
          return HttpResponse.json({ status: 401 }, { status: 401 });
        }),
        http.post(`${apiBaseUrl}/auth/refresh`, () =>
          HttpResponse.json({ access_token: renewed }),
        ),
      );
      const { result } = mountReturn();
      await waitFor(() =>
        expect(result.current.auth.status).toBe(
          stored ? "authenticated" : "anonymous",
        ),
      );
      expect(result.current.auth.user).toEqual(stored ? profile : null);
      await waitFor(() =>
        expect(sessionStorage.getItem("oauth_in_progress")).toBeNull(),
      );
      expect(sessionStorage.getItem("oauth_start_time")).toBeNull();
      expect(reads).toBe(1);
      expect(screen.queryByText(/Welcome back/)).not.toBeInTheDocument();
      if (stored) expect(localStorage.getItem("access_token")).toBe(renewed);
    },
  );
  it("keeps the original destination while a provider read is held across navigation", async () => {
    const release = gate();
    const entered = gate();
    let reads = 0;
    server.use(
      http.get(sessionUrl, async () => {
        reads++;
        entered.release();
        await release.wait;
        return HttpResponse.json({
          meta: { is_authenticated: true },
          data: { user: provider },
        });
      }),
    );
    const { result } = mountReturn();
    await entered.wait;
    await act(async () => result.current.navigate("/browse?next=%2Fwrong"));
    release.release();
    await waitFor(() =>
      expect(
        result.current.location.pathname + result.current.location.search,
      ).toBe("/watchlist?sort=added"),
    );
    await waitFor(() =>
      expect(screen.getByText("Welcome back, Provider!")).toBeVisible(),
    );
    expect(sessionStorage.getItem("oauth_in_progress")).toBeNull();
    expect(sessionStorage.getItem("oauth_start_time")).toBeNull();
    expect(reads).toBe(1);
  });
  it("clears leftover provider flags on a later sign-in page arrival", async () => {
    let reads = 0;
    server.use(
      http.get(sessionUrl, () => {
        reads++;
        return HttpResponse.json({ status: 401 }, { status: 401 });
      }),
    );
    const { result } = mountReturn("/browse");
    await waitFor(() => expect(result.current.auth.status).toBe("anonymous"));
    await act(async () => result.current.navigate("/login"));
    await waitFor(() =>
      expect(sessionStorage.getItem("oauth_in_progress")).toBeNull(),
    );
    expect(sessionStorage.getItem("oauth_start_time")).toBeNull();
    expect(reads).toBe(1);
  });
});

// Observe lists and saves beside the real session hook, with only HTTP held.
function mountUserChange(path = "/browse", saveStatus = 200) {
  const headers: (string | null)[] = [];
  let libraries = 0;
  const saved = gate();
  let patches = 0;
  server.use(
    http.get(`${apiBaseUrl}/ownership-movies`, ({ request }) => {
      headers.push(request.headers.get("Authorization"));
      return HttpResponse.json(headers.length);
    }),
    http.get(`${apiBaseUrl}/ownership-library`, () =>
      HttpResponse.json(++libraries),
    ),
    http.patch(`${apiBaseUrl}/user-movie-data/1`, async () => {
      patches++;
      await saved.wait;
      return HttpResponse.json(
        saveStatus === 200
          ? createMockUserMovieData({ user_on_watchlist: true })
          : { detail: "Save failed" },
        { status: saveStatus },
      );
    }),
  );
  const view = renderHook(
    () => {
      const auth = useAuth();
      const client = useQueryClient();
      const movie = useQuery({
        queryKey: ["movies", "ownership"],
        queryFn: ({ signal }) =>
          apiClient.get("/ownership-movies", { signal }).then((r) => r.data),
      });
      const library = useQuery({
        queryKey: ["library", "ownership"],
        queryFn: ({ signal }) =>
          apiClient.get("/ownership-library", { signal }).then((r) => r.data),
      });
      const save = useUserMovieState(1, null);
      return { auth, client, movie, library, ...save, location: useLocation() };
    },
    {
      wrapper: ({ children }) => (
        <TestProviders>
          <MemoryRouter initialEntries={[path]}>
            {children}
            <Toaster />
            <PriorityToaster />
          </MemoryRouter>
        </TestProviders>
      ),
    },
  );
  return {
    ...view,
    headers,
    saved,
    get libraries() {
      return libraries;
    },
    get patches() {
      return patches;
    },
  };
}
type ChangeView = ReturnType<typeof mountUserChange>;
async function startHeldSave(view: ChangeView) {
  await vi.waitFor(() => expect(view.result.current.library.data).toBe(1));
  act(() => view.result.current.save({ user_on_watchlist: true }));
  await vi.waitFor(() => expect(view.patches).toBe(1));
  expect(view.result.current.state.user_on_watchlist).toBe(true);
  const running = view.result.current.client.getMutationCache().getAll()[0];
  if (!running) throw new Error("The save did not start");
  return running;
}
async function expectRetiredSave(
  view: ChangeView,
  running: Awaited<ReturnType<typeof startHeldSave>>,
) {
  await waitFor(() =>
    expect(view.result.current.state.user_on_watchlist).toBe(false),
  );
  await waitFor(() =>
    expect(view.result.current.library.data).toBeGreaterThan(1),
  );
  const before = view.libraries;
  view.saved.release();
  await waitFor(() => expect(running.state.status).toBe("error"));
  expect(isCancel(running.state.error)).toBe(true);
  expect(view.libraries).toBe(before);
  expect(screen.queryByText("Added to watchlist")).not.toBeInTheDocument();
  expect(
    screen.queryByText("Failed to update watchlist"),
  ).not.toBeInTheDocument();
  expect(screen.queryByText("Server error")).not.toBeInTheDocument();
  expect(view.result.current.state.user_on_watchlist).toBe(false);
}

describe("user ownership changes", () => {
  it.each(
    [false, true].flatMap((renewed) =>
      [200, 500].map((saveStatus) => ({ renewed, saveStatus })),
    ),
  )(
    "retires saves when the initial profile rejects credentials (renewed: $renewed, save: $saveStatus)",
    async ({ renewed, saveStatus }) => {
      installWebLocks();
      const held = gate();
      const current = token();
      setAuthTokens(renewed ? token(1) : current);
      server.use(
        http.post(`${apiBaseUrl}/auth/refresh`, () =>
          HttpResponse.json({ access_token: current }),
        ),
        http.get(`${apiBaseUrl}/profile/`, async () => {
          await held.wait;
          return HttpResponse.json({}, { status: 403 });
        }),
      );
      const view = mountUserChange("/browse", saveStatus);
      const running = await startHeldSave(view);
      held.release();
      await waitFor(() =>
        expect(view.result.current.auth.status).toBe("anonymous"),
      );
      await expectRetiredSave(view, running);
      expect(view.headers).toEqual([`Bearer ${current}`, null]);
    },
  );
});

describe("user ownership changes", () => {
  it("retires saves and refetches with the password token after an overlapping first read", async () => {
    const initial = gate();
    const entered = gate();
    const fresh = token();
    server.use(
      http.get(`${siteOrigin}/_allauth/browser/v1/auth/session`, async () => {
        entered.release();
        await initial.wait;
        return HttpResponse.json({}, { status: 401 });
      }),
      http.post(`${apiBaseUrl}/token/`, () =>
        HttpResponse.json({
          user_id: profile.id,
          username: profile.username,
          access_token: fresh,
        }),
      ),
    );
    const view = mountUserChange();
    const running = await startHeldSave(view);
    await entered.wait;
    await act(async () => {
      await view.result.current.auth.login("viewer", "password");
    });
    await expectRetiredSave(view, running);
    expect(view.headers).toEqual([null, `Bearer ${fresh}`]);
    initial.release();
    await waitFor(() => expect(view.result.current.auth.user).toEqual(profile));
  });

  it("clears saves at password token storage but waits for a failed profile before resetting lists", async () => {
    const held = gate();
    const entered = gate();
    server.use(
      http.post(`${apiBaseUrl}/token/`, () =>
        HttpResponse.json({
          user_id: profile.id,
          username: profile.username,
          access_token: token(),
        }),
      ),
      http.get(`${apiBaseUrl}/profile/`, async () => {
        entered.release();
        await held.wait;
        return HttpResponse.json({}, { status: 403 });
      }),
    );
    const view = mountUserChange();
    const running = await startHeldSave(view);
    let login: ReturnType<typeof view.result.current.auth.login>;
    act(() => {
      login = view.result.current.auth.login("viewer", "password");
    });
    await entered.wait;
    await waitFor(() =>
      expect(view.result.current.state.user_on_watchlist).toBe(false),
    );
    expect(view.headers).toEqual([null]);
    expect(view.libraries).toBe(1);
    await act(async () => {
      held.release();
      await login;
    });
    await expectRetiredSave(view, running);
    expect(view.headers).toEqual([null, null]);
  });

  it("retires saves when the idle renewal fails", async () => {
    installWebLocks();
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    setAuthTokens(token());
    const view = mountUserChange();
    const running = await startHeldSave(view);
    await vi.waitFor(async () => {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10);
      });
      expect(view.result.current.auth.user).toEqual(profile);
    });
    setAuthTokens(token(1));
    view.rerender();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60000);
    });
    // Restore interval polling before checking the settled network and React notifications.
    vi.useRealTimers();
    await waitFor(() =>
      expect(view.result.current.auth.status).toBe("anonymous"),
    );
    await expectRetiredSave(view, running);
    expect(view.headers).toEqual([expect.stringContaining("Bearer "), null]);
  });

  it("retires saves and stale bearer lists on a provider return with one session read", async () => {
    const held = gate();
    let sessions = 0;
    const old = token();
    setAuthTokens(old);
    sessionStorage.setItem("oauth_in_progress", "true");
    server.use(
      http.get(`${siteOrigin}/_allauth/browser/v1/auth/session`, async () => {
        sessions++;
        await held.wait;
        return HttpResponse.json({
          meta: { is_authenticated: true },
          data: { user: profile },
        });
      }),
    );
    const view = mountUserChange("/login");
    const running = await startHeldSave(view);
    held.release();
    await waitFor(() => expect(view.result.current.auth.user).toEqual(profile));
    await expectRetiredSave(view, running);
    expect(view.headers).toEqual([`Bearer ${old}`, null]);
    expect(localStorage.getItem("access_token")).toBeNull();
    expect(sessions).toBe(1);
  });

  it.each(["existing user", "anonymous"])(
    "keeps saves and lists when the initial read lands the same %s",
    async (kind) => {
      const held = gate();
      if (kind === "existing user") setAuthTokens(token());
      server.use(
        http.get(`${apiBaseUrl}/profile/`, async () => {
          await held.wait;
          return HttpResponse.json(profile);
        }),
        http.get(`${siteOrigin}/_allauth/browser/v1/auth/session`, async () => {
          await held.wait;
          return HttpResponse.json({}, { status: 401 });
        }),
      );
      const view = mountUserChange();
      const running = await startHeldSave(view);
      held.release();
      await waitFor(() =>
        expect(view.result.current.auth.status).toBe(
          kind === "existing user" ? "authenticated" : "anonymous",
        ),
      );
      expect(view.headers).toHaveLength(1);
      expect(view.libraries).toBe(1);
      expect(view.result.current.state.user_on_watchlist).toBe(true);
      view.saved.release();
      await waitFor(() => expect(running.state.status).toBe("success"));
      await waitFor(() =>
        expect(screen.getByText("Added to watchlist")).toBeVisible(),
      );
      expect(view.result.current.state.user_on_watchlist).toBe(true);
      await waitFor(() => expect(view.libraries).toBe(2));
    },
  );

  it.each([403, 500])(
    "dismisses an existing save toast on rejected credentials and preserves server errors (%s)",
    async (status) => {
      const held = gate();
      setAuthTokens(token());
      server.use(
        http.get(`${apiBaseUrl}/profile/`, async () => {
          await held.wait;
          return HttpResponse.json({}, { status });
        }),
      );
      const view = mountUserChange();
      const running = await startHeldSave(view);
      view.saved.release();
      await waitFor(() => expect(running.state.status).toBe("success"));
      await waitFor(() =>
        expect(screen.getByText("Added to watchlist")).toBeVisible(),
      );
      held.release();
      await waitFor(() =>
        expect(view.result.current.auth.status).toBe("anonymous"),
      );
      await waitFor(() =>
        expect(
          screen.queryByText("Added to watchlist"),
        ).not.toBeInTheDocument(),
      );
      expect(view.result.current.state.user_on_watchlist).toBe(false);
      expect(view.headers).toEqual([expect.stringContaining("Bearer "), null]);
      if (status === 500)
        await waitFor(() =>
          expect(screen.getByText("Server error")).toBeVisible(),
        );
    },
  );
});

describe("settled sign-out reload", () => {
  it.each(
    (["password", "provider"] as const).flatMap((kind) =>
      [200, 503].flatMap((status) =>
        [200, 500].map((saveStatus) => ({ kind, status, saveStatus })),
      ),
    ),
  )(
    "clears ownership immediately and reloads only after $kind sign-out settles ($status, save: $saveStatus)",
    async ({ kind, status, saveStatus }) => {
      window.location.href = "http://localhost:3000/browse";
      const held = gate();
      const entered = gate();
      const sessionUrl = `${siteOrigin}/_allauth/browser/v1/auth/session`;
      if (kind === "password") setAuthTokens(token());
      else
        server.use(
          http.get(sessionUrl, () =>
            HttpResponse.json({
              meta: { is_authenticated: true },
              data: { user: profile },
            }),
          ),
        );
      const respond = async () => {
        entered.release();
        await held.wait;
        return HttpResponse.json({}, { status });
      };
      server.use(
        kind === "password"
          ? http.post(`${apiBaseUrl}/logout/`, respond)
          : http.delete(sessionUrl, respond),
      );
      const view = mountUserChange("/browse", saveStatus);
      await waitFor(() =>
        expect(view.result.current.auth.user).toEqual(profile),
      );
      const running = await startHeldSave(view);
      let logout: Promise<void>;
      act(() => {
        logout = view.result.current.auth.logout();
      });
      await entered.wait;
      await waitFor(() =>
        expect(view.result.current.auth.status).toBe("anonymous"),
      );
      expect(view.result.current.location.pathname).toBe("/login");
      expect(window.location.href).toBe("http://localhost:3000/browse");
      expect(localStorage.getItem("access_token")).toBeNull();
      expect(sessionStorage.getItem("access_token")).toBeNull();
      await expectRetiredSave(view, running);
      expect(
        screen.queryByText("You've been logged out"),
      ).not.toBeInTheDocument();
      await act(async () => {
        held.release();
        await logout;
      });
      expect(window.location.href).toBe("/login?signed_out=true");
      expect(
        screen.queryByText("You've been logged out"),
      ).not.toBeInTheDocument();
    },
  );

  it.each([200, 503])(
    "keeps a new sign-in's token through an older sign-out reload (%s)",
    async (status) => {
      setAuthTokens(token());
      const held = gate();
      const fresh = token(Math.floor(Date.now() / 1000) + 900);
      server.use(
        http.post(`${apiBaseUrl}/logout/`, async () => {
          await held.wait;
          return HttpResponse.json({}, { status });
        }),
        http.post(`${apiBaseUrl}/token/`, () =>
          HttpResponse.json({
            user_id: profile.id,
            username: profile.username,
            access_token: fresh,
          }),
        ),
      );
      const view = mountUserChange();
      await waitFor(() =>
        expect(view.result.current.auth.user).toEqual(profile),
      );
      let logout: Promise<void>;
      act(() => {
        logout = view.result.current.auth.logout();
      });
      await waitFor(() =>
        expect(view.result.current.auth.status).toBe("anonymous"),
      );
      await act(async () => {
        await view.result.current.auth.login("viewer", "password");
      });
      await act(async () => {
        held.release();
        await logout;
      });
      expect(sessionStorage.getItem("access_token")).toBe(fresh);
      expect(window.location.href).toBe("/login?signed_out=true");
    },
  );
});

it.each([
  ["expired request", 401],
  ["expired request", 500],
  ["401 response", 401],
  ["401 response", 500],
] as const)(
  "keeps provider sign-in and location after an older API renewal fails (%s, %s)",
  async (renewalPath, renewalStatus) => {
    installWebLocks();
    setAuthTokens(token());
    sessionStorage.setItem("oauth_in_progress", "true");
    window.location.href = "http://localhost:3000/browse";
    const provider = gate();
    const providerEntered = gate();
    const renewal = gate();
    const renewalEntered = gate();
    const providerProfile = { ...profile, id: 8, username: "provider" };
    server.use(
      http.get(`${siteOrigin}/_allauth/browser/v1/auth/session`, async () => {
        providerEntered.release();
        await provider.wait;
        return HttpResponse.json({
          meta: { is_authenticated: true },
          data: { user: providerProfile },
        });
      }),
      http.get(`${apiBaseUrl}/profile/`, ({ request }) =>
        request.headers.has("Authorization")
          ? HttpResponse.json({ detail: "Unauthorized" }, { status: 401 })
          : HttpResponse.json(providerProfile),
      ),
      http.post(`${apiBaseUrl}/auth/refresh`, async () => {
        renewalEntered.release();
        await renewal.wait;
        return HttpResponse.json(
          { detail: "Renewal refused" },
          { status: renewalStatus },
        );
      }),
    );
    const view = renderHook(() => useAuth(), {
      wrapper: ({ children }) => (
        <TestProviders>
          <MemoryRouter initialEntries={["/login"]}>{children}</MemoryRouter>
        </TestProviders>
      ),
    });
    try {
      await providerEntered.wait;
      if (renewalPath === "expired request") setAuthTokens(token(1));
      const request = Promise.allSettled([apiClient.get("/profile/")]);
      await renewalEntered.wait;
      await act(async () => {
        provider.release();
      });
      await waitFor(() =>
        expect(view.result.current.user).toEqual(providerProfile),
      );
      await act(async () => {
        renewal.release();
        expect((await request)[0].status).toBe("rejected");
      });
      expect(window.location.href).toBe("http://localhost:3000/browse");
      expect(view.result.current.status).toBe("authenticated");
      expect(view.result.current.user).toEqual(providerProfile);
      expect((await apiClient.get("/profile/")).data).toEqual(providerProfile);
    } finally {
      provider.release();
      renewal.release();
      view.unmount();
    }
  },
);
