import type { ReactElement } from "react";
import { Select, createListCollection } from "@chakra-ui/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import { render, screen, within } from "@tests/helpers/test-renderer";
import {
  expectResolvedColor,
  resolveTokenColor,
  styleSystem,
} from "@tests/helpers/theme-styles";

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

const options = createListCollection({ items: ["One", "Two", "Three"] });

function Picker() {
  return (
    <Select.Root collection={options} defaultValue={["Two"]}>
      <Select.Label>Pick</Select.Label>
      <Select.Control>
        <Select.Trigger>
          <Select.ValueText placeholder="Pick" />
        </Select.Trigger>
      </Select.Control>
      <Select.Positioner>
        <Select.Content>
          {options.items.map((item) => (
            <Select.Item key={item} item={item}>
              {item}
              <Select.ItemIndicator data-testid={`check-${item}`} />
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Positioner>
    </Select.Root>
  );
}

/** The two trigger border roles differ only in dark mode, so border tests render there. */
function renderDark(ui: ReactElement) {
  return render(<div className="dark">{ui}</div>, { system: styleSystem });
}

function expectDistinctBorderRoles(element: HTMLElement) {
  expect(
    resolveTokenColor(
      element,
      "border-color",
      "var(--chakra-colors-border-strong-02)",
    ),
  ).not.toBe(
    resolveTokenColor(
      element,
      "border-color",
      "var(--chakra-colors-border-strong-01)",
    ),
  );
}

async function openPicker({ dark = false } = {}) {
  const user = userEvent.setup();
  if (dark) renderDark(<Picker />);
  else render(<Picker />, { system: styleSystem });
  const trigger = screen.getByRole("combobox", { name: "Pick" });
  await user.click(trigger);
  const list = await screen.findByRole("listbox");
  return { user, trigger, list };
}

it("draws the resting trigger border in border-strong-01", () => {
  renderDark(<Field />);
  const trigger = screen.getByRole("combobox", { name: "Choice" });
  expectDistinctBorderRoles(trigger);
  expectResolvedColor(
    trigger,
    "border-color",
    "var(--chakra-colors-border-strong-01)",
  );
});

it("draws the open trigger's border in border-strong-02", async () => {
  const { trigger } = await openPicker({ dark: true });
  expect(trigger).toHaveAttribute("aria-expanded", "true");
  expectDistinctBorderRoles(trigger);
  expectResolvedColor(
    trigger,
    "border-color",
    "var(--chakra-colors-border-strong-02)",
  );
});

it("fills the highlighted option with tertiary and on-tertiary text", async () => {
  const { user, list } = await openPicker();
  await user.keyboard("{ArrowDown}");
  const highlighted = within(list)
    .getAllByRole("option")
    .find((option) => option.hasAttribute("data-highlighted"));
  if (!highlighted) throw new Error("No highlighted option");
  expectResolvedColor(
    highlighted,
    "background-color",
    "var(--chakra-colors-tertiary)",
  );
  expectResolvedColor(highlighted, "color", "var(--chakra-colors-on-tertiary)");
});

it("marks the chosen option with its check mark rather than a fill", async () => {
  const { user, list } = await openPicker();
  await user.keyboard("{ArrowDown}");
  const chosen = within(list).getByRole("option", { name: "Two" });
  expect(chosen).toHaveAttribute("aria-selected", "true");
  expect(chosen).not.toHaveAttribute("data-highlighted");
  expect(getComputedStyle(chosen).backgroundColor).toBe("rgba(0, 0, 0, 0)");
  expect(screen.getByTestId("check-Two")).toBeVisible();
  expect(screen.getByTestId("check-One")).not.toBeVisible();
});

it("gives placeholders the muted theme role globally", () => {
  expect(styleSystem.getGlobalCss()).toMatchObject({
    "&*::placeholder": { color: "var(--chakra-colors-on-muted)" },
  });
});
