import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "@/components/core/chakra/provider";
import { ColorModeButton } from "@/components/core/chakra/color-mode";
import { ThemeSelector } from "@/components/common/ThemeSelector";

vi.unmock("next-themes");

const originalHtmlStyle = document.documentElement.style.cssText;
const originalBodyStyle = document.body.style.cssText;
const originalClass = document.documentElement.className;

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("theme", "dark");
  document.documentElement.style.setProperty("--app-bg", "#110E0A");
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.style.cssText = originalHtmlStyle;
  document.body.style.cssText = originalBodyStyle;
  document.documentElement.className = originalClass;
});

it("updates the page background variable when the color mode changes", async () => {
  const user = userEvent.setup();
  render(
    <Provider defaultTheme="dark" enableSystem={false}>
      <ColorModeButton />
    </Provider>,
  );
  await user.click(
    await screen.findByRole("button", { name: "Toggle color mode" }),
  );
  await waitFor(() => {
    expect(localStorage.getItem("cinexplorer-bg")).toBe("#F2E8CE");
    expect(
      getComputedStyle(document.documentElement).getPropertyValue("--app-bg"),
    ).toBe("#F2E8CE");
  });
});

it("updates the page background variable when the palette changes", async () => {
  const user = userEvent.setup();
  render(
    <Provider defaultTheme="dark" enableSystem={false}>
      <ThemeSelector />
    </Provider>,
  );
  await user.click(await screen.findByRole("button", { name: "Marquee" }));
  const menu = await screen.findByRole("menu");
  await user.click(
    within(menu).getByRole("menuitemradio", { name: "GitHub Primer" }),
  );
  await waitFor(() => {
    expect(localStorage.getItem("cinexplorer-bg")).toBe("#0d1117");
    expect(
      getComputedStyle(document.documentElement).getPropertyValue("--app-bg"),
    ).toBe("#0d1117");
  });
});
