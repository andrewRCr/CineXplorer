import userEvent from "@testing-library/user-event";
import { render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw/http";
import { apiBaseUrl } from "@/config/baseUrls";
import { setAuthTokens } from "@/utilities/tokenUtils";
import { ThemeSelectProvider } from "@/components/core/chakra/theme-provider";
import { TestProviders } from "@tests/helpers/test-providers";
import {
  authHandlers,
  clearBrowserAuth,
  profile,
  token,
} from "@tests/helpers/auth";
import { server } from "@tests/mocks/server";
import App from "../App";
import { homeHandlers } from "@/pages/home/__tests__/homeFixtures";

declare const jsdom: { window: Window };
const mockLocation = window.location;

beforeEach(() => {
  // BrowserRouter needs history writes to update the location it reads.
  Object.defineProperty(window, "location", {
    value: jsdom.window.location,
    writable: true,
  });
  clearBrowserAuth();
  authHandlers();
  vi.spyOn(console, "error").mockImplementation(() => {});
  server.use(
    http.post(`${apiBaseUrl}/logs/`, () =>
      HttpResponse.json({ success: true }),
    ),
  );
});
afterEach(() => {
  delete window.__dismissPreloadOverlay;
  window.history.replaceState({}, "", "/");
  Object.defineProperty(window, "location", {
    value: mockLocation,
    writable: true,
  });
});
function startAt(path: string) {
  // The test environment supplies a writable location; keep its path aligned with browser history.
  window.history.replaceState({}, "", path);
  return render(
    <ThemeSelectProvider>
      <TestProviders>
        <App />
      </TestProviders>
    </ThemeSelectProvider>,
  );
}

it("contains a shell failure in the last-resort full-page display", async () => {
  window.__dismissPreloadOverlay = () => {
    throw new Error("Shell failed");
  };
  startAt("/login");
  expect(
    await screen.findByRole("heading", { name: "Oops! Something went wrong" }),
  ).toBeVisible();
  expect(screen.queryByRole("banner")).not.toBeInTheDocument();
  expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
});

it("loads the protected development page with a page-level fallback", async () => {
  setAuthTokens(token());
  startAt("/testlogin");
  expect(screen.getByText("Loading...")).toBeVisible();
  expect(screen.queryByRole("banner")).not.toBeInTheDocument();
  expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
  expect(
    await screen.findByRole("button", { name: "Get User Details" }),
  ).toBeVisible();
});

it("returns from sign-in to the Library with its filters", async () => {
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
  startAt("/library?liked=true");
  await screen.findByRole("textbox", { name: "Username or Email Address" });
  await waitFor(() =>
    expect(new URL(document.URL).pathname + new URL(document.URL).search).toBe(
      "/login?next=%2Flibrary%3Fliked%3Dtrue",
    ),
  );
  await user.type(
    screen.getByRole("textbox", { name: "Username or Email Address" }),
    "viewer",
  );
  await user.type(screen.getByLabelText("Password"), "testpass123");
  await user.click(screen.getByRole("button", { name: "Login" }));
  expect(
    await screen.findByRole("heading", { level: 1, name: "Library" }),
  ).toBeVisible();
  expect(new URL(document.URL).pathname + new URL(document.URL).search).toBe(
    "/library?liked=true",
  );
});

it("renders the watchlist on its own address", async () => {
  setAuthTokens(token());
  startAt("/watchlist");
  expect(
    await screen.findByRole("heading", { level: 1, name: "Watchlist" }),
  ).toBeVisible();
  expect(new URL(document.URL).pathname).toBe("/watchlist");
});

it("shows Not Found for an unknown Library address", async () => {
  setAuthTokens(token());
  startAt("/library/anything");
  expect(
    await screen.findByRole("heading", { name: /not found/i }),
  ).toBeVisible();
});

it.each(["/library", "/library/history", "/library?liked=true&sort=title"])(
  "renders the Library heading and navigation at %s",
  async (path) => {
    setAuthTokens(token());
    startAt(path);
    expect(
      await screen.findByRole("heading", { level: 1, name: "Library" }),
    ).toBeVisible();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    const nav = screen.getByRole("navigation", { name: "Library" });
    const links = within(nav).getAllByRole("link");
    expect(
      links.map((link) => [link.textContent, link.getAttribute("href")]),
    ).toEqual([
      ["Films", "/library"],
      ["History", "/library/history"],
    ]);
    for (const link of links) {
      if (link.getAttribute("href") === path.split("?")[0])
        expect(link).toHaveAttribute("aria-current", "page");
      else expect(link).not.toHaveAttribute("aria-current");
    }
  },
);

it("serves Home's pitch at the root route", async () => {
  homeHandlers();
  startAt("/");
  expect(
    await screen.findByRole("heading", {
      level: 1,
      name: "Track what you watch. Find what's next.",
    }),
  ).toBeVisible();
});

it("opens the privacy policy in the app layout while signed out", async () => {
  startAt("/privacy");

  expect(
    await screen.findByRole("heading", {
      level: 1,
      name: "CineXplorer Privacy Policy",
    }),
  ).toBeVisible();
  expect(screen.getByRole("banner")).toBeVisible();
  expect(screen.getByRole("contentinfo")).toBeVisible();
  expect(new URL(document.URL).pathname).toBe("/privacy");
});
