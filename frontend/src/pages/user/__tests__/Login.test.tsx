import { afterEach, beforeEach, describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { act, render, screen } from "@tests/helpers/test-renderer";
import { authHandlers, clearBrowserAuth } from "@tests/helpers/auth";
import { server } from "@tests/mocks/server";
import { apiBaseUrl } from "@/config/baseUrls";
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
  it.each([503, 429, 500, 400, "network"] as const)(
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
