import { Select, createListCollection } from "@chakra-ui/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import { render, screen } from "@tests/helpers/test-renderer";
import { expectResolvedColor, styleSystem } from "@tests/helpers/theme-styles";

const collection = createListCollection({ items: ["One", "Two"] });

function Field({ disabled = false }) {
  return (
    <Select.Root collection={collection} disabled={disabled}>
      <Select.Label>Choice</Select.Label>
      <Select.Control>
        <Select.Trigger>
          <Select.ValueText placeholder="Choose" />
        </Select.Trigger>
        <Select.Indicator aria-label="Dropdown arrow" />
      </Select.Control>
    </Select.Root>
  );
}

it.each([false, true])(
  "uses the theme's select indicator color (disabled=%s)",
  (disabled) => {
    render(<Field disabled={disabled} />, { system: styleSystem });
    expectResolvedColor(
      screen.getByLabelText("Dropdown arrow"),
      "color",
      `var(--chakra-colors-${disabled ? "on-muted" : "foreground"})`,
    );
  },
);

it("marks keyboard focus on the select border alone", async () => {
  const user = userEvent.setup();
  render(<Field />, { system: styleSystem });
  await user.tab();
  const trigger = screen.getByRole("combobox", { name: "Choice" });
  expect(trigger).toHaveFocus();
  expectResolvedColor(trigger, "border-color", "var(--chakra-colors-tertiary)");
  expect(getComputedStyle(trigger).outlineStyle).toBe("none");
});

it("gives placeholders the muted theme role globally", () => {
  expect(styleSystem.getGlobalCss()).toMatchObject({
    "&*::placeholder": { color: "var(--chakra-colors-on-muted)" },
  });
});
