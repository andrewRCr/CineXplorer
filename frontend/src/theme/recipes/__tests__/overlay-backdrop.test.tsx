import { Dialog, Drawer } from "@chakra-ui/react";
import { it } from "vitest";
import { render, screen } from "@tests/helpers/test-renderer";
import { expectResolvedColor, styleSystem } from "@tests/helpers/theme-styles";

function OpenDialog() {
  return (
    <Dialog.Root open>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content>
          <Dialog.Title>Notice</Dialog.Title>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}

function OpenDrawer() {
  return (
    <Drawer.Root open>
      <Drawer.Backdrop />
      <Drawer.Positioner>
        <Drawer.Content>
          <Drawer.Title>Notice</Drawer.Title>
        </Drawer.Content>
      </Drawer.Positioner>
    </Drawer.Root>
  );
}

it.each([
  ["dialog", OpenDialog],
  ["drawer", OpenDrawer],
] as const)(
  "draws the %s backdrop in the backdrop role",
  async (_name, Overlay) => {
    render(<Overlay />, { system: styleSystem });
    const dialog = await screen.findByRole("dialog", { name: "Notice" });
    // The backdrop is the positioner's preceding sibling and has no role or name.
    // eslint-disable-next-line testing-library/no-node-access
    const backdrop = dialog.parentElement?.previousElementSibling;
    if (!(backdrop instanceof HTMLElement)) throw new Error("Missing backdrop");
    expectResolvedColor(
      backdrop,
      "background-color",
      "var(--chakra-colors-backdrop)",
    );
  },
);
