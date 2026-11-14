import { beforeEach, it, expect } from "vitest";
import { render, screen, within } from "@tests/helpers/test-renderer";
import { http, HttpResponse } from "msw/http";
import { server } from "@tests/mocks/server";
import { apiBaseUrl, siteOrigin } from "@/config/baseUrls";
import { authHandlers, clearBrowserAuth, token } from "@tests/helpers/auth";
import { setAuthTokens } from "@/utilities/tokenUtils";
import { gate } from "@tests/helpers/web-locks";
import AuthContextProvider from "@/components/auth/AuthContextProvider";
import Home from "@/pages/home/Home";
import { homeHandlers } from "./homeFixtures";

beforeEach(() => {
  clearBrowserAuth();
  authHandlers();
  homeHandlers();
});
it("holds the loading state without a headline while the session resolves", () => {
  const pending = gate();
  server.use(
    http.get(`${siteOrigin}/_allauth/browser/v1/auth/session`, async () => {
      await pending.wait;
      return HttpResponse.json({}, { status: 401 });
    }),
  );
  render(
    <AuthContextProvider>
      <Home />
    </AuthContextProvider>,
  );
  expect(screen.getByText("Loading...")).toBeInTheDocument();
  expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
  pending.release();
});
it("composes signed-out Home in order with named sections and no card actions", async () => {
  render(
    <AuthContextProvider>
      <Home />
    </AuthContextProvider>,
  );
  await screen.findByRole("heading", {
    level: 1,
    name: "Track the films you watch. Find the next one.",
  });
  await screen.findByText("Opening soon");
  expect(
    screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent),
  ).toEqual(["Popular in theaters", "Most anticipated", "What you can do"]);
  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  expect(
    screen
      .getAllByRole("link", { name: "See all" })
      .map((link) => link.getAttribute("href")),
  ).toEqual(["/browse/now-playing", "/browse/upcoming"]);
  const row = screen.getByRole("region", { name: "Popular in theaters" });
  expect(
    within(row).queryByRole("button", { name: "Add to watchlist" }),
  ).not.toBeInTheDocument();
});
it("shows signed-in Home without the hero", async () => {
  setAuthTokens(token());
  render(
    <AuthContextProvider>
      <Home />
    </AuthContextProvider>,
  );
  expect(
    await screen.findByRole("heading", {
      level: 1,
      name: "Home",
      hidden: true,
    }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Popular in theaters" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByText("Track the films you watch. Find the next one."),
  ).not.toBeInTheDocument();
});
it("switches a rejected stored sign-in to the pitch", async () => {
  setAuthTokens(token());
  server.use(
    http.get(`${apiBaseUrl}/profile/`, () =>
      HttpResponse.json({ detail: "Unavailable" }, { status: 500 }),
    ),
  );
  render(
    <AuthContextProvider>
      <Home />
    </AuthContextProvider>,
  );
  expect(
    await screen.findByRole("heading", {
      name: "Track the films you watch. Find the next one.",
    }),
  ).toBeInTheDocument();
});
