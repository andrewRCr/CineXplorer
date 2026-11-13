import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw/http";
import { render as renderWithoutRouter } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { act, render, screen, waitFor } from "@tests/helpers/test-renderer";
import {
  authHandlers,
  clearBrowserAuth,
  profile,
  token,
} from "@tests/helpers/auth";
import { TestProviders } from "@tests/helpers/test-providers";
import { server } from "@tests/mocks/server";
import { apiBaseUrl, siteOrigin } from "@/config/baseUrls";
import { setAuthTokens } from "@/utilities/tokenUtils";
import AuthContextProvider from "@/components/auth/AuthContextProvider";
import {
  PriorityToaster,
  Toaster,
  priorityToaster,
  toaster,
} from "@/components/core/chakra/toaster";
import logger from "@/services/logger";
import { gate } from "@tests/helpers/web-locks";
import Login from "../Login";

const originalConfig = logger.getEnvironmentInfo().config;
const failureMessage =
  "We couldn't send the email. Please try again in a few minutes.";
beforeEach(() => {
  clearBrowserAuth();
  authHandlers();
  logger.updateConfig({ enableConsole: false, enableBackendReporting: false });
  server.use(
    http.post(`${apiBaseUrl}/token/`, () =>
      HttpResponse.json(
        {
          error: "Please verify your email before signing in.",
          code: "email_not_verified",
          resend_token: "x".repeat(64),
        },
        { status: 403 },
      ),
    ),
  );
});
afterEach(() => {
  act(() => {
    toaster.remove();
    priorityToaster.remove();
  });
  clearBrowserAuth();
  logger.clearLogs();
  logger.updateConfig(originalConfig);
});

describe("resending from an unverified sign-in", () => {
  it("asks to sign in again when the resend link has expired", async () => {
    const expired =
      "This resend link has expired. Sign in again to get a new one.";
    server.use(
      http.post(`${apiBaseUrl}/resend-verification/`, () =>
        HttpResponse.json({ detail: expired }, { status: 400 }),
      ),
    );
    const user = userEvent.setup();
    render(
      <>
        <AuthContextProvider>
          <Login />
        </AuthContextProvider>
        <Toaster />
        <PriorityToaster />
      </>,
    );
    await user.type(
      screen.getByRole("textbox", { name: "Username or Email Address" }),
      "viewer",
    );
    await user.type(screen.getByLabelText("Password"), "testpass123");
    await user.click(screen.getByRole("button", { name: "Login" }));
    await user.click(
      await screen.findByRole("button", { name: "Resend verification" }),
    );
    expect(await screen.findByText(expired)).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Resend verification" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Verification email sent!"),
    ).not.toBeInTheDocument();
  });

  it.each([503, 429, 500, "network"] as const)(
    "renders the failure toast for %s",
    async (outcome) => {
      server.use(
        http.post(`${apiBaseUrl}/resend-verification/`, () =>
          outcome === "network"
            ? HttpResponse.error()
            : HttpResponse.json(
                { detail: failureMessage },
                { status: outcome },
              ),
        ),
      );
      const user = userEvent.setup();
      render(
        <>
          <AuthContextProvider>
            <Login />
          </AuthContextProvider>
          <Toaster />
          <PriorityToaster />
        </>,
      );
      await user.type(
        screen.getByRole("textbox", { name: "Username or Email Address" }),
        "viewer",
      );
      await user.type(screen.getByLabelText("Password"), "testpass123");
      await user.click(screen.getByRole("button", { name: "Login" }));
      await user.click(
        await screen.findByRole("button", { name: "Resend verification" }),
      );
      const expected =
        outcome === 503
          ? failureMessage
          : outcome === 429
            ? "Too many requests"
            : "Please try again later.";
      if (outcome === 500) {
        expect((await screen.findAllByText(expected)).length).toBeGreaterThan(
          0,
        );
      } else {
        await waitFor(() => expect(screen.getByText(expected)).toBeVisible());
      }
      if (outcome !== 503)
        expect(screen.queryByText(failureMessage)).not.toBeInTheDocument();
      else expect(screen.queryByText("Server error")).not.toBeInTheDocument();
    },
  );
});

