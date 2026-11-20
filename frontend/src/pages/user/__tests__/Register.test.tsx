import { afterEach, beforeEach, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw/http";
import { act, render, screen, waitFor } from "@tests/helpers/test-renderer";
import { authHandlers, clearBrowserAuth } from "@tests/helpers/auth";
import { server } from "@tests/mocks/server";
import { gate } from "@tests/helpers/web-locks";
import { apiBaseUrl } from "@/config/baseUrls";
import AuthContextProvider from "@/components/auth/AuthContextProvider";
import {
  PriorityToaster,
  priorityToaster,
} from "@/components/core/chakra/toaster";
import Register from "../Register";

beforeEach(() => {
  clearBrowserAuth();
  authHandlers();
});
afterEach(() => {
  act(() => {
    priorityToaster.remove();
  });
  clearBrowserAuth();
});

it("gives the registration form one visually hidden page heading", () => {
  render(<Register />);
  const heading = screen.getByRole("heading", {
    name: "Create an account",
    level: 1,
  });
  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  expect(getComputedStyle(heading).position).toBe("absolute");
  expect(getComputedStyle(heading).width).toBe("1px");
});

it("shows registration's progress on the button alone", async () => {
  const held = gate();
  server.use(
    http.post(`${apiBaseUrl}/register/`, async () => {
      await held.wait;
      return HttpResponse.json(
        { error: "That username is taken." },
        { status: 400 },
      );
    }),
  );
  const user = userEvent.setup();
  render(
    <>
      <AuthContextProvider>
        <Register />
      </AuthContextProvider>
      <PriorityToaster />
    </>,
  );
  await user.type(
    screen.getByLabelText("Email Address", { exact: true }),
    "viewer@example.com",
  );
  await user.type(
    screen.getByLabelText("CineXplorer Username", { exact: true }),
    "viewer",
  );
  await user.type(
    screen.getByLabelText("Password", { exact: true }),
    "Fresh-pass-42",
  );
  await user.click(screen.getByRole("button", { name: "Register" }));
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Registering..." }),
    ).toBeVisible(),
  );
  expect(screen.queryByText("Creating account...")).not.toBeInTheDocument();
  expect(priorityToaster.getVisibleToasts()).toHaveLength(0);
  held.release();
  expect(await screen.findByRole("alert")).toBeVisible();
});
