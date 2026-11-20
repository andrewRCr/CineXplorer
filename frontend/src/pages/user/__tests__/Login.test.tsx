import { settleToastSubscriptions } from "@tests/helpers/toast";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw/http";
import { render as renderWithoutRouter } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import {
  act,
  render,
  screen,
  waitFor,
  within,
} from "@tests/helpers/test-renderer";
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
import { LiveAnnouncer } from "@/components/core/LiveAnnouncer";
import Login from "../Login";

const originalConfig = logger.getEnvironmentInfo().config;
const failureMessage =
  "We couldn't send the email. Please try again in a few minutes.";
const sent = "Verification email sent. Check your inbox for the link.";
const signedOut = "You've been logged out.";
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

/**
 * Asserts the card shows the notice and screen readers hear it through the app's live region (the one status region
 * holding it), with no priority toast alongside.
 */
function expectNotice(text: string) {
  const regions = screen
    .getAllByRole("status")
    .filter((region) => within(region).queryByText(text));
  expect(regions).toHaveLength(1);
  // One copy in the card, one in the live region
  expect(screen.getAllByText(text)).toHaveLength(2);
  expect(priorityToaster.getVisibleToasts()).toHaveLength(0);
}

/** Asserts the card shows the error as its one alert, with no priority toast alongside. */
function expectErrorInCard(text: string) {
  expect(screen.getByRole("alert")).toHaveTextContent(text);
  expect(priorityToaster.getVisibleToasts()).toHaveLength(0);
}

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
        <LiveAnnouncer />
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
    expect(screen.queryByText(sent)).not.toBeInTheDocument();
  });

  it("reports a sent email in the verification notice", async () => {
    server.use(
      http.post(`${apiBaseUrl}/resend-verification/`, () =>
        HttpResponse.json({ message: "Verification email sent" }),
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
        <LiveAnnouncer />
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
    await waitFor(() => expectNotice(sent));
    expect(
      screen.getByRole("button", { name: "Resend verification" }),
    ).toBeVisible();
  });

  it.each([503, 429, 500, "network"] as const)(
    "reports a failed resend in the verification notice for %s",
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
          <LiveAnnouncer />
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
            ? "Too many requests. Please wait a moment before trying again."
            : "Failed to send the email. Please try again later.";
      await waitFor(() => expectNotice(expected));
      expect(
        screen.getByRole("button", { name: "Resend verification" }),
      ).toBeVisible();
      if (outcome !== 503)
        expect(screen.queryByText(failureMessage)).not.toBeInTheDocument();
      else expect(screen.queryByText("Server error")).not.toBeInTheDocument();
    },
  );

  it("shows each resend attempt, even one that ends like the last", async () => {
    const held = [gate(), gate()];
    let attempt = 0;
    server.use(
      http.post(`${apiBaseUrl}/resend-verification/`, async () => {
        await held[attempt++]?.wait;
        return HttpResponse.json({ detail: "Slow down" }, { status: 429 });
      }),
    );
    const sending = "Sending a new verification email...";
    const limited =
      "Too many requests. Please wait a moment before trying again.";
    const user = userEvent.setup();
    render(
      <>
        <AuthContextProvider>
          <Login />
        </AuthContextProvider>
        <PriorityToaster />
        <LiveAnnouncer />
      </>,
    );
    await user.type(
      screen.getByRole("textbox", { name: "Username or Email Address" }),
      "viewer",
    );
    await user.type(screen.getByLabelText("Password"), "testpass123");
    await user.click(screen.getByRole("button", { name: "Login" }));
    for (const gateFor of held) {
      await user.click(
        await screen.findByRole("button", { name: "Resend verification" }),
      );
      await waitFor(() => expectNotice(sending));
      gateFor.release();
      await waitFor(() => expectNotice(limited));
    }
    expect(attempt).toBe(2);
  });

  it("drops a resend result once its alert is dismissed", async () => {
    const held = gate();
    server.use(
      http.post(`${apiBaseUrl}/resend-verification/`, async () => {
        await held.wait;
        return HttpResponse.json({ message: "Verification email sent" });
      }),
    );
    const user = userEvent.setup();
    render(
      <>
        <AuthContextProvider>
          <Login />
        </AuthContextProvider>
        <PriorityToaster />
        <LiveAnnouncer />
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
    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(
      screen.queryByRole("button", { name: "Resend verification" }),
    ).not.toBeInTheDocument();
    held.release();
    await expect(
      screen.findByText(sent, {}, { timeout: 500 }),
    ).rejects.toThrow();
  });
});

