import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import AuthContextProvider from "@/components/auth/AuthContextProvider";
import { setAuthTokens } from "@/utilities/tokenUtils";
import { siteOrigin } from "@/config/baseUrls";
import { TestProviders } from "@tests/helpers/test-providers";
import { styleSystem, expectResolvedColor } from "@tests/helpers/theme-styles";
import {
  authHandlers,
  clearBrowserAuth,
  profile,
  token,
} from "@tests/helpers/auth";
import { server } from "@tests/mocks/server";
import { gate } from "@tests/helpers/web-locks";
import NavBar from "../NavBar";
import WideNavBar from "../WideNavBar";
import MainNavLinks from "../MainNavLinks";

function renderBar(entry = "/browse", children = <WideNavBar />) {
  return render(
    <TestProviders system={styleSystem}>
      <MemoryRouter initialEntries={[entry]}>
        <AuthContextProvider>{children}</AuthContextProvider>
      </MemoryRouter>
    </TestProviders>,
  );
}
beforeEach(() => {
  clearBrowserAuth();
  authHandlers();
});

it("makes the bar the themed banner landmark", () => {
  renderBar("/", <NavBar />);
  const banner = screen.getByRole("banner");
  expectResolvedColor(
    banner,
    "background-color",
    "var(--chakra-colors-layer-01)",
  );
  expectResolvedColor(
    banner,
    "border-bottom-color",
    "var(--chakra-colors-border-strong-01)",
  );
  expect(getComputedStyle(banner).height).toBe("65px");
});

it("links the decorative logo and wordmark home without adding a heading", async () => {
  const user = userEvent.setup();
  renderBar();
  const wordmark = screen.getByRole("link", { name: "CineXplorer" });
  expect(wordmark).toHaveAttribute("href", "/");
  expect(within(wordmark).queryByRole("img")).not.toBeInTheDocument();
  expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  await user.tab();
  expect(wordmark).toHaveFocus();
  expectResolvedColor(wordmark, "outline-color", "var(--chakra-colors-ring)");
});

it.each(["anonymous", "resolving", "authenticated"])(
  "shows only routed links when %s",
  async (status) => {
    const held = gate();
    if (status === "authenticated") setAuthTokens(token());
    if (status === "resolving")
      server.use(
        http.get(`${siteOrigin}/_allauth/browser/v1/auth/session`, async () => {
          await held.wait;
          return HttpResponse.json({ status: 401 }, { status: 401 });
        }),
      );
    renderBar();
    if (status === "anonymous")
      await screen.findByRole("link", { name: "Sign in" });
    if (status === "authenticated")
      await screen.findByRole("button", { name: profile.username });
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(
      within(nav)
        .getAllByRole("link")
        .map((link) => [link.textContent, link.getAttribute("href")]),
    ).toEqual(
      status === "authenticated"
        ? [
            ["Films", "/browse"],
            ["Watchlist", "/watchlist"],
          ]
        : [["Films", "/browse"]],
    );
    for (const link of screen.getAllByRole("link"))
      expect([
        "/journal",
        "/library",
        "/log",
        "/settings",
        "/featured",
      ]).not.toContain(link.getAttribute("href"));
    held.release();
  },
);

it.each([
  "/browse",
  "/browse/now-playing",
  "/browse/upcoming",
  "/",
  "/search?query=x",
  "/movie/550",
  "/profile",
  "/login",
  "/watchlist",
  "/browse/sequential",
])("marks the current place on %s", async (entry) => {
  setAuthTokens(token());
  const user = userEvent.setup();
  renderBar(entry);
  await screen.findByRole("button", { name: profile.username });
  const films = screen.getByRole("link", { name: "Films" });
  const watchlist = screen.getByRole("link", { name: "Watchlist" });
  const isFilms = [
    "/browse",
    "/browse/now-playing",
    "/browse/upcoming",
  ].includes(entry);
  if (isFilms) expect(films).toHaveAttribute("aria-current", "page");
  else expect(films).not.toHaveAttribute("aria-current");
  if (entry === "/watchlist")
    expect(watchlist).toHaveAttribute("aria-current", "page");
  else expect(watchlist).not.toHaveAttribute("aria-current");
  expectResolvedColor(films, "color", "var(--chakra-colors-foreground)");
  if (isFilms)
    expectResolvedColor(
      films,
      "text-decoration-color",
      "var(--chakra-colors-tertiary)",
    );
  await user.tab();
  await user.tab();
  expect(films).toHaveFocus();
  expectResolvedColor(films, "outline-color", "var(--chakra-colors-ring)");
  expect(getComputedStyle(films).outlineWidth).toBe("2px");
  await user.tab();
  expect(watchlist).toHaveFocus();
  expectResolvedColor(watchlist, "outline-color", "var(--chakra-colors-ring)");
});

it("notifies the drawer when a navigation link is chosen", async () => {
  function Example() {
    const [closed, setClosed] = useState(false);
    return (
      <>
        <MainNavLinks onNavigate={() => setClosed(true)} />
        {closed && <p>Navigation closed</p>}
      </>
    );
  }
  const user = userEvent.setup();
  renderBar("/", <Example />);
  await user.click(screen.getByRole("link", { name: "Films" }));
  expect(screen.getByText("Navigation closed")).toBeVisible();
});
