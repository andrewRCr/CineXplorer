import { useState } from "react";
import { Drawer, IconButton, Portal } from "@chakra-ui/react";
import { LuMenu, LuX } from "react-icons/lu";
import MainNavLinks from "./MainNavLinks";

export default function NavDrawer() {
  const [open, setOpen] = useState(false);
  return (
    <Drawer.Root
      open={open}
      onOpenChange={(details) => setOpen(details.open)}
      placement="start"
    >
      <Drawer.Trigger asChild>
        <IconButton
          aria-label="Open menu"
          size="sm"
          variant="ghost"
          color="foreground"
          flexShrink="0"
        >
          <LuMenu />
        </IconButton>
      </Drawer.Trigger>
      <Portal>
        <Drawer.Backdrop bg="backdrop" />
        <Drawer.Positioner>
          <Drawer.Content
            bg="background"
            color="foreground"
            borderRightWidth="1px"
            borderRightStyle="solid"
            borderColor="border-strong-01"
            w="80"
            maxW="calc(100vw - 2rem)"
          >
            <Drawer.Header
              bg="layer-01"
              borderBottomWidth="1px"
              borderBottomStyle="solid"
              borderColor="border-strong-01"
            >
              <Drawer.Title>Menu</Drawer.Title>
              <Drawer.CloseTrigger asChild position="static">
                <IconButton
                  aria-label="Close menu"
                  variant="ghost"
                  size="sm"
                  color="foreground"
                >
                  <LuX />
                </IconButton>
              </Drawer.CloseTrigger>
            </Drawer.Header>
            <Drawer.Body>
              <MainNavLinks
                direction="column"
                onNavigate={() => setOpen(false)}
              />
            </Drawer.Body>
          </Drawer.Content>
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>
  );
}
