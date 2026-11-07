import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw/http";
import { render as renderWithoutRouter } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { act, render, screen } from "@tests/helpers/test-renderer";
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
        expect(await screen.findByText(expected)).toBeVisible();
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
          refresh_token: "refresh",
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