describe("signing in with a password", () => {
  it("shows its progress on the button alone", async () => {
    const held = gate();
    server.use(
      http.post(`${apiBaseUrl}/token/`, async () => {
        await held.wait;
        return HttpResponse.json(
          { error: "Invalid username or password." },
          { status: 401 },
        );
      }),
    );
    const user = userEvent.setup();
    render(
      <>
        <AuthContextProvider>
          <Login />
        </AuthContextProvider>
        <Toaster />
        <PriorityToaster />
        <LiveAnnouncer />
      </>,
    );
    await user.type(
      screen.getByRole("textbox", { name: "Username or Email Address" }),
      "viewer",
    );
    await user.type(screen.getByLabelText("Password"), "wrongpass1");
    await user.click(screen.getByRole("button", { name: "Login" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Logging in..." }),
      ).toBeVisible(),
    );
    expect(screen.getAllByText("Logging in...")).toHaveLength(1);
    expect(priorityToaster.getVisibleToasts()).toHaveLength(0);
    held.release();
    await waitFor(() => expectErrorInCard("Invalid username or password."));
  });
});

describe("notices the sign-in page opens with", () => {
  function renderLoginWith(
    entry: string | { pathname: string; state: unknown },
  ) {
    return renderWithoutRouter(
      <TestProviders>
        <MemoryRouter initialEntries={[entry]}>
          <AuthContextProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<h1>Home after sign-in</h1>} />
            </Routes>
            <PriorityToaster />
            <LiveAnnouncer />
          </AuthContextProvider>
        </MemoryRouter>
      </TestProviders>,
    );
  }

  it("shows a new account's next step in the card", async () => {
    const created =
      "Account created! Check your email to verify your account before logging in.";
    renderLoginWith({
      pathname: "/login",
      state: { registrationSuccess: true, message: created },
    });
    // The card shows it at once; the live region, new with the page, waits until screen readers track it
    await screen.findByText(created);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    await waitFor(() => expectNotice(created));
  });

  it("shows an expired session in the card", async () => {
    window.history.replaceState({}, "", "/login?session_expired=true");
    renderLoginWith("/login?session_expired=true");
    const expired = "Session expired. Please log in again.";
    // The card shows it at once; the live region, new with the page, waits until screen readers track it
    await screen.findByText(expired);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    await waitFor(() => expectNotice(expired));
  });

  it("keeps a notice when focus leaves an empty field", async () => {
    const expired = "Session expired. Please log in again.";
    window.history.replaceState({}, "", "/login?session_expired=true");
    renderLoginWith("/login?session_expired=true");
    await waitFor(() => expectNotice(expired));
    expect(
      screen.getByRole("textbox", { name: "Username or Email Address" }),
    ).toHaveFocus();
    const user = userEvent.setup();
    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Dismiss" })).toHaveFocus();
    expectNotice(expired);
  });

  it("shows a verified email in the card", async () => {
    server.use(
      http.post(`${apiBaseUrl}/verify-email/`, () =>
        HttpResponse.json({
          message: "Email verified",
          email: "viewer@example.com",
        }),
      ),
    );
    window.history.replaceState({}, "", "/login?verify=verify-key");
    renderLoginWith("/login?verify=verify-key");
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("button", { name: "Complete Verification" }),
    );
    // Heard while the dialog still shows its success: the live region sits outside the dialog's page hiding
    const verified = "Email verified. You can now log in.";
    await waitFor(() => expectNotice(verified));
    expect(screen.getByRole("dialog")).toBeVisible();
    await waitFor(
      () => expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      { timeout: 3000 },
    );
    expect(
      screen.getByRole("textbox", { name: "Username or Email Address" }),
    ).toHaveValue("viewer@example.com");
  });

  const reset = "Password reset. You can now log in with your new password.";

  /** Opens the reset dialog, submits a new password the server accepts without signing in, and returns the dialog. */
  async function submitPasswordReset(user: ReturnType<typeof userEvent.setup>) {
    server.use(
      http.post(`${siteOrigin}/_allauth/browser/v1/auth/password/reset`, () =>
        HttpResponse.json({}, { status: 401 }),
      ),
    );
    window.history.replaceState({}, "", "/login?reset=reset-key");
    renderLoginWith("/login?reset=reset-key");
    const dialog = await screen.findByRole("dialog", {
      name: "Set New Password",
    });
    const password = within(dialog).getByLabelText("New Password");
    const confirm = within(dialog).getByLabelText("Confirm Password");
    await waitFor(() => expect(confirm).toBeVisible());
    await user.type(password, "Fresh-pass-42");
    await user.type(confirm, "Fresh-pass-42");
    await user.click(
      within(dialog).getByRole("button", { name: "Reset Password" }),
    );
    return dialog;
  }

  it("shows a reset password in the card when it doesn't sign the visitor in", async () => {
    await submitPasswordReset(userEvent.setup());
    await waitFor(() => expectNotice(reset), { timeout: 4000 });
  });

  it("shows a reset password in the card after the dialog is dismissed early", async () => {
    const user = userEvent.setup();
    const dialog = await submitPasswordReset(user);
    await within(dialog).findByText("Password reset successfully!");
    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    await waitFor(() => expectNotice(reset), { timeout: 4000 });
  });
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
        <LiveAnnouncer />
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
    expect(screen.queryByText(/Welcome back/)).not.toBeInTheDocument();
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
  async function renderSignedOut() {
    window.history.replaceState({}, "", "/login?signed_out=true");
    const view = renderWithoutRouter(
      <TestProviders>
        <MemoryRouter initialEntries={["/login?signed_out=true"]}>
          <AuthContextProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<h1>Home after sign-in</h1>} />
            </Routes>
            <PriorityToaster />
            <LiveAnnouncer />
          </AuthContextProvider>
        </MemoryRouter>
      </TestProviders>,
    );
    await settleToastSubscriptions();
    return view;
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
    await renderSignedOut();
    await entered.wait;
    // The notice region is on the page, empty, before the notice arrives, so screen readers announce the arrival
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    held.release();
    await waitFor(() => expectNotice(signedOut));
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
      await renderSignedOut();
      if (kind === "provider session") {
        await entered.wait;
        expect(screen.queryByText(signedOut)).not.toBeInTheDocument();
        held.release();
      }
      expect(
        await screen.findByRole("heading", { name: "Home after sign-in" }),
      ).toBeVisible();
      expect(screen.queryByText(signedOut)).not.toBeInTheDocument();
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

it("shows the account creation notice after the sign-in provider buttons", () => {
  render(<Login />);

  const notice = screen.getByText(/^By creating an account, you agree to/);
  expect(notice).toHaveTextContent(
    /^By creating an account, you agree to the Terms of Service and acknowledge the Privacy Policy\.$/,
  );
  expect(
    screen.getByRole("link", { name: "Terms of Service" }),
  ).toHaveAttribute("href", "/terms");
  expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute(
    "href",
    "/privacy",
  );
  for (const name of ["Google", "GitHub"]) {
    const button = screen.getByRole("button", { name });
    expect(
      button.compareDocumentPosition(notice) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0);
  }
});
