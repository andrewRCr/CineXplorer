import { Button, Menu } from "@chakra-ui/react";
import userEvent from "@testing-library/user-event";
import { it } from "vitest";
import { render, screen, within } from "@tests/helpers/test-renderer";
import { expectResolvedColor, styleSystem } from "@tests/helpers/theme-styles";

it("fills the highlighted menu item with tertiary and on-tertiary text", async () => {
  const user = userEvent.setup();
  render(
    <Menu.Root>
      <Menu.Trigger asChild>
        <Button>Actions</Button>
      </Menu.Trigger>
      <Menu.Positioner>
        <Menu.Content>
          <Menu.Item value="rename">Rename</Menu.Item>
          <Menu.Item value="archive">Archive</Menu.Item>
        </Menu.Content>
      </Menu.Positioner>
    </Menu.Root>,
    { system: styleSystem },
  );
  await user.click(screen.getByRole("button", { name: "Actions" }));
  const menu = await screen.findByRole("menu");
  await user.keyboard("{ArrowDown}");
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
});
