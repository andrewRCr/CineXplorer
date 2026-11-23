import userEvent from "@testing-library/user-event";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw/http";
import { apiBaseUrl, siteOrigin } from "@/config/baseUrls";
import { setAuthTokens } from "@/utilities/tokenUtils";
import { ThemeSelectProvider } from "@/components/core/chakra/theme-provider";
import { TestProviders } from "@tests/helpers/test-providers";
import {
  authHandlers,
  clearBrowserAuth,
  profile,
  token,
} from "@tests/helpers/auth";
import { gate } from "@tests/helpers/web-locks";
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

function startPendingProviderReturn() {
  const response = gate();
  sessionStorage.setItem("oauth_in_progress", "google");
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
  return response;
}

it("offers password recovery when Google sign-in returns signed out", async () => {
  sessionStorage.setItem("oauth_in_progress", "google");
  server.use(
    http.get(`${siteOrigin}/_allauth/browser/v1/auth/session`, () =>
      HttpResponse.json(
        {
          status: 401,
          data: { flows: [{ id: "verify_email", is_pending: true }] },
          meta: { is_authenticated: false },
        },
        { status: 401 },
      ),
    ),
  );
  startAt("/login?next=%2Fwatchlist");

  expect(
    await screen.findByText(
      "You're still signed out. Try again in a few minutes or choose Forgot password.",
    ),
  ).toBeVisible();
  expect(
    screen.getByRole("link", { name: "Forgot password?" }),
  ).toHaveAttribute("href", "/forgot-password");
  expect(window.location.pathname + window.location.search).toBe(
    "/login?next=%2Fwatchlist",
  );
});

it.each([
  ["a server error", () => new HttpResponse(null, { status: 500 })],
  ["a network error", () => HttpResponse.error()],
] as const)(
  "does not infer a signed-out Google return from %s",
  async (_, respond) => {
    sessionStorage.setItem("oauth_in_progress", "google");
    server.use(
      http.get(`${siteOrigin}/_allauth/browser/v1/auth/session`, respond),
    );
    startAt("/login");

    await screen.findByRole("link", { name: "Sign in" });
    await screen.findByRole("textbox", { name: "Username or Email Address" });
    expect(
      screen.queryByText(/You're still signed out/),
    ).not.toBeInTheDocument();
    expect(window.location.search).toBe("");
  },
);

it("shows the normal Login form to a signed-out visitor arriving from Google Search", async () => {
  vi.spyOn(document, "referrer", "get").mockReturnValue(
    "https://www.google.com/",
  );
  server.use(
    http.get(`${siteOrigin}/_allauth/browser/v1/auth/session`, () =>
      HttpResponse.json(
        {
          status: 401,
          data: { flows: [{ id: "login" }] },
          meta: { is_authenticated: false },
        },
        { status: 401 },
      ),
    ),
  );
  startAt("/login");

  await screen.findByRole("link", { name: "Sign in" });
  await screen.findByRole("textbox", { name: "Username or Email Address" });
  expect(screen.queryByText(/You're still signed out/)).not.toBeInTheDocument();
  expect(window.location.search).toBe("");
});

it.each([
  ["verify", "Verify Your Email"],
  ["reset", "Set New Password"],
])(
  "keeps a Login %s link with a leftover Google sign-in marker",
  async (action, title) => {
    const address = `/login?${action}=fixture-email-key`;
    sessionStorage.setItem("oauth_in_progress", "google");
    startAt(address);

    await waitFor(() =>
      expect(sessionStorage.getItem("oauth_in_progress")).toBeNull(),
    );
    expect(window.location.pathname + window.location.search).toBe(address);
    expect(await screen.findByRole("dialog", { name: title })).toBeVisible();
  },
);

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

it.each([
  ["/privacy", "Privacy Policy"],
  ["/terms", "Terms of Service"],
])(
  "keeps the footer destination %s open when provider sign-in finishes",
  async (path, label) => {
    const user = userEvent.setup();
    sessionStorage.setItem("oauth_start_time", String(Date.now()));
    const response = startPendingProviderReturn();
    const title = `CineXplorer ${label}`;

    try {
      const footer = await screen.findByRole("contentinfo");
      await user.click(within(footer).getByRole("link", { name: label }));
      expect(
        await screen.findByRole("heading", { level: 1, name: title }),
      ).toBeVisible();
    } finally {
      response.release();
    }

    expect(
      await screen.findByRole("button", { name: profile.username }),
    ).toBeVisible();
    expect(window.location.pathname).toBe(path);
    expect(
      screen.getByRole("heading", { level: 1, name: title }),
    ).toBeVisible();
  },
);

it.each([
  ["/privacy", "Privacy Policy"],
  ["/terms", "Terms of Service"],
])(
  "keeps the browser at %s when provider sign-in finishes before the route commits",
  async (path, label) => {
    const response = startPendingProviderReturn();

    try {
      const footer = await screen.findByRole("contentinfo");
      expect(within(footer).getByRole("link", { name: label })).toHaveAttribute(
        "href",
        path,
      );
      // Advance browser history and let the provider reply before the router sees it.
      window.history.pushState(window.history.state, "", path);
    } finally {
      response.release();
    }

    expect(
      await screen.findByRole("button", { name: profile.username }),
    ).toBeVisible();
    expect(window.location.pathname).toBe(path);

    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: `CineXplorer ${label}`,
      }),
    ).toBeVisible();
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

it("opens the terms while signed out and follows its privacy link", async () => {
  const user = userEvent.setup();
  startAt("/terms");

  expect(
    await screen.findByRole("heading", {
      level: 1,
      name: "CineXplorer Terms of Service",
    }),
  ).toBeVisible();
  expect(new URL(document.URL).pathname).toBe("/terms");
  await user.click(
    within(screen.getByRole("main")).getByRole("link", {
      name: "Privacy Policy",
    }),
  );
  expect(
    await screen.findByRole("heading", {
      level: 1,
      name: "CineXplorer Privacy Policy",
    }),
  ).toBeVisible();
  expect(new URL(document.URL).pathname).toBe("/privacy");
});

it.each([
  ["/privacy", "CineXplorer Privacy Policy"],
  ["/Terms/", "CineXplorer Terms of Service"],
])(
  "keeps the legal page at %s open with an OAuth error query",
  async (path, title) => {
    const address = `${path}?error=oauth`;
    startAt(address);

    expect(
      await screen.findByRole("heading", { level: 1, name: title }),
    ).toBeVisible();
    expect(window.location.pathname + window.location.search).toBe(address);
  },
);