describe("returning to the requested page", () => {
  function CurrentPage() {
    const location = useLocation();
    return (
      <p>
        Now at {location.pathname}
        {location.search}
      </p>
    );
  }

  function renderLoginAt(entry: string) {
    return renderWithoutRouter(
      <TestProviders>
        <MemoryRouter initialEntries={[entry]}>
          <AuthContextProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="*" element={<CurrentPage />} />
            </Routes>
          </AuthContextProvider>
        </MemoryRouter>
        <Toaster />
        <PriorityToaster />
      </TestProviders>,
    );
  }

  async function signInWithPassword() {
    server.use(
      http.post(`${apiBaseUrl}/token/`, () =>
        HttpResponse.json({
          user_id: profile.id,
          access_token: token(),
          username: profile.username,
        }),
      ),
    );
    const user = userEvent.setup();
    await user.type(
      await screen.findByRole("textbox", { name: "Username or Email Address" }),
      "viewer",
    );
    await user.type(screen.getByLabelText("Password"), "testpass123");
    await user.click(screen.getByRole("button", { name: "Login" }));
  }

  it("returns there after a password sign-in", async () => {
    renderLoginAt("/login?next=%2Fwatchlist%3Fsort%3Dadded");
    await signInWithPassword();
    expect(
      await screen.findByText("Now at /watchlist?sort=added"),
    ).toBeVisible();
  });

  it("goes home after a password sign-in when the page is unsafe", async () => {
    renderLoginAt("/login?next=%2F%2Fevil.example");
    await signInWithPassword();
    expect(await screen.findByText("Now at /")).toBeVisible();
  });

  it("sends a visitor who is already signed in straight there", async () => {
    setAuthTokens(token());
    renderLoginAt("/login?next=%2Fwatchlist");
    expect(await screen.findByText("Now at /watchlist")).toBeVisible();
  });

  it("sends a signed-in visitor on when a provider sign-in left no start time", async () => {
    setAuthTokens(token());
    sessionStorage.setItem("oauth_in_progress", "google");
    renderLoginAt("/login?next=%2Fwatchlist");
    expect(await screen.findByText("Now at /watchlist")).toBeVisible();
  });

  it("asks the provider to come back to sign-in with the page", async () => {
    document.cookie = "csrftoken=django-csrf; path=/";
    let submitted: FormData | undefined;
    const submit = vi
      .spyOn(HTMLFormElement.prototype, "submit")
      .mockImplementation(function (this: HTMLFormElement) {
        submitted = new FormData(this);
        this.remove();
      });
    renderLoginAt("/login?next=%2Fwatchlist");
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Google" }));
    await vi.waitFor(() => expect(submitted).toBeDefined());
    expect(submitted?.get("callback_url")).toBe(
      `${siteOrigin}/login?next=%2Fwatchlist`,
    );
    submit.mockRestore();
  });
});

describe("signed-out notice", () => {
  function renderSignedOut() {
    window.history.replaceState({}, "", "/login?signed_out=true");
    return renderWithoutRouter(
      <TestProviders>
        <MemoryRouter initialEntries={["/login?signed_out=true"]}>
          <AuthContextProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<h1>Home after sign-in</h1>} />
            </Routes>
            <PriorityToaster />
          </AuthContextProvider>
        </MemoryRouter>
      </TestProviders>,
    );
  }
  it("shows the notice once the reloaded page knows nobody is signed in", async () => {
    const held = gate();
    const entered = gate();
    server.use(
      http.get(`${siteOrigin}/_allauth/browser/v1/auth/session`, async () => {
        entered.release();
        await held.wait;
        return HttpResponse.json({}, { status: 401 });
      }),
    );
    renderSignedOut();
    await entered.wait;
    expect(
      screen.queryByText("You've been logged out"),
    ).not.toBeInTheDocument();
    held.release();
    await waitFor(() =>
      expect(screen.getByText("You've been logged out")).toBeVisible(),
    );
    expect(new URL(document.URL).search).toBe("");
  });
  it.each(["stored token", "provider session"])(
    "withholds the notice for a signed-in visitor (%s)",
    async (kind) => {
      const held = gate();
      const entered = gate();
      if (kind === "stored token") setAuthTokens(token());
      else
        server.use(
          http.get(
            `${siteOrigin}/_allauth/browser/v1/auth/session`,
            async () => {
              entered.release();
              await held.wait;
              return HttpResponse.json({
                meta: { is_authenticated: true },
                data: { user: profile },
              });
            },
          ),
        );
      renderSignedOut();
      if (kind === "provider session") {
        await entered.wait;
        expect(
          screen.queryByText("You've been logged out"),
        ).not.toBeInTheDocument();
        held.release();
      }
      expect(
        await screen.findByRole("heading", { name: "Home after sign-in" }),
      ).toBeVisible();
      expect(
        screen.queryByText("You've been logged out"),
      ).not.toBeInTheDocument();
    },
  );
});

describe("the sign-in page heading", () => {
  function renderSignIn() {
    return renderWithoutRouter(
      <TestProviders>
        <MemoryRouter initialEntries={["/login"]}>
          <AuthContextProvider>
            <Login />
          </AuthContextProvider>
        </MemoryRouter>
      </TestProviders>,
    );
  }

  it("gives the form one visually hidden heading", async () => {
    renderSignIn();
    await screen.findByRole("textbox", { name: "Username or Email Address" });
    const heading = screen.getByRole("heading", { level: 1, name: "Sign in" });
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(getComputedStyle(heading).position).toBe("absolute");
    expect(getComputedStyle(heading).width).toBe("1px");
  });

  it.each(["google", "github"])(
    "shows no heading while completing %s sign-in",
    async (provider) => {
      const held = gate();
      server.use(
        http.get(`${siteOrigin}/_allauth/browser/v1/auth/session`, async () => {
          await held.wait;
          return HttpResponse.json({ status: 401 }, { status: 401 });
        }),
      );
      sessionStorage.setItem("oauth_in_progress", provider);
      renderSignIn();
      expect(
        screen.getByText(
          `Logging in with ${provider === "google" ? "Google" : "GitHub"}...`,
        ),
      ).toBeVisible();
      expect(
        screen.queryByRole("heading", { level: 1 }),
      ).not.toBeInTheDocument();
      held.release();
      await screen.findByRole("textbox", { name: "Username or Email Address" });
    },
  );
});
