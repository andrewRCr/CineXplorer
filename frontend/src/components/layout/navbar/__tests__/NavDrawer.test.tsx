import { render, screen, within, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw/http";
import { siteOrigin } from "@/config/baseUrls";
import AuthContextProvider from "@/components/auth/AuthContextProvider";
import { setAuthTokens } from "@/utilities/tokenUtils";
import { TestProviders } from "@tests/helpers/test-providers";
import { authHandlers, clearBrowserAuth, token } from "@tests/helpers/auth";
import { gate } from "@tests/helpers/web-locks";
import { server } from "@tests/mocks/server";
import { styleSystem, expectResolvedColor } from "@tests/helpers/theme-styles";
import NavDrawer from "../NavDrawer";

function Location() {
  const location = useLocation();
  return <output aria-label="Location">{location.pathname}</output>;
}
function renderDrawer() {
  return render(
    <TestProviders system={styleSystem}>
      <MemoryRouter initialEntries={["/browse/upcoming"]}>
        <AuthContextProvider>
          <NavDrawer />
          <Location />
        </AuthContextProvider>
      </MemoryRouter>
    </TestProviders>,
  );
}
beforeEach(() => {
  clearBrowserAuth();
  authHandlers();
});

it.each(["anonymous", "resolving", "authenticated"])(
  "shows the main links when %s",
  async (status) => {
    const user = userEvent.setup();
    const held = gate();
    if (status === "authenticated") setAuthTokens(token());
    if (status === "resolving")
      server.use(
        http.get(`${siteOrigin}/_allauth/browser/v1/auth/session`, async () => {
          await held.wait;
          return HttpResponse.json({ status: 401 }, { status: 401 });
        }),
      );
    renderDrawer();
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    const dialog = await screen.findByRole("dialog", {
      name: "Menu",
    });
    const nav = within(dialog).getByRole("navigation", { name: "Main" });
    expect(
      within(nav)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(status === "authenticated" ? ["Films", "Watchlist"] : ["Films"]);
    expect(within(nav).getByRole("link", { name: "Films" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    held.release();
    await user.keyboard("{Escape}");
  },
);

it.each(["Escape", "close button"])(
  "closes with %s and restores the trigger's focus",
  async (method) => {
    const user = userEvent.setup();
    renderDrawer();
    const trigger = screen.getByRole("button", { name: "Open menu" });
    await user.click(trigger);
    await screen.findByRole("dialog", { name: "Menu" });
    if (method === "Escape") await user.keyboard("{Escape}");
    else await user.click(screen.getByRole("button", { name: "Close menu" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(trigger).toHaveFocus());
  },
);

it("closes after a link opens its page", async () => {
  const user = userEvent.setup();
  renderDrawer();
  await user.click(screen.getByRole("button", { name: "Open menu" }));
  await user.click(await screen.findByRole("link", { name: "Films" }));
  expect(screen.getByLabelText("Location")).toHaveTextContent("/browse");
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
});

it("draws the panel, header, backdrop and keyboard link in theme roles", async () => {
  const user = userEvent.setup();
  renderDrawer();
  await user.click(screen.getByRole("button", { name: "Open menu" }));
  const dialog = await screen.findByRole("dialog", { name: "Menu" });
  expectResolvedColor(
    dialog,
    "background-color",
    "var(--chakra-colors-background)",
  );
  expectResolvedColor(
    dialog,
    "border-right-color",
    "var(--chakra-colors-border-strong-01)",
  );
  // The title's enclosing header and the dialog's portalled backdrop own these styles.
  const title = within(dialog).getByRole("heading", { name: "Menu" });
  // eslint-disable-next-line testing-library/no-node-access
  const header = title.parentElement;
  // eslint-disable-next-line testing-library/no-node-access
  const backdrop = dialog.parentElement?.previousElementSibling;
  if (!header || !(backdrop instanceof HTMLElement))
    throw new Error("Missing drawer surfaces");
  expectResolvedColor(
    header,
    "background-color",
    "var(--chakra-colors-layer-01)",
  );
  expectResolvedColor(
    header,
    "border-bottom-color",
    "var(--chakra-colors-border-strong-01)",
  );
  expectResolvedColor(
    backdrop,
    "background-color",
    "var(--chakra-colors-backdrop)",
  );
  const films = within(dialog).getByRole("link", { name: "Films" });
  expectResolvedColor(films, "color", "var(--chakra-colors-foreground)");
  await waitFor(() => expect(dialog).toHaveFocus());
  // jsdom has no layout. Supply rectangles for these rendered controls so the real focus trap sees them.
  const rect = new DOMRect(0, 0, 80, 32);
  const rects: DOMRectList = {
    0: rect,
    length: 1,
    item: (index) => (index === 0 ? rect : null),
    [Symbol.iterator]: () => [rect].values(),
  };
  for (const control of [
    films,
    within(dialog).getByRole("button", { name: "Close menu" }),
  ]) {
    vi.spyOn(control, "getClientRects").mockReturnValue(rects);
  }
  await user.tab();
  await user.tab();
  expect(films).toHaveFocus();
  expectResolvedColor(films, "outline-color", "var(--chakra-colors-ring)");
});
