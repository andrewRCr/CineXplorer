import userEvent from "@testing-library/user-event";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw/http";
import { apiBaseUrl, siteOrigin } from "@/config/baseUrls";
import { setAuthTokens } from "@/utilities/tokenUtils";
import { ThemeSelectProvider } from "@/components/core/chakra/theme-provider";
import {
  PriorityToaster,
  priorityToaster,
} from "@/components/core/chakra/toaster";
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
  act(() => priorityToaster.remove());
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
        <PriorityToaster />
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

it("shows how to fix a refused GitHub sign-up and keeps the requested page", async () => {
  startAt("/login?error=signup_closed&error_process=login&next=%2Fwatchlist");

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "GitHub didn't share a verified primary email address, so we couldn't create your account. Verify one in your GitHub email settings and try again, or sign up with email.",
  );
  expect(window.location.pathname + window.location.search).toBe(
    "/login?next=%2Fwatchlist",
  );
});

it("shows the usual recovery message for a generic OAuth error", async () => {
  startAt("/login?error=oauth");

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Sign-in failed. Try again in a few minutes or choose Forgot password.",
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

describe("Login email links", () => {
  const home = { level: 2, name: "Popular in theaters" };
  const signInField = { name: "Username or Email Address" };

  function startSignedInAt(path: string) {
    homeHandlers();
    setAuthTokens(token());
    startAt(path);
  }

  function openLink(path: string) {
    act(() => {
      window.history.pushState(window.history.state, "", path);
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
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
    const user = userEvent.setup();
    const dialog = within(
      await screen.findByRole("dialog", { name: "Set New Password" }),
    );
    await user.type(dialog.getByLabelText("New Password"), "Fresh-pass-42");
    await user.type(dialog.getByLabelText("Confirm Password"), "Fresh-pass-42");
    await user.click(dialog.getByRole("button", { name: "Reset Password" }));

    await waitFor(() =>
      expect(screen.getByText("Password reset.")).toBeVisible(),
    );
    expect(dialog.getByText("Password reset successfully!")).toBeVisible();
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
