import { act, renderHook, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { HttpResponse, http } from "msw/http";
import { siteOrigin, apiBaseUrl } from "@/config/baseUrls";
import { useAuth } from "@/hooks/auth/useAuth";
import { refreshAccessToken } from "@/services/apiClient";
import { setAuthTokens } from "@/utilities/tokenUtils";
import { server } from "@tests/mocks/server";
import {
  authHandlers,
  clearBrowserAuth,
  profile,
  token,
} from "@tests/helpers/auth";
import { gate, installWebLocks } from "@tests/helpers/web-locks";

const sessionUrl = `${siteOrigin}/_allauth/browser/v1/auth/session`;

beforeEach(() => {
  clearBrowserAuth();
  authHandlers();
  installWebLocks();
  document.cookie = "csrftoken=csrf-test-token; path=/";
});

function mountAuth() {
  return renderHook(() => useAuth(), { wrapper: MemoryRouter });
}

describe("authentication mount lifecycle", () => {
  it("cancels a pending provider-session request on unmount", async () => {
    const entered = gate();
    const held = gate();
    let canceled = false;
    server.use(
      http.get(sessionUrl, async ({ request }) => {
        request.signal.addEventListener("abort", () => {
          canceled = true;
        });
        entered.release();
        await held.wait;
        return HttpResponse.json({ status: 401 }, { status: 401 });
      }),
    );
    const view = mountAuth();
    try {
      await entered.wait;
      view.unmount();
      await waitFor(() => expect(canceled).toBe(true));
    } finally {
      view.unmount();
      await act(async () => {
        held.release();
      });
    }
  });

  it.each(["localStorage", "sessionStorage"] as const)(
    "leaves failed shared renewal for its live caller to handle (%s)",
    async (storage) => {
      const original = token(1);
      setAuthTokens(original, storage);
      const entered = gate();
      const held = gate();
      server.use(
        http.post(`${apiBaseUrl}/auth/refresh`, async () => {
          entered.release();
          await held.wait;
          return HttpResponse.json({}, { status: 401 });
        }),
      );
      const view = mountAuth();
      await entered.wait;
      const subscriber = refreshAccessToken().catch(() => null);
      try {
        view.unmount();
        await act(async () => {
          held.release();
          expect(await subscriber).toBeNull();
        });
        expect(window[storage].getItem("access_token")).toBe(original);
      } finally {
        view.unmount();
        held.release();
        await subscriber;
      }
    },
  );

  it.each(["localStorage", "sessionStorage"] as const)(
    "preserves a live caller's successful shared renewal (%s)",
    async (storage) => {
      setAuthTokens(token(1), storage);
      const fresh = token();
      const entered = gate();
      const held = gate();
      server.use(
        http.post(`${apiBaseUrl}/auth/refresh`, async () => {
          entered.release();
          await held.wait;
          return HttpResponse.json({ access_token: fresh });
        }),
      );
      const view = mountAuth();
      await entered.wait;
      const subscriber = refreshAccessToken().catch(() => null);
      try {
        view.unmount();
        await act(async () => {
          held.release();
          expect(await subscriber).toBe(fresh);
        });
        expect(window[storage].getItem("access_token")).toBe(fresh);
      } finally {
        view.unmount();
        held.release();
        await subscriber;
      }
    },
  );

  it("keeps the replayed mount resolving until its provider check completes", async () => {
    const entered = gate();
    const held = gate();
    const seen: string[] = [];
    server.use(
      http.get(sessionUrl, async () => {
        entered.release();
        await held.wait;
        return HttpResponse.json({
          meta: { is_authenticated: true },
          data: { user: profile },
        });
      }),
    );
    const view = renderHook(
      () => {
        const auth = useAuth();
        seen.push(auth.status);
        return auth;
      },
      { wrapper: MemoryRouter, reactStrictMode: true },
    );
    try {
      await act(async () => {
        await entered.wait;
      });
      expect(view.result.current.status).toBe("resolving");
      expect(seen).not.toContain("anonymous");
      held.release();
      await waitFor(() =>
        expect(view.result.current.status).toBe("authenticated"),
      );
      expect(view.result.current.user).toEqual(profile);
    } finally {
      view.unmount();
      await act(async () => {
        held.release();
      });
    }
  });
});
