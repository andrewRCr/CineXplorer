import userEvent from "@testing-library/user-event";
import { act, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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

describe("Login email links", () => {
  it("ignores a verification response for the link a newer one replaced", async () => {
    const response = gate();
    const received = gate();
    server.use(
      http.post(`${apiBaseUrl}/verify-email/`, async () => {
        received.release();
        await response.wait;
        return HttpResponse.json({
          message: "Old address verified",
          email: "old@example.com",
        });
      }),
    );
    const user = userEvent.setup();
    startAt("/login?verify=old-key");
    try {
      await user.click(
        await screen.findByRole("button", { name: "Complete Verification" }),
      );
      await received.wait;
      openLink("/login?verify=new-key");
      expect(
        await screen.findByRole("button", { name: "Complete Verification" }),
      ).toBeVisible();
    } finally {
      response.release();
    }

    await expect(
      screen.findByText("Old address verified", {}, { timeout: 500 }),
    ).rejects.toThrow();
    expect(window.location.search).toBe("?verify=new-key");
    const dialog = within(
      screen.getByRole("dialog", { name: "Verify Your Email" }),
    );
    await user.click(dialog.getByRole("button", { name: "Cancel" }));
    expect(await screen.findByRole("textbox", signInField)).toHaveValue("");
    expect(
      screen.queryByText("Email verified. You can now log in."),
    ).not.toBeInTheDocument();
  });

  it("ignores an old verification response after the newer link is dismissed", async () => {
    const response = gate();
    const received = gate();
    server.use(
      http.post(`${apiBaseUrl}/verify-email/`, async () => {
        received.release();
        await response.wait;
        return HttpResponse.json({
          message: "Old address verified",
          email: "old@example.com",
        });
      }),
    );
    const user = userEvent.setup();
    startAt("/login?verify=old-key");
    await user.click(
      await screen.findByRole("button", { name: "Complete Verification" }),
    );
    await received.wait;
    openLink("/login?verify=new-key");
    const dialog = within(
      await screen.findByRole("dialog", { name: "Verify Your Email" }),
    );
    await user.click(dialog.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(window.location.search).toBe(""));
    response.release();

    await expect(
      screen.findByText("Old address verified", {}, { timeout: 500 }),
    ).rejects.toThrow();
    expect(await screen.findByRole("textbox", signInField)).toHaveValue("");
    expect(
      screen.queryByText("Email verified. You can now log in."),
    ).not.toBeInTheDocument();
  });

  it("leaves a visitor who moved on where they are when a verification finishes late", async () => {
    const response = gate();
    const received = gate();
    server.use(
      http.post(`${apiBaseUrl}/verify-email/`, async () => {
        received.release();
        await response.wait;
        return HttpResponse.json({
          message: "Late verification",
          email: "late@example.com",
        });
      }),
    );
    const user = userEvent.setup();
    startAt("/login?verify=late-key");
    try {
      await user.click(
        await screen.findByRole("button", { name: "Complete Verification" }),
      );
      await received.wait;
      await user.keyboard("{Escape}");
      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
      await user.click(screen.getByRole("link", { name: "Register" }));
      expect(
        await screen.findByRole("heading", {
          level: 1,
          name: "Create an account",
        }),
      ).toBeVisible();
    } finally {
      response.release();
    }

    await expect(
      screen.findByText(
        "Email verified. You can now log in.",
        {},
        {
          timeout: 500,
        },
      ),
    ).rejects.toThrow();
    expect(window.location.pathname).toBe("/register");
  });

  it("keeps the requested page on a fresh Login visit when an earlier verification finishes", async () => {
    const response = gate();
    const received = gate();
    server.use(
      http.post(`${apiBaseUrl}/verify-email/`, async () => {
        received.release();
        await response.wait;
        return HttpResponse.json({
          message: "Old address verified",
          email: "old@example.com",
        });
      }),
    );
    const user = userEvent.setup();
    startAt("/login?verify=old-key");
    try {
      await user.click(
        await screen.findByRole("button", { name: "Complete Verification" }),
      );
      await received.wait;
      await user.keyboard("{Escape}");
      await user.click(await screen.findByRole("link", { name: "Register" }));
      await screen.findByRole("heading", {
        level: 1,
        name: "Create an account",
      });
      openLink("/login?next=%2Fwatchlist");
      await screen.findByRole("textbox", signInField);
    } finally {
      response.release();
    }

    await expect(
      screen.findByText("Old address verified", {}, { timeout: 500 }),
    ).rejects.toThrow();
    expect(window.location.pathname + window.location.search).toBe(
      "/login?next=%2Fwatchlist",
    );
    expect(screen.getByRole("textbox", signInField)).toHaveValue("");
  });

  it.each(["with the dialog open", "before the route commits"])(
    "keeps an email link that arrives during password sign-in %s",
    async (arrival) => {
      const response = gate();
      const received = gate();
      const browserOnly = arrival === "before the route commits";
      server.use(
        http.post(`${apiBaseUrl}/token/`, async () => {
          received.release();
          await response.wait;
          return HttpResponse.json({
            user_id: profile.id,
            access_token: token(),
            username: profile.username,
          });
        }),
        http.post(`${apiBaseUrl}/verify-email/`, () =>
          HttpResponse.json({ error: "The link expired." }, { status: 400 }),
        ),
      );
      const path = "/login?verify=fixture-email-key&next=%2Fwatchlist";
      const user = userEvent.setup();
      startAt("/login?next=%2Fwatchlist");
      try {
        await user.type(
          await screen.findByRole("textbox", signInField),
          profile.username,
        );
        await user.type(screen.getByLabelText("Password"), "testpass123");
        await user.click(screen.getByRole("button", { name: "Login" }));
        await received.wait;
        expect(screen.getByText("Logging in...")).toBeVisible();
        if (browserOnly) {
          window.history.pushState(window.history.state, "", path);
        } else {
          openLink(path);
          await user.click(
            await screen.findByRole("button", {
              name: "Complete Verification",
            }),
          );
          await screen.findByRole("dialog", { name: "Verification Failed" });
        }
      } finally {
        response.release();
      }

      await waitFor(() =>
        expect(screen.queryByText("Logging in...")).not.toBeInTheDocument(),
      );
      expect(window.location.pathname + window.location.search).toBe(
        browserOnly ? path : "/login",
      );
      if (browserOnly) {
        act(() => window.dispatchEvent(new PopStateEvent("popstate")));
      }
      const dialog = await screen.findByRole("dialog", {
        name: browserOnly ? "Verify Your Email" : "Verification Failed",
      });
      await user.click(
        within(dialog).getByRole("button", {
          name: browserOnly ? "Cancel" : "Close",
        }),
      );
      expect(
        await screen.findByRole("heading", { level: 1, name: "Watchlist" }),
      ).toBeVisible();
    },
  );

  it.each([
    ["verify", "Verify Your Email"],
    ["reset", "Set New Password"],
  ])(
    "keeps the browser's %s link when sign-in resolves before the route commits",
    async (action, name) => {
      const response = gate();
      const path = `/login?${action}=fixture-email-key`;
      homeHandlers();
      server.use(
        http.get(`${siteOrigin}/_allauth/browser/v1/auth/session`, async () => {
          await response.wait;
          return HttpResponse.json({
            meta: { is_authenticated: true },
            data: { user: profile },
          });
        }),
      );
      startAt("/login?next=%2Fwatchlist");
      try {
        await screen.findByRole("textbox", signInField);
        window.history.pushState(window.history.state, "", path);
      } finally {
        response.release();
      }

      expect(
        await screen.findByRole("button", { name: profile.username }),
      ).toBeVisible();
      expect(window.location.pathname + window.location.search).toBe(path);
      act(() => window.dispatchEvent(new PopStateEvent("popstate")));
      expect(await screen.findByRole("dialog", { name })).toBeVisible();
    },
  );
});
