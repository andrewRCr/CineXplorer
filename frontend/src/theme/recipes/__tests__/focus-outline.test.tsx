import { Button, Checkbox, Switch } from "@chakra-ui/react";
import userEvent from "@testing-library/user-event";
import { it, expect } from "vitest";
import { render, screen } from "@tests/helpers/test-renderer";
import { styleSystem, expectResolvedColor } from "@tests/helpers/theme-styles";

function expectRing(control: HTMLElement) {
  expect(getComputedStyle(control).outlineWidth).toBe("2px");
  expect(getComputedStyle(control).outlineStyle).toBe("solid");
  expectResolvedColor(control, "outline-color", "var(--chakra-colors-ring)");
}

it.each(["solid", "secondary", "outline", "subtle", "ghost"] as const)(
  "draws the %s button's keyboard outline in ring",
  async (variant) => {
    const user = userEvent.setup();
    render(
      <Button variant={variant} color="foreground">
        Action
      </Button>,
      { system: styleSystem },
    );
    await user.tab();
    const button = screen.getByRole("button", { name: "Action" });
    expect(button).toHaveFocus();
    expectRing(button);
  },
);

it.each(["solid", "outline"] as const)(
  "draws the %s checkbox's keyboard outline in ring",
  async (variant) => {
    const user = userEvent.setup();
    render(
      <Checkbox.Root variant={variant} color="foreground">
        <Checkbox.HiddenInput />
        <Checkbox.Control color="foreground">
          <Checkbox.Indicator />
        </Checkbox.Control>
        <Checkbox.Label>Choice</Checkbox.Label>
      </Checkbox.Root>,
      { system: styleSystem },
    );
    await user.tab();
    const input = screen.getByRole("checkbox", { name: "Choice" });
    expect(input).toHaveFocus();
    // The hidden native input owns focus; its sibling control draws the outline.
    // eslint-disable-next-line testing-library/no-node-access
    const control = input.nextElementSibling;
    if (!(control instanceof HTMLElement))
      throw new Error("Missing checkbox control");
    expectRing(control);
  },
);

it("draws the switch's keyboard outline in ring", async () => {
  const user = userEvent.setup();
  render(
    <Switch.Root color="foreground">
      <Switch.HiddenInput />
      <Switch.Control color="foreground">
        <Switch.Thumb />
      </Switch.Control>
      <Switch.Label>Enabled</Switch.Label>
    </Switch.Root>,
    { system: styleSystem },
  );
  await user.tab();
  const input = screen.getByRole("checkbox", { name: "Enabled" });
  expect(input).toHaveFocus();
  // The hidden native input owns focus; its sibling track draws the outline.
  // eslint-disable-next-line testing-library/no-node-access
  const control = input.nextElementSibling;
  if (!(control instanceof HTMLElement))
    throw new Error("Missing switch control");
  expectRing(control);
});
