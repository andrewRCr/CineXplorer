import { useRef } from "react";
import useAuthContext from "@/hooks/auth/useAuthContext";
import { useLogDialog } from "./useLogDialog";
import {
  Button,
  Drawer,
  IconButton,
  Portal,
  useBreakpointValue,
} from "@chakra-ui/react";
import { LuMenu, LuPlus, LuX } from "react-icons/lu";
import MainNavLinks from "./MainNavLinks";

export default function NavDrawer() {
  const auth = useAuthContext();
  const openLog = useLogDialog();
  const trigger = useRef<HTMLButtonElement>(null);
  // Reset portalled interaction state when its CSS-controlled row changes layout.
  const layout = useBreakpointValue(
    { base: "phone", lg: "wide" },
    { ssr: false },
  );
  return (
    <Drawer.Root key={layout} placement="start" unmountOnExit>
      <Drawer.Trigger asChild>
        <IconButton
          ref={trigger}
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
              <Drawer.Context>
                {(drawer) => (
                  <>
                    {auth?.status === "authenticated" && (
                      <Button
                        w="full"
                        mb="4"
                        onClick={() => {
                          drawer.setOpen(false);
                          openLog(() => trigger.current);
                        }}
                      >
                        <LuPlus />
                        Log a film
                      </Button>
                    )}
                    <MainNavLinks
                      direction="column"
                      onNavigate={() => drawer.setOpen(false)}
                    />
                  </>
                )}
              </Drawer.Context>
            </Drawer.Body>
          </Drawer.Content>
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>
  );
}
