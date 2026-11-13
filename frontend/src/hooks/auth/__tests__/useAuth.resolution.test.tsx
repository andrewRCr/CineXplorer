import { act, renderHook, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { http, HttpResponse } from "msw/http";
import { useAuth } from "@/hooks/auth/useAuth";
import { apiBaseUrl, siteOrigin } from "@/config/baseUrls";
import apiClient, {
  invalidateAuthSession,
  refreshAccessToken,
} from "@/services/apiClient";
import { getChangeCount, sessionKey } from "@/lib/session";
import { sessionQuery } from "@/lib/queries";
import { setAuthTokens } from "@/utilities/tokenUtils";
import {
  Toaster,
  PriorityToaster,
  toaster,
  priorityToaster,
} from "@/components/core/chakra/toaster";
import { TestProviders } from "@tests/helpers/test-providers";
import {
  authHandlers,
  clearBrowserAuth,
  profile,
  token,
} from "@tests/helpers/auth";
import { gate, installWebLocks } from "@tests/helpers/web-locks";
import { server } from "@tests/mocks/server";

const sessionUrl = `${siteOrigin}/_allauth/browser/v1/auth/session`;
const providerProfile = { ...profile, id: 8, username: "provider" };

function holdSession(
  respond: () => Response = () =>
    HttpResponse.json({
      meta: { is_authenticated: true },
      data: { user: providerProfile },
    }),
) {
  const held = gate();
  const entered = gate();
  let reads = 0;
  server.use(
    http.get(sessionUrl, async () => {
      reads++;
      entered.release();
      await held.wait;
      return respond();
    }),
  );
  return {
    ...held,
    entered: entered.wait,
    get reads() {
      return reads;
    },
  };
}

function mountResolution(path = "/login") {
  return renderHook(() => ({ ...useAuth(), client: useQueryClient() }), {
    wrapper: ({ children }) => (
      <TestProviders>
        <MemoryRouter initialEntries={[path]}>
          {children}
          <Toaster />
          <PriorityToaster />
        </MemoryRouter>
      </TestProviders>
    ),
  });
}

beforeEach(() => {
  invalidateAuthSession();
  clearBrowserAuth();
  authHandlers();
  installWebLocks();
  document.cookie = "csrftoken=csrf-test-token; path=/";
  sessionStorage.setItem("oauth_in_progress", "true");
  window.location.href = "http://localhost:3000/browse";
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

it.each([401, 500])(
  "keeps provider acceptance after an idle renewal started earlier (%s)",
  async (renewalStatus) => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    setAuthTokens(token());
    const renewal = gate();
    const entered = gate();
    server.use(
      http.post(`${apiBaseUrl}/auth/refresh`, async () => {
        entered.release();
        await renewal.wait;
        return HttpResponse.json(
          { detail: "Unavailable" },
          { status: renewalStatus },
        );
      }),
    );
    const view = mountResolution("/browse");
    let provider: ReturnType<typeof holdSession> | undefined;
    try {
      await vi.waitFor(async () => {
        await act(async () => vi.advanceTimersByTimeAsync(10));
        expect(view.result.current.user).toEqual(profile);
      });
      setAuthTokens(token(1));
      await act(async () => vi.advanceTimersByTimeAsync(60000));
      await entered.wait;
      const pending = refreshAccessToken().catch(() => undefined);
      vi.useRealTimers();
      provider = holdSession();
      const reading = Promise.allSettled([
        view.result.current.client.fetchQuery({
          ...sessionQuery({ providerReturn: true }),
          staleTime: 0,
        }),
      ]);
      await provider.entered;
      await act(async () => {
        provider?.release();
        expect(await reading).toMatchObject([
          { status: "fulfilled", value: providerProfile },
        ]);
        renewal.release();
        await pending;
      });
      await waitFor(() =>
        expect(view.result.current.user).toEqual(providerProfile),
      );
      expect(view.result.current.status).toBe("authenticated");
      expect(window.location.href).toBe("http://localhost:3000/browse");
    } finally {
      provider?.release();
      renewal.release();
      view.unmount();
    }
  },
);

it.each([403, 500])(
  "lands anonymous on a current provider fallback profile failure (%s)",
  async (status) => {
    setAuthTokens(token());
    const provider = holdSession(() =>
      HttpResponse.json({ status: 401 }, { status: 401 }),
    );
    provider.release();
    const fallback = gate();
    const entered = gate();
    server.use(
      http.get(`${apiBaseUrl}/profile/`, async () => {
        entered.release();
        await fallback.wait;
        return HttpResponse.json({ detail: "Profile refused" }, { status });
      }),
    );
    const view = mountResolution();
    try {
      await entered.wait;
      await act(async () => fallback.release());
      await waitFor(() => expect(view.result.current.status).toBe("anonymous"));
      expect(view.result.current.client.getQueryData(sessionKey)).toBeNull();
      expect(localStorage.getItem("access_token")).toBeNull();
      expect(sessionStorage.getItem("access_token")).toBeNull();
      expect(provider.reads).toBe(1);
      expect(window.location.href).toBe("http://localhost:3000/browse");
      if (status === 500)
        await waitFor(() =>
          expect(screen.getByText("Server error")).toBeVisible(),
        );
    } finally {
      fallback.release();
      view.unmount();
    }
  },
);

it("protects held password fallback, then restores ordinary renewal failure handling", async () => {
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
  setAuthTokens(token());
  const provider = holdSession(() =>
    HttpResponse.json({ status: 401 }, { status: 401 }),
  );
  provider.release();
  const fallback = gate();
  const entered = gate();
  let renewals = 0;
  server.use(
    http.get(`${apiBaseUrl}/profile/`, async () => {
      entered.release();
      await fallback.wait;
      return HttpResponse.json(profile);
    }),
    http.post(`${apiBaseUrl}/auth/refresh`, () => {
      renewals++;
      return HttpResponse.json({ detail: "Unavailable" }, { status: 500 });
    }),
  );
  const view = mountResolution();
  try {
    await entered.wait;
    const expired = token(1);
    setAuthTokens(expired);
    await act(async () => vi.advanceTimersByTimeAsync(60000));
    vi.useRealTimers();
    await act(async () => new Promise((resolve) => setTimeout(resolve, 20)));
    expect(renewals).toBe(0);
    await act(async () => {
      await expect(
        apiClient.get("/user-movie-data/movies"),
      ).rejects.toMatchObject({ response: { status: 500 } });
    });
    expect(localStorage.getItem("access_token")).toBe(expired);
    expect(window.location.href).toBe("http://localhost:3000/browse");
    await act(async () => fallback.release());
    await waitFor(() => expect(view.result.current.user).toEqual(profile));
    await act(async () => {
      await expect(
        apiClient.get("/user-movie-data/movies"),
      ).rejects.toMatchObject({ response: { status: 500 } });
    });
    expect(renewals).toBe(2);
    expect(localStorage.getItem("access_token")).toBeNull();
    expect(window.location.href).toContain("session_expired=true");
  } finally {
    fallback.release();
    view.unmount();
  }
});

it("cancels a fallback caller while another caller completes their shared renewal", async () => {
  setAuthTokens(token());
  const provider = holdSession(() =>
    HttpResponse.json({ status: 401 }, { status: 401 }),
  );
  provider.release();
  const renewal = gate();
  const entered = gate();
  const fresh = token(Math.floor(Date.now() / 1000) + 900);
  let renewals = 0;
  server.use(
    http.get(`${apiBaseUrl}/profile/`, () =>
      HttpResponse.json({ detail: "Unauthorized" }, { status: 401 }),
    ),
    http.get(`${apiBaseUrl}/user-movie-data/movies`, ({ request }) =>
      request.headers.get("Authorization") === `Bearer ${fresh}`
        ? HttpResponse.json({
            page: 1,
            total_pages: 0,
            total_results: 0,
            results: [],
          })
        : HttpResponse.json({ detail: "Unauthorized" }, { status: 401 }),
    ),
    http.post(`${apiBaseUrl}/auth/refresh`, async () => {
      renewals++;
      entered.release();
      await renewal.wait;
      return HttpResponse.json({ access_token: fresh });
    }),
  );
  const view = mountResolution();
  try {
    await entered.wait;
    const pending = Promise.allSettled([
      apiClient.get("/user-movie-data/movies"),
    ]);
    await act(async () => new Promise((resolve) => setTimeout(resolve, 20)));
    await act(async () =>
      view.result.current.client.cancelQueries({ queryKey: sessionKey }),
    );
    await act(async () => {
      renewal.release();
      expect(await pending).toMatchObject([
        { status: "fulfilled", value: { data: { results: [] } } },
      ]);
    });
    expect(renewals).toBe(1);
    expect(localStorage.getItem("access_token")).toBe(fresh);
    expect(view.result.current.client.getQueryData(sessionKey)).toBeUndefined();
    expect(window.location.href).toBe("http://localhost:3000/browse");
  } finally {
    renewal.release();
    view.unmount();
  }
});

it("keeps a newer resolution owned when canceled fallback finally settles", async () => {
  const expired = token(1);
  setAuthTokens(expired);
  const firstProvider = holdSession(() =>
    HttpResponse.json({ status: 401 }, { status: 401 }),
  );
  firstProvider.release();
  const renewal = gate();
  const entered = gate();
  let renewals = 0;
  server.use(
    http.post(`${apiBaseUrl}/auth/refresh`, async () => {
      renewals++;
      entered.release();
      await renewal.wait;
      return HttpResponse.json({ detail: "Unavailable" }, { status: 500 });
    }),
  );
  const view = mountResolution();
  let nextProvider: ReturnType<typeof holdSession> | undefined;
  try {
    await entered.wait;
    const oldSettled = refreshAccessToken().catch(() => undefined);
    await act(async () =>
      view.result.current.client.cancelQueries({ queryKey: sessionKey }),
    );
    nextProvider = holdSession();
    const reading = Promise.allSettled([
      view.result.current.client.fetchQuery(
        sessionQuery({ providerReturn: true }),
      ),
    ]);
    await nextProvider.entered;
    await act(async () => {
      renewal.release();
      await oldSettled;
      await new Promise((resolve) => setTimeout(resolve, 20));
      await expect(
        apiClient.get("/user-movie-data/movies"),
      ).rejects.toMatchObject({ response: { status: 500 } });
    });
    expect(renewals).toBe(2);
    expect(localStorage.getItem("access_token")).toBe(expired);
    expect(window.location.href).toBe("http://localhost:3000/browse");
    await act(async () => {
      nextProvider?.release();
      expect(await reading).toMatchObject([
        { status: "fulfilled", value: providerProfile },
      ]);
    });
    await waitFor(() =>
      expect(view.result.current.user).toEqual(providerProfile),
    );
  } finally {
    renewal.release();
    nextProvider?.release();
    view.unmount();
  }
});

it.each([
  ["provider", "login"],
  ["provider", "logout"],
  ["fallback", "login"],
  ["fallback", "logout"],
] as const)(
  "keeps explicit %s resolution superseded by %s",
  async (stage, command) => {
    setAuthTokens(token());
    const held = gate();
    const entered = gate();
    const fresh = token(Math.floor(Date.now() / 1000) + 900);
    let profileReads = 0;
    server.use(
      http.get(sessionUrl, async () => {
        if (stage === "fallback")
          return HttpResponse.json({ status: 401 }, { status: 401 });
        entered.release();
        await held.wait;
        return HttpResponse.json({
          meta: { is_authenticated: true },
          data: { user: providerProfile },
        });
      }),
      http.get(`${apiBaseUrl}/profile/`, async () => {
        profileReads++;
        if (stage === "fallback" && profileReads === 1) {
          entered.release();
          await held.wait;
          return HttpResponse.json({ detail: "Unavailable" }, { status: 500 });
        }
        return HttpResponse.json(profile);
      }),
      http.post(`${apiBaseUrl}/token/`, () =>
        HttpResponse.json({
          user_id: profile.id,
          username: profile.username,
          access_token: fresh,
        }),
      ),
    );
    const view = mountResolution();
    try {
      await entered.wait;
      await act(async () => {
        if (command === "login")
          expect(
            await view.result.current.login("viewer", "password"),
          ).toMatchObject({ success: true });
        else await view.result.current.logout();
      });
      const change = getChangeCount();
      await act(async () => {
        held.release();
        await new Promise((resolve) => setTimeout(resolve, 20));
      });
      expect(getChangeCount()).toBe(change);
      expect(view.result.current.user).toEqual(
        command === "login" ? profile : null,
      );
      expect(sessionStorage.getItem("access_token")).toBe(
        command === "login" ? fresh : null,
      );
      expect(localStorage.getItem("access_token")).toBeNull();
      expect(window.location.href).toBe(
        command === "login"
          ? "http://localhost:3000/browse"
          : "/login?signed_out=true",
      );
      if (command === "login") {
        setAuthTokens(token(1), "sessionStorage");
        await act(async () => {
          await expect(
            apiClient.get("/user-movie-data/movies"),
          ).rejects.toMatchObject({ response: { status: 401 } });
        });
        expect(sessionStorage.getItem("access_token")).toBeNull();
        expect(window.location.href).toContain("session_expired=true");
      }
    } finally {
      held.release();
      view.unmount();
    }
  },
);

it.each([401, 500])(
  "preserves pending provider discovery across an idle expiry check (%s)",
  async (renewalStatus) => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    setAuthTokens(token());
    const provider = holdSession();
    let renewals = 0;
    server.use(
      http.post(`${apiBaseUrl}/auth/refresh`, () => {
        renewals++;
        return HttpResponse.json(
          { detail: "Renewal refused" },
          { status: renewalStatus },
        );
      }),
    );
    const view = mountResolution();
    try {
      await provider.entered;
      expect(view.result.current.status).toBe("authenticated");
      setAuthTokens(token(1));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(60000);
      });
      vi.useRealTimers();
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
      });
      expect(renewals).toBe(0);
      await act(async () => provider.release());
      await waitFor(() =>
        expect(view.result.current.user).toEqual(providerProfile),
      );
      expect(view.result.current.status).toBe("authenticated");
      expect(window.location.href).toBe("http://localhost:3000/browse");
    } finally {
      provider.release();
      view.unmount();
    }
  },
);

