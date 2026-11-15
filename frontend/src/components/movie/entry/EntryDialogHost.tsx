import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { Button, Dialog, IconButton, Portal } from "@chakra-ui/react";
import { LuX } from "react-icons/lu";
import {
  EntryDialogContext,
  type EntryDialogOptions,
} from "@/contexts/EntryDialogContext";

export function EntryDialogHost({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<EntryDialogOptions | null>(null);
  const [isOpen, setOpen] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  const fallback = useRef<EntryDialogOptions["returnFocus"]>(undefined);
  const open = useCallback((options: EntryDialogOptions) => {
    opener.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    fallback.current = options.returnFocus;
    setRequest(options);
    setOpen(true);
  }, []);
  const value = useMemo(() => ({ open }), [open]);
  return (
    <EntryDialogContext.Provider value={value}>
      {children}
      <Dialog.Root
        open={isOpen}
        onOpenChange={({ open }) => setOpen(open)}
        placement="center"
        size={{ mdDown: "full", md: "md" }}
        scrollBehavior="inside"
        finalFocusEl={() =>
          opener.current?.isConnected
            ? opener.current
            : (fallback.current?.() ?? null)
        }
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content
              maxW={{ base: "100dvw", md: "560px" }}
              bg="layer-01"
              color="foreground"
              aria-describedby={undefined}
            >
              <Dialog.Header>
                <Dialog.Title>
                  {request?.entry ? "Edit entry" : "Review or log"}
                </Dialog.Title>
              </Dialog.Header>
              <Dialog.Body />
              <Dialog.Footer>
                <Button variant="secondary" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
              </Dialog.Footer>
              <Dialog.CloseTrigger asChild>
                <IconButton aria-label="Close" variant="ghost">
                  <LuX />
                </IconButton>
              </Dialog.CloseTrigger>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </EntryDialogContext.Provider>
  );
}
