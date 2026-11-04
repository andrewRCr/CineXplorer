import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
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

function mountAuth() {
  return renderHook(() => useAuth(), { wrapper: MemoryRouter });
}

beforeEach(() => {
  clearBrowserAuth();
  authHandlers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("initial authentication", () => {
  it("starts signed in with current stored tokens and loads the profile", async () => {
    setAuthTokens(token());
    const { result } = mountAuth();
    expect(result.current.isAuthenticated).toBe(true);
    await waitFor(() => expect(result.current.user).toEqual(profile));
  });
  it("starts signed out without tokens or an OAuth session", async () => {
    const { result } = mountAuth();
    expect(result.current.isAuthenticated).toBe(false);
    await act(async () => {});
    expect(result.current.user).toBeNull();
  });
  it("leaves an expired token signed out when refresh is unavailable", async () => {
    setAuthTokens(token(Math.floor(Date.now() / 1000) - 300));
    const { result } = mountAuth();
    await act(async () => {});
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
    const schedule = globalThis.setInterval;
    vi.spyOn(globalThis, "setInterval").mockImplementation(
      (callback, delay, ...args) =>
        schedule(callback, delay === 60000 ? 10 : delay, ...args),
    );
    setAuthTokens(token());
    const { result } = mountAuth();
    await waitFor(() => expect(result.current.user).toEqual(profile));
    setAuthTokens(token(Math.floor(Date.now() / 1000) - 30));
    await waitFor(() => expect(result.current.isAuthenticated).toBe(false));
    expect(localStorage.getItem("access_token")).toBeNull();
  });
});
