import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HttpResponse, http } from "msw/http";
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

function AuthStatusProbe() {
  const { isAuthenticated, user } = useAuth();
  return (
    <div role="status">
      {isAuthenticated ? (user?.username ?? "Loading") : "Signed out"}
    </div>
  );
}

function mountAuth() {
  return renderHook(() => useAuth(), { wrapper: MemoryRouter });
}

beforeEach(() => {
  clearBrowserAuth();
  authHandlers();
});
afterEach(() => {
  vi.useRealTimers();
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
      { wrapper: MemoryRouter },
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
        <MemoryRouter initialEntries={[entry]}>{children}</MemoryRouter>
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
      server.use(
        http.post(`${apiBaseUrl}/token/`, () =>
          HttpResponse.json({
            user_id: profile.id,
            access_token: access,
            username: profile.username,
          }),
        ),
      );
      localStorage.setItem("refresh_token", "legacy-local");
      sessionStorage.setItem("refresh_token", "legacy-session");
      const { result } = mountAuth();
      await act(async () => {
        expect(
          await result.current.login("viewer", "password", rememberMe),
        ).toEqual({ success: true, data: { displayName: profile.username } });
      });
      expect(result.current.isAuthenticated).toBe(true);
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
      <MemoryRouter>
        <AuthStatusProbe />
      </MemoryRouter>,
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
      expect(result.current.isAuthenticated).toBe(success);
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

  it("shares a refresh between the loading hook and an API 401", async () => {
    const releaseRefresh = gate();
    const responseSeen = gate();
    const refreshed = token();
    setAuthTokens(token(1));
    let refreshes = 0;
    server.use(
      http.post(`${apiBaseUrl}/auth/refresh`, async () => {
        refreshes++;
        await releaseRefresh.wait;
        return HttpResponse.json({ access_token: refreshed });
      }),
      http.get(`${apiBaseUrl}/shared-refresh`, ({ request }) => {
        if (request.headers.get("Authorization") === `Bearer ${refreshed}`)
          return HttpResponse.json({ ok: true });
        responseSeen.release();
        return HttpResponse.json({}, { status: 401 });
      }),
    );
    mountAuth();
    const pending = apiClient.get("/shared-refresh");
    try {
      await responseSeen.wait;
      await waitFor(() => expect(refreshes).toBe(1));
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
      });
      expect(refreshes).toBe(1);
    } finally {
      await act(async () => {
        releaseRefresh.release();
        await pending;
      });
    }
    expect((await pending).data).toEqual({ ok: true });
    expect(refreshes).toBe(1);
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
      expect(result.current.isAuthenticated).toBe(signInAgain);
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
    (["load", "profile", "interceptor"] as const).flatMap((caller) =>
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
      const newToken = token(Math.floor(Date.now() / 1000) + 900);
      server.use(
        http.post(`${apiBaseUrl}/auth/refresh`, async () => {
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
        http.get(`${apiBaseUrl}/renewal-overlap`, () =>
          HttpResponse.json({}, { status: 401 }),
        ),
      );
      if (caller === "load") setAuthTokens(token(1));
      if (caller === "interceptor") setAuthTokens(token());
      const { result } = mountAuth();
      let pending: Promise<unknown> | undefined;
      if (caller === "profile") {
        await waitFor(() => expect(result.current.status).toBe("anonymous"));
        act(() => {
          pending = result.current.login("viewer", "password");
        });
      } else if (caller === "interceptor") {
        await waitFor(() => expect(result.current.user).toEqual(profile));
        pending = apiClient.get("/renewal-overlap").catch(() => undefined);
      }
      await entered.wait;
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
      expect(result.current.isAuthenticated).toBe(signInAgain);
      expect(result.current.user).toEqual(signInAgain ? profile : null);
      expect(sessionStorage.getItem("access_token")).toBe(
        signInAgain ? newToken : null,
      );
      expect(localStorage.getItem("access_token")).toBeNull();
    },
  );
});
