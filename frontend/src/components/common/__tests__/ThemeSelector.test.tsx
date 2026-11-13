import { beforeEach, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeSelector } from "@/components/common/ThemeSelector";
import { ThemeSelectProvider } from "@/components/core/chakra/theme-provider";

beforeEach(() => localStorage.clear());

it("shows the default theme's display label", async () => {
  render(
    <ThemeSelectProvider>
      <ThemeSelector />
    </ThemeSelectProvider>,
  );
  expect(await screen.findByRole("button", { name: "Marquee" })).toBeVisible();
});

it("lists theme labels in registry order", async () => {
  const user = userEvent.setup();
  render(
    <ThemeSelectProvider>
      <ThemeSelector />
    </ThemeSelectProvider>,
  );
  await user.click(await screen.findByRole("button"));
  const menu = await screen.findByRole("menu");
  expect(
    within(menu)
      .getAllByRole("menuitemradio")
      .map((item) => item.textContent),
  ).toEqual([
    "Marquee",
    "IBM Carbon",
    "GitHub Primer",
    "GitLab Pajamas",
    "Material Design 3",
  ]);
});

it("marks the current theme as the checked option", async () => {
  const user = userEvent.setup();
  render(
    <ThemeSelectProvider>
      <ThemeSelector />
    </ThemeSelectProvider>,
  );
  await user.click(await screen.findByRole("button", { name: "Marquee" }));
  const menu = await screen.findByRole("menu");
  expect(
    within(menu).getByRole("menuitemradio", { name: "Marquee" }),
  ).toHaveAttribute("aria-checked", "true");
  expect(
    within(menu).getByRole("menuitemradio", { name: "IBM Carbon" }),
  ).toHaveAttribute("aria-checked", "false");

  await user.click(
    within(menu).getByRole("menuitemradio", { name: "IBM Carbon" }),
  );
  await user.click(await screen.findByRole("button", { name: "IBM Carbon" }));
  const reopened = await screen.findByRole("menu");
  expect(
    within(reopened).getByRole("menuitemradio", { name: "IBM Carbon" }),
  ).toHaveAttribute("aria-checked", "true");
  expect(
    within(reopened).getByRole("menuitemradio", { name: "Marquee" }),
  ).toHaveAttribute("aria-checked", "false");
});
