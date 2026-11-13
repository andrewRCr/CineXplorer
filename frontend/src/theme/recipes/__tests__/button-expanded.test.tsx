import { Button } from "@chakra-ui/react";
import { expect, it } from "vitest";
import { render, screen } from "@tests/helpers/test-renderer";
import { expectResolvedColor, styleSystem } from "@tests/helpers/theme-styles";

it.each([
  ["solid", "var(--chakra-colors-primary-active)", "on-primary"],
  ["subtle", "var(--chakra-colors-secondary-hover)", "on-button-subtle"],
  [
    "outline",
    "color-mix(in srgb, var(--chakra-colors-primary) 12%, transparent)",
    "on-button-outline",
  ],
  ["ghost", null, "tertiary-active"],
] as const)(
  "keeps expanded %s buttons in their own pressed colors",
  (variant, background, text) => {
    render(
      <Button variant={variant} aria-expanded="true">
        Open
      </Button>,
      { system: styleSystem },
    );
    const button = screen.getByRole("button", { name: "Open" });
    if (background) expectResolvedColor(button, "background-color", background);
    else
      expect(getComputedStyle(button).backgroundColor).toMatch(
        /^(transparent|rgba\(0, 0, 0, 0\))$/,
      );
    expectResolvedColor(button, "color", `var(--chakra-colors-${text})`);
  },
);
