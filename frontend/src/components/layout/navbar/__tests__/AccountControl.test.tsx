import { MemoryRouter, useLocation } from "react-router";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it } from "vitest";
import { HttpResponse, http } from "msw/http";
import { apiBaseUrl, siteOrigin } from "@/config/baseUrls";
import { setAuthTokens } from "@/utilities/tokenUtils";
import { server } from "@tests/mocks/server";
import {
  authHandlers,
  clearBrowserAuth,
  profile,
  token,
} from "@tests/helpers/auth";
import { gate } from "@tests/helpers/web-locks";
import { TestProviders } from "@tests/helpers/test-providers";
import { styleSystem, expectResolvedColor } from "@tests/helpers/theme-styles";
import AuthContextProvider from "@/components/auth/AuthContextProvider";
import AccountControl from "../AccountControl";

function Location() {
  const location = useLocation();
  return (
    <output aria-label="Location">
      {location.pathname}
      {location.search}
    </output>
  );
}
function renderControl(entry = "/browse?genres=27") {
  return render(
    <TestProviders system={styleSystem}>
      <MemoryRouter initialEntries={[entry]}>
        <AuthContextProvider>
          <AccountControl />
          <Location />
        </AuthContextProvider>
      </MemoryRouter>
    </TestProviders>,
  );
}
beforeEach(() => {
  clearBrowserAuth();
  authHandlers();
  window.location.href = "http://localhost:3000/";
});

it("holds the account space until the session check settles", async () => {
  const held = gate();
  server.use(
    http.get(`${siteOrigin}/_allauth/browser/v1/auth/session`, async () => {
      await held.wait;
      return HttpResponse.json({
        meta: { is_authenticated: true },
        data: { user: profile },
      });
    }),
  );
  renderControl();
  expect(
    screen.queryByRole("link", { name: "Sign in" }),
  ).not.toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  held.release();
  expect(
    await screen.findByRole("button", { name: profile.username }),
  ).toBeVisible();
});

it("links signed-out visitors back to their current page with keyboard focus", async () => {
  const user = userEvent.setup();
  renderControl();
  const link = await screen.findByRole("link", { name: "Sign in" });
  expect(link).toHaveAttribute("href", "/login?next=%2Fbrowse%3Fgenres%3D27");
  await user.tab();
  expect(link).toHaveFocus();
  expectResolvedColor(link, "color", "var(--chakra-colors-foreground)");
  expectResolvedColor(link, "outline-color", "var(--chakra-colors-ring)");
});

it("opens a two-item keyboard menu and returns focus on Escape", async () => {
  const user = userEvent.setup();
  setAuthTokens(token());
  renderControl();
  const trigger = await screen.findByRole("button", { name: profile.username });
  expect(trigger).toHaveAttribute("aria-haspopup", "menu");
  expect(trigger).toHaveAttribute("aria-expanded", "false");
  expectResolvedColor(trigger, "color", "var(--chakra-colors-foreground)");
  const name = screen.getByText(profile.username);
  // Computed lengths resolve rem against this document's root font size.
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
  expect(getComputedStyle(name).maxWidth).toBe(`${12 * rem}px`);
  expect(getComputedStyle(name).whiteSpace).toBe("nowrap");
  expect(getComputedStyle(name).overflow).toBe("hidden");
  expect(getComputedStyle(name).textOverflow).toBe("ellipsis");
  // The decorative avatar is outside the accessibility tree; inspect its rendered colors through the trigger.
  // eslint-disable-next-line testing-library/no-node-access
  const avatar = trigger.lastElementChild;
  if (!(avatar instanceof HTMLElement)) throw new Error("Missing avatar");
  expectResolvedColor(avatar, "color", "var(--chakra-colors-foreground)");
  expectResolvedColor(
    avatar,
    "background-color",
    "var(--chakra-colors-layer-02)",
  );
  await user.click(trigger);
  const menu = await screen.findByRole("menu");
  expect(trigger).toHaveAttribute("aria-expanded", "true");
  expect(
    within(menu)
      .getAllByRole("menuitem")
      .map((item) => item.textContent),
  ).toEqual(["Profile", "Sign out"]);
  expectResolvedColor(menu, "background-color", "var(--chakra-colors-popover)");
  expectResolvedColor(
    menu,
    "border-color",
    "var(--chakra-colors-border-subtle-02)",
  );
  expect(getComputedStyle(menu).borderWidth).toBe("1px");
  expectResolvedColor(
    within(menu).getByRole("menuitem", { name: "Sign out" }),
    "color",
    "var(--chakra-colors-on-popover)",
  );
  await user.keyboard("{ArrowDown}");
  expect(menu).toHaveFocus();
  const highlighted = within(menu)
    .getAllByRole("menuitem")
    .find((item) => item.hasAttribute("data-highlighted"));
  if (!highlighted) throw new Error("No highlighted menu item");
  expectResolvedColor(
    highlighted,
    "background-color",
    "var(--chakra-colors-tertiary)",
  );
  expectResolvedColor(highlighted, "color", "var(--chakra-colors-on-tertiary)");
  await user.keyboard("{Escape}");
  await waitFor(() =>
    expect(screen.queryByRole("menu")).not.toBeInTheDocument(),
  );
  expect(trigger).toHaveFocus();
});

it("closes the menu when Profile opens", async () => {
  const user = userEvent.setup();
  setAuthTokens(token());
  renderControl();
  await user.click(
    await screen.findByRole("button", { name: profile.username }),
  );
  await user.click(await screen.findByRole("menuitem", { name: "Profile" }));
  expect(screen.getByLabelText("Location")).toHaveTextContent("/profile");
  await waitFor(() =>
    expect(screen.queryByRole("menu")).not.toBeInTheDocument(),
  );
});

it("posts sign out, closes the menu and lets sign-out choose Login", async () => {
  const user = userEvent.setup();
  let signedOut = false;
  server.use(
    http.post(`${apiBaseUrl}/logout/`, () => {
      signedOut = true;
      return HttpResponse.json({ message: "Logged out" });
    }),
  );
  setAuthTokens(token());
  renderControl();
  await user.click(
    await screen.findByRole("button", { name: profile.username }),
  );
  await user.click(await screen.findByRole("menuitem", { name: "Sign out" }));
  await waitFor(() => expect(signedOut).toBe(true));
  expect(await screen.findByRole("link", { name: "Sign in" })).toBeVisible();
  expect(screen.getByLabelText("Location")).toHaveTextContent(/^\/login$/);
  await waitFor(() =>
    expect(window.location.href).toBe("/login?signed_out=true"),
  );
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
});
