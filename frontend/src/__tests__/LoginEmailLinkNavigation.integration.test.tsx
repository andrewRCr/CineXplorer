import userEvent from "@testing-library/user-event";
import { act, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw/http";
import { apiBaseUrl, siteOrigin } from "@/config/baseUrls";
import {
  openLink,
  setupAppTest,
  signInField,
  startAt,
} from "@tests/helpers/app-test";
import { profile, token } from "@tests/helpers/auth";
import { gate } from "@tests/helpers/web-locks";
import { server } from "@tests/mocks/server";
import { homeHandlers } from "@/pages/home/__tests__/homeFixtures";

setupAppTest();

const watchlistLogin = "/login?next=%2Fwatchlist";
const watchlistHeading = { level: 1, name: "Watchlist" };
const registerHeading = { level: 1, name: "Create an account" };
const verifyUrl = `${apiBaseUrl}/verify-email/`;
const resetUrl = `${siteOrigin}/_allauth/browser/v1/auth/password/reset`;
const sessionUrl = `${siteOrigin}/_allauth/browser/v1/auth/session`;

const currentAddress = () => window.location.pathname + window.location.search;
const signedInSession = () =>
  HttpResponse.json({
    meta: { is_authenticated: true },
    data: { user: profile },
  });
const passwordToken = () =>
  HttpResponse.json({
    user_id: profile.id,
    access_token: token(),
    username: profile.username,
  });

async function signIn(user: ReturnType<typeof userEvent.setup>) {
  const username = await screen.findByRole("textbox", signInField, {
    timeout: 3000,
  });
  await user.clear(username);
  await user.type(username, profile.username);
  await user.type(screen.getByLabelText("Password"), "Fresh-pass-42");
  await user.click(screen.getByRole("button", { name: "Login" }));
}

const emailLinks = [
  {
    action: "verify",
    url: verifyUrl,
    success: "Verification complete",
    respond: () =>
      HttpResponse.json({
        message: "Verification complete",
        email: profile.email,
      }),
  },
  {
    action: "reset",
    url: resetUrl,
    success: "Password reset successfully!",
    respond: () => HttpResponse.json({}, { status: 401 }),
  },
] as const;

async function submitEmailLink(
  user: ReturnType<typeof userEvent.setup>,
  action: (typeof emailLinks)[number]["action"],
) {
  if (action === "verify") {
    await user.click(
      await screen.findByRole("button", { name: "Complete Verification" }),
    );
  } else {
    const dialog = within(
      await screen.findByRole("dialog", { name: "Set New Password" }),
    );
    await user.type(dialog.getByLabelText("New Password"), "Fresh-pass-42");
    await user.type(dialog.getByLabelText("Confirm Password"), "Fresh-pass-42");
    await user.click(dialog.getByRole("button", { name: "Reset Password" }));
  }
}

describe("Login email link navigation", () => {
  it.each(emailLinks)(
    "preserves the address reached by Back during a pending $action request",
    async ({ action, url, success, respond }) => {
      const response = gate();
      const received = gate();
      const session = gate();
      homeHandlers();
      server.use(
        http.post(url, async () => {
          received.release();
          await response.wait;
          return respond();
        }),
        http.get(sessionUrl, async () => {
          await session.wait;
          return signedInSession();
        }),
      );

      const user = userEvent.setup();
      startAt(watchlistLogin);
      try {
        await screen.findByRole("textbox", signInField);
        openLink(`/login?${action}=fixture-email-key`);
        await submitEmailLink(user, action);
        await received.wait;
        window.history.back();
        await waitFor(() => expect(currentAddress()).toBe(watchlistLogin));

        response.release();
        expect(await screen.findByText(success)).toBeVisible();
        await screen.findByRole("textbox", signInField, { timeout: 3000 });
        expect(currentAddress()).toBe(watchlistLogin);
      } finally {
        response.release();
        session.release();
      }

      expect(
        await screen.findByRole("heading", watchlistHeading),
      ).toBeVisible();
      expect(currentAddress()).toBe("/watchlist");
    },
  );

  it("leaves Register open when the password sign-in started on Login settles", async () => {
    const response = gate();
    const received = gate();
    server.use(
      http.post(`${apiBaseUrl}/token/`, async () => {
        received.release();
        await response.wait;
        return passwordToken();
      }),
    );
    const user = userEvent.setup();
    startAt(watchlistLogin);
    try {
      await signIn(user);
      await received.wait;
      await user.click(screen.getByRole("link", { name: "Register" }));
      expect(await screen.findByRole("heading", registerHeading)).toBeVisible();
    } finally {
      response.release();
    }

    expect(
      await screen.findByRole("button", { name: profile.username }),
    ).toBeVisible();
    expect(currentAddress()).toBe("/register");
    expect(screen.getByRole("heading", registerHeading)).toBeVisible();
  });

  it("leaves a verification error open when the session read from a Google referrer settles", async () => {
    const session = gate();
    vi.spyOn(document, "referrer", "get").mockReturnValue(
      "https://accounts.google.com/",
    );
    const startTime = String(Date.now());
    sessionStorage.setItem("oauth_start_time", startTime);
    server.use(
      http.get(sessionUrl, async () => {
        await session.wait;
        return signedInSession();
      }),
      http.post(verifyUrl, () =>
        HttpResponse.json({ error: "The link expired." }, { status: 400 }),
      ),
    );

    const user = userEvent.setup();
    startAt("/login?verify=expired-email-key&next=%2Fwatchlist");
    try {
      await submitEmailLink(user, "verify");
      expect(await screen.findByText("The link expired.")).toBeVisible();
      // Let the router commit the cleared address before the session settles.
      await act(async () => {});
      expect(new URLSearchParams(window.location.search).has("verify")).toBe(
        false,
      );
      expect(sessionStorage.getItem("oauth_start_time")).toBe(startTime);
    } finally {
      session.release();
    }

    await waitFor(() =>
      expect(sessionStorage.getItem("oauth_start_time")).toBeNull(),
    );
    expect(window.location.pathname).toBe("/login");
    const dialog = within(
      screen.getByRole("dialog", { name: "Verification Failed" }),
    );
    expect(dialog.getByText("The link expired.")).toBeVisible();
    await user.click(dialog.getByRole("button", { name: "Close" }));
    expect(await screen.findByRole("heading", watchlistHeading)).toBeVisible();
  });

  it.each(emailLinks)(
    "keeps next after $action and returns there after password sign-in",
    async ({ action, url, success, respond }) => {
      server.use(
        http.post(url, respond),
        http.post(`${apiBaseUrl}/token/`, passwordToken),
      );
      const user = userEvent.setup();
      startAt(`/login?${action}=fixture-email-key&next=%2Fwatchlist`);
      await submitEmailLink(user, action);
      expect(await screen.findByText(success)).toBeVisible();
      await screen.findByRole("textbox", signInField, { timeout: 3000 });
      expect(currentAddress()).toBe(watchlistLogin);

      await signIn(user);
      expect(
        await screen.findByRole("heading", watchlistHeading),
      ).toBeVisible();
    },
  );

  it.each(emailLinks)(
    "clears a $action link without next to plain Login",
    async ({ action, url, success, respond }) => {
      server.use(http.post(url, respond));
      const user = userEvent.setup();
      startAt(`/login?${action}=fixture-email-key`);
      await submitEmailLink(user, action);
      expect(await screen.findByText(success)).toBeVisible();
      await screen.findByRole("textbox", signInField, { timeout: 3000 });
      expect(currentAddress()).toBe("/login");
    },
  );
});