it.each([
  ["expired request", "reader first"],
  ["expired request", "API first"],
  ["401 response", "reader first"],
  ["401 response", "API first"],
] as const)(
  "keeps shared rejection subordinate to anonymous fallback (%s, %s)",
  async (path, order) => {
    setAuthTokens(path === "expired request" ? token(1) : token());
    const provider = holdSession(() =>
      HttpResponse.json({ status: 401 }, { status: 401 }),
    );
    const renewal = gate();
    const renewalEntered = gate();
    const refusal = gate();
    const requestEntered = gate();
    let renewals = 0;
    server.use(
      http.get(`${apiBaseUrl}/user-movie-data/movies`, async () => {
        requestEntered.release();
        await refusal.wait;
        return HttpResponse.json({ detail: "Unauthorized" }, { status: 401 });
      }),
      http.post(`${apiBaseUrl}/auth/refresh`, async () => {
        renewals++;
        renewalEntered.release();
        await renewal.wait;
        return HttpResponse.json(
          { detail: "Renewal refused" },
          { status: 500 },
        );
      }),
    );
    const view = mountResolution();
    const startRequest = () =>
      Promise.allSettled([apiClient.get<unknown>("/user-movie-data/movies")]);
    let pending = Promise.resolve<PromiseSettledResult<unknown>[]>([]);
    try {
      await provider.entered;
      const reading = Promise.allSettled([
        view.result.current.client.fetchQuery(
          sessionQuery({ providerReturn: true }),
        ),
      ]);
      if (path === "401 response") {
        pending = startRequest();
        await requestEntered.wait;
        setAuthTokens(token(1));
      }
      if (order === "reader first") {
        provider.release();
        await renewalEntered.wait;
        if (path === "expired request") pending = startRequest();
        else refusal.release();
      } else {
        if (path === "expired request") pending = startRequest();
        else refusal.release();
        await renewalEntered.wait;
        provider.release();
      }
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
      });
      await act(async () => {
        renewal.release();
        expect(await reading).toMatchObject([
          { status: "fulfilled", value: null },
        ]);
        expect(await pending).toMatchObject([
          { status: "rejected", reason: { response: { status: 500 } } },
        ]);
      });
      await waitFor(() => expect(view.result.current.status).toBe("anonymous"));
      expect(localStorage.getItem("access_token")).toBeNull();
      expect(sessionStorage.getItem("access_token")).toBeNull();
      expect(renewals).toBe(1);
      expect(window.location.href).toBe("http://localhost:3000/browse");
    } finally {
      provider.release();
      refusal.release();
      renewal.release();
      view.unmount();
    }
  },
);

