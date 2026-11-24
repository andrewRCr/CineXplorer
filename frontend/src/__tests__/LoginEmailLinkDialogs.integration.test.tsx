import userEvent from "@testing-library/user-event";
import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw/http";
import { apiBaseUrl, siteOrigin } from "@/config/baseUrls";
import { setAuthTokens } from "@/utilities/tokenUtils";
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

describe("Login email links", () => {
  const home = { level: 2, name: "Popular in theaters" };

  function startSignedInAt(path: string) {
    homeHandlers();
    setAuthTokens(token());
    startAt(path);
  }

  async function submitReset(user: ReturnType<typeof userEvent.setup>) {
    const dialog = within(
      await screen.findByRole("dialog", { name: "Set New Password" }),
    );
    await user.type(dialog.getByLabelText("New Password"), "Fresh-pass-42");
    await user.type(dialog.getByLabelText("Confirm Password"), "Fresh-pass-42");
    await user.click(dialog.getByRole("button", { name: "Reset Password" }));
    return dialog;
  }

  it.each([
    ["verify", "Verify Your Email"],
    ["reset", "Set New Password"],
  ])(
    "keeps a signed-in visitor on a %s link until Cancel",
    async (action, name) => {
      const path = `/login?${action}=fixture-email-key`;
      startSignedInAt(path);

      const dialog = await screen.findByRole("dialog", { name });
      expect(dialog).toBeVisible();
      expect(window.location.pathname + window.location.search).toBe(path);
      await userEvent
        .setup()
        .click(within(dialog).getByRole("button", { name: "Cancel" }));
      expect(await screen.findByRole("heading", home)).toBeVisible();
      expect(window.location.pathname + window.location.search).toBe("/");
    },
  );

  it.each(["verify", "reset"])(
    "returns a signed-in visitor to the requested page when %s is empty",
    async (action) => {
      startSignedInAt(`/login?${action}=&next=%2Fwatchlist`);

      expect(
        await screen.findByRole("heading", { level: 1, name: "Watchlist" }),
      ).toBeVisible();
      expect(window.location.pathname).toBe("/watchlist");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    },
  );

  it("shows the verification toast and waits for the success dialog before going Home", async () => {
    server.use(
      http.post(`${apiBaseUrl}/verify-email/`, () =>
        HttpResponse.json({
          message: "Verification complete",
          email: profile.email,
        }),
      ),
    );
    startSignedInAt("/login?verify=fixture-email-key");
    await userEvent
      .setup()
      .click(
        await screen.findByRole("button", { name: "Complete Verification" }),
      );

    await waitFor(() =>
      expect(screen.getByText("Email verified.")).toBeVisible(),
    );
    const dialog = screen.getByRole("dialog", { name: "Verify Your Email" });
    expect(within(dialog).getByText("Verification complete")).toBeVisible();
    expect(window.location.pathname + window.location.search).toBe("/login");
    expect(
      screen.queryByText("Email verified. You can now log in."),
    ).not.toBeInTheDocument();
    expect(
      await screen.findByRole("heading", home, { timeout: 3000 }),
    ).toBeVisible();
    expect(window.location.pathname + window.location.search).toBe("/");
    expect(screen.getByText("Email verified.")).toBeVisible();
  });

  it("shows the reset toast and waits for the success dialog before going Home", async () => {
    server.use(
      http.post(`${siteOrigin}/_allauth/browser/v1/auth/password/reset`, () =>
        HttpResponse.json({}, { status: 401 }),
      ),
    );
    startSignedInAt("/login?reset=fixture-email-key");
    const dialog = await submitReset(userEvent.setup());

    await waitFor(() =>
      expect(screen.getByText("Password reset.")).toBeVisible(),
    );
    expect(dialog.getByText("Password reset successfully!")).toBeVisible();
    expect(
      dialog.queryByText("You can now log in with your new password."),
    ).not.toBeInTheDocument();
    expect(window.location.pathname).toBe("/login");
    expect(
      screen.queryByText(
        "Password reset. You can now log in with your new password.",
      ),
    ).not.toBeInTheDocument();
    expect(
      await screen.findByRole("heading", home, { timeout: 3000 }),
    ).toBeVisible();
    expect(window.location.pathname + window.location.search).toBe("/");
    expect(screen.getByText("Password reset.")).toBeVisible();
  });

  it("shows the auto-sign-in toast without leaving the page opened during a reset", async () => {
    const response = gate();
    const received = gate();
    homeHandlers();
    server.use(
      http.post(
        `${siteOrigin}/_allauth/browser/v1/auth/password/reset`,
        async () => {
          received.release();
          await response.wait;
          return HttpResponse.json({
            meta: { is_authenticated: true },
            data: { user: profile },
          });
        },
      ),
    );
    const user = userEvent.setup();
    startAt("/login?reset=fixture-email-key");
    try {
      await submitReset(user);
      await received.wait;
      await user.keyboard("{Escape}");
      await user.click(await screen.findByRole("link", { name: "Register" }));
      expect(
        await screen.findByRole("heading", {
          level: 1,
          name: "Create an account",
        }),
      ).toBeVisible();
    } finally {
      response.release();
    }

    await waitFor(
      () => expect(screen.getByText("You are now logged in.")).toBeVisible(),
      { timeout: 3000 },
    );
    expect(screen.getByText("Password reset successfully!")).toBeVisible();
    expect(window.location.pathname).toBe("/register");
  });

  it("goes Home after dismissing a reset that signed the visitor in", async () => {
    homeHandlers();
    server.use(
      http.post(`${siteOrigin}/_allauth/browser/v1/auth/password/reset`, () =>
        HttpResponse.json({ meta: { is_authenticated: true } }),
      ),
    );
    const user = userEvent.setup();
    startAt("/login?reset=fixture-email-key&next=%2Fwatchlist");
    const dialog = await submitReset(user);
    await dialog.findByText("Password reset successfully!");
    await user.keyboard("{Escape}");

    expect(
      await screen.findByRole("heading", home, { timeout: 3000 }),
    ).toBeVisible();
    expect(window.location.pathname).toBe("/");
  });

  it("keeps the browser address when it changes before the verification success dialog closes", async () => {
    server.use(
      http.post(`${apiBaseUrl}/verify-email/`, () =>
        HttpResponse.json({
          message: "Verification complete",
          email: profile.email,
        }),
      ),
    );
    startSignedInAt("/login?verify=fixture-email-key");
    await userEvent
      .setup()
      .click(
        await screen.findByRole("button", { name: "Complete Verification" }),
      );
    expect(await screen.findByText("Verification complete")).toBeVisible();
    expect(window.location.pathname + window.location.search).toBe("/login");

    window.history.pushState(window.history.state, "", "/watchlist");
    await waitFor(
      () => expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      { timeout: 3000 },
    );
    expect(window.location.pathname).toBe("/watchlist");
  });

  it("keeps a signed-in visitor on a verification error until Close", async () => {
    server.use(
      http.post(`${apiBaseUrl}/verify-email/`, () =>
        HttpResponse.json({ error: "The link expired." }, { status: 400 }),
      ),
    );
    startSignedInAt("/login?verify=expired-email-key");
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("button", { name: "Complete Verification" }),
    );

    const dialog = within(
      await screen.findByRole("dialog", { name: "Verification Failed" }),
    );
    expect(dialog.getByText("The link expired.")).toBeVisible();
    expect(window.location.pathname + window.location.search).toBe("/login");
    await user.click(dialog.getByRole("button", { name: "Close" }));
    expect(await screen.findByRole("heading", home)).toBeVisible();
    expect(window.location.pathname + window.location.search).toBe("/");
  });

  it.each([
    ["verify", "Verify Your Email"],
    ["reset", "Set New Password"],
  ])(
    "opens a %s link in the already-mounted Login page",
    async (action, name) => {
      startAt("/login");
      await screen.findByRole("textbox", signInField);
      openLink(`/login?${action}=new-email-key`);

      expect(await screen.findByRole("dialog", { name })).toBeVisible();
    },
  );

  it("opens a second verification link after completing the first", async () => {
    server.use(
      http.post(`${apiBaseUrl}/verify-email/`, async ({ request }) => {
        const body: unknown = await request.json();
        if (
          body &&
          typeof body === "object" &&
          "key" in body &&
          body.key === "second-key"
        ) {
          return HttpResponse.json({
            message: "Second address verified",
            email: "second@example.com",
          });
        }
        return HttpResponse.json({
          message: "First address verified",
          email: "first@example.com",
        });
      }),
    );
    const user = userEvent.setup();
    startAt("/login?verify=first-key");
    await user.click(
      await screen.findByRole("button", { name: "Complete Verification" }),
    );
    expect(await screen.findByText("First address verified")).toBeVisible();
    expect(
      await screen.findByRole("textbox", signInField, { timeout: 3000 }),
    ).toHaveValue("first@example.com");
    openLink("/login?verify=second-key");

    await user.click(
      await screen.findByRole("button", { name: "Complete Verification" }),
    );
    expect(await screen.findByText("Second address verified")).toBeVisible();
  });

  it("replaces verification with reset and starts fresh for a different reset key", async () => {
    const user = userEvent.setup();
    startAt("/login?verify=first-key");
    await screen.findByRole("dialog", { name: "Verify Your Email" });
    openLink("/login?reset=first-reset-key");
    const first = within(
      await screen.findByRole("dialog", { name: "Set New Password" }),
    );
    expect(
      screen.queryByRole("dialog", { name: "Verify Your Email" }),
    ).not.toBeInTheDocument();
    await user.type(first.getByLabelText("New Password"), "short");
    await user.click(first.getByRole("button", { name: "Reset Password" }));
    expect(
      first.getByText("Password must be at least 8 characters"),
    ).toBeVisible();

    openLink("/login?reset=second-reset-key");
    const second = within(
      await screen.findByRole("dialog", { name: "Set New Password" }),
    );
    expect(second.getByLabelText("New Password")).toHaveValue("");
    expect(
      second.queryByText("Password must be at least 8 characters"),
    ).not.toBeInTheDocument();
  });
});
