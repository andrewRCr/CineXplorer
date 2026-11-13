import { useState } from "react";
import { it, expect } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen } from "@tests/helpers/test-renderer";
import { styleSystem, expectResolvedColor } from "@tests/helpers/theme-styles";
import { DEFAULT_BROWSE_PARAMS } from "@/constants/browseDefaults";
import ConnectedDropdowns from "../ConnectedDropdowns";

function Filters() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <ConnectedDropdowns
        filters={DEFAULT_BROWSE_PARAMS}
        onFiltersChange={() => undefined}
        onToggleAdvanced={() => setOpen((value) => !value)}
        isAdvancedOpen={open}
      />
      <section aria-label="Filter options" hidden={!open}>
        Options
      </section>
    </>
  );
}

it("names the advanced toggle and exposes the panel state", async () => {
  const user = userEvent.setup();
  render(<Filters />);
  const toggle = screen.getByRole("button", { name: "Advanced filters" });
  expect(toggle).toHaveAttribute("aria-expanded", "false");
  expect(
    screen.queryByRole("region", { name: "Filter options" }),
  ).not.toBeInTheDocument();
  await user.click(toggle);
  expect(toggle).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByRole("region", { name: "Filter options" })).toBeVisible();
  await user.click(toggle);
  expect(toggle).toHaveAttribute("aria-expanded", "false");
});

it("takes the button keyboard ring and keeps its outline border", async () => {
  const user = userEvent.setup();
  render(<Filters />, { system: styleSystem });
  await user.tab();
  await user.tab();
  await user.tab();
  const toggle = screen.getByRole("button");
  expect(toggle).toHaveFocus();
  expect(toggle).toHaveStyle({ outlineWidth: "2px", outlineStyle: "solid" });
  expectResolvedColor(toggle, "outline-color", "var(--chakra-colors-ring)");
  expectResolvedColor(
    toggle,
    "border-top-color",
    "var(--chakra-colors-button-outline)",
  );
});