it("cancels provider discovery without letting its late response change the password session", async () => {
  const stored = token();
  setAuthTokens(stored);
  const provider = holdSession();
  const view = mountResolution();
  try {
    await provider.entered;
    await act(async () =>
      view.result.current.client.cancelQueries({ queryKey: sessionKey }),
    );
    await act(async () => {
      provider.release();
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(localStorage.getItem("access_token")).toBe(stored);
    expect(view.result.current.client.getQueryData(sessionKey)).toBeUndefined();
    expect(window.location.href).toBe("http://localhost:3000/browse");
  } finally {
    provider.release();
    view.unmount();
  }
});

it.each([401, 500])(
  "keeps canceled fallback recovery from clearing credentials or redirecting (%s)",
  async (renewalStatus) => {
    const stored = token();
    setAuthTokens(stored);
    const provider = holdSession(() =>
      HttpResponse.json({ status: 401 }, { status: 401 }),
    );
    provider.release();
    const renewal = gate();
    const entered = gate();
    server.use(
      http.get(`${apiBaseUrl}/profile/`, () =>
        HttpResponse.json({ detail: "Unauthorized" }, { status: 401 }),
      ),
      http.post(`${apiBaseUrl}/auth/refresh`, async () => {
        entered.release();
        await renewal.wait;
        return HttpResponse.json(
          { detail: "Renewal refused" },
          { status: renewalStatus },
        );
      }),
    );
    const view = mountResolution();
    try {
      await entered.wait;
      const settled = refreshAccessToken().catch(() => undefined);
      await act(async () =>
        view.result.current.client.cancelQueries({ queryKey: sessionKey }),
      );
      await act(async () => {
        renewal.release();
        await settled;
        await new Promise((resolve) => setTimeout(resolve, 20));
      });
      expect(localStorage.getItem("access_token")).toBe(stored);
      expect(window.location.href).toBe("http://localhost:3000/browse");
      expect(
        view.result.current.client.getQueryData(sessionKey),
      ).toBeUndefined();
      setAuthTokens(token(1));
      await act(async () => {
        await expect(
          apiClient.get("/user-movie-data/movies"),
        ).rejects.toMatchObject({ response: { status: renewalStatus } });
      });
      expect(localStorage.getItem("access_token")).toBeNull();
      expect(window.location.href).toContain("session_expired=true");
    } finally {
      renewal.release();
      view.unmount();
    }
  },
);

it.each(["expired request", "401 response"])(
  "rejects a refused renewal without taking a later available success (%s)",
  async (path) => {
    setAuthTokens(token());
    const provider = holdSession();
    let renewals = 0;
    let profileReads = 0;
    server.use(
      http.get(`${apiBaseUrl}/profile/`, () => {
        profileReads++;
        return profileReads === 1
          ? HttpResponse.json({ detail: "Unauthorized" }, { status: 401 })
          : HttpResponse.json(profile);
      }),
      http.post(`${apiBaseUrl}/auth/refresh`, () => {
        renewals++;
        return renewals === 1
          ? HttpResponse.json({ detail: "Renewal refused" }, { status: 401 })
          : HttpResponse.json({ access_token: token() });
      }),
    );
    const view = mountResolution();
    try {
      await provider.entered;
      if (path === "expired request") setAuthTokens(token(1));
      await expect(apiClient.get("/profile/")).rejects.toMatchObject({
        response: { status: 401 },
      });
      expect(renewals).toBe(1);
      expect(profileReads).toBe(path === "expired request" ? 0 : 1);
      expect(window.location.href).toBe("http://localhost:3000/browse");
    } finally {
      provider.release();
      view.unmount();
    }
  },
);

it.each([
  [false, false],
  [true, false],
] as const)(
  "keeps each caller's server-error policy through shared renewal (%s, %s)",
  async (firstReports, secondReports) => {
    setAuthTokens(token());
    const provider = holdSession();
    const renewal = gate();
    const entered = gate();
    let renewals = 0;
    server.use(
      http.post(`${apiBaseUrl}/auth/refresh`, async () => {
        renewals++;
        entered.release();
        await renewal.wait;
        return HttpResponse.json({ detail: "Unavailable" }, { status: 500 });
      }),
    );
    const view = mountResolution();
    try {
      await provider.entered;
      setAuthTokens(token(1));
      const requests = Promise.allSettled([
        apiClient.get("/profile/", {
          shouldReportServerError: () => firstReports,
        }),
        apiClient.get("/user-movie-data/movies", {
          shouldReportServerError: () => secondReports,
        }),
      ]);
      await entered.wait;
      await act(async () => {
        renewal.release();
        expect((await requests).map((result) => result.status)).toEqual([
          "rejected",
          "rejected",
        ]);
      });
      expect(renewals).toBe(1);
      if (firstReports)
        await waitFor(() =>
          expect(screen.getByText("Server error")).toBeVisible(),
        );
      else expect(screen.queryByText("Server error")).not.toBeInTheDocument();
    } finally {
      renewal.release();
      provider.release();
      view.unmount();
    }
  },
);

it.each([
  ["expired request", 401],
  ["expired request", 500],
  ["401 response", 401],
  ["401 response", 500],
] as const)(
  "keeps pending provider discovery through an API renewal failure (%s, %s)",
  async (path, renewalStatus) => {
    setAuthTokens(token());
    const provider = holdSession();
    const renewal = gate();
    const renewalEntered = gate();
    server.use(
      http.get(`${apiBaseUrl}/profile/`, () =>
        HttpResponse.json({ detail: "Unauthorized" }, { status: 401 }),
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
    const view = mountResolution();
    try {
      await provider.entered;
      const stored = path === "expired request" ? token(1) : token();
      setAuthTokens(stored);
      const request = Promise.allSettled([apiClient.get("/profile/")]);
      await renewalEntered.wait;
      renewal.release();
      expect((await request)[0]).toMatchObject({
        status: "rejected",
        reason: { response: { status: renewalStatus } },
      });
      expect(localStorage.getItem("access_token")).toBe(stored);
      expect(window.location.href).toBe("http://localhost:3000/browse");
      await act(async () => provider.release());
      await waitFor(() =>
        expect(view.result.current.user).toEqual(providerProfile),
      );
      expect(view.result.current.status).toBe("authenticated");
      expect(provider.reads).toBe(1);
    } finally {
      renewal.release();
      provider.release();
      view.unmount();
    }
  },
);
