import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HttpResponse, http } from "msw";
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

import apiClient from "@/services/apiClient";
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
            refresh_token: "refresh",
            username: profile.username,
          }),
        ),
      );
      const { result } = mountAuth();
      await act(async () => {
        expect(
          await result.current.login("viewer", "password", rememberMe),
        ).toEqual({ success: true, data: { displayName: profile.username } });
      });
      expect(result.current.isAuthenticated).toBe(true);
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
      setAuthTokens(token(1), undefined, storage);
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
            refresh_token: "refresh",
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
    setAuthTokens(token(1), undefined, "sessionStorage");
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
