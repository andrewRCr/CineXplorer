import { afterEach, beforeEach, describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw/http";
import { act, render, screen, waitFor } from "@tests/helpers/test-renderer";
import { authHandlers, clearBrowserAuth } from "@tests/helpers/auth";
import { server } from "@tests/mocks/server";
import { siteOrigin } from "@/config/baseUrls";
import {
  PriorityToaster,
  Toaster,
  priorityToaster,
  toaster,
} from "@/components/core/chakra/toaster";
import ForgotPassword from "../ForgotPassword";

const failureMessage =
  "We couldn't send the email. Please try again in a few minutes.";
beforeEach(() => {
  clearBrowserAuth();
  authHandlers();
});
afterEach(() => {
  act(() => {
    toaster.remove();
    priorityToaster.remove();
  });
  clearBrowserAuth();
});

describe("password-reset request outcomes", () => {
  it.each([503, 500, 400, "network", 200] as const)(
    "shows the appropriate response for %s",
    async (outcome) => {
      server.use(
        http.post(
          `${siteOrigin}/_allauth/browser/v1/auth/password/request`,
          () =>
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
          <ForgotPassword />
          <Toaster />
          <PriorityToaster />
        </>,
      );
      await user.type(
        screen.getByRole("textbox", { name: "Email Address" }),
        "viewer@example.com",
      );
      await user.click(screen.getByRole("button", { name: "Send reset link" }));
      if (outcome === 503) {
        await waitFor(() => {
          expect(screen.getByText(failureMessage)).toBeVisible();
        });
        expect(screen.queryByText("Check your email")).not.toBeInTheDocument();
        expect(screen.queryByText("Server error")).not.toBeInTheDocument();
      } else {
        expect(
          await screen.findByRole("heading", {
            level: 1,
            name: "Check your email",
          }),
        ).toBeVisible();
        expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
        expect(screen.queryByText(failureMessage)).not.toBeInTheDocument();
      }
    },
  );
});

it("gives the reset form one page heading", () => {
  render(<ForgotPassword />);
  expect(
    screen.getByRole("heading", { level: 1, name: "Reset your password" }),
  ).toBeVisible();
  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
});
