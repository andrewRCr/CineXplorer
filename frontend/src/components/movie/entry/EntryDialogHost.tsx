import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Dialog, IconButton, Portal } from "@chakra-ui/react";
import { LuX } from "react-icons/lu";
import {
  EntryDialogContext,
  type EntryDialogOptions,
} from "@/contexts/EntryDialogContext";
import { EntryForm, type EntrySavedResult } from "./EntryForm";
import { showEntryFeedback } from "./entryDialogFeedback";

export function EntryDialogHost({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const location = useLocation();
  const [routeKey, setRouteKey] = useState(location.key);
  const [request, setRequest] = useState<{
    options: EntryDialogOptions;
    id: number;
  } | null>(null);
  const [isOpen, setOpen] = useState(false);
  const [reviewDirty, setReviewDirty] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const sequence = useRef(0);
  const opener = useRef<HTMLElement | null>(null);
  const fallback = useRef<EntryDialogOptions["returnFocus"]>(undefined);
  // Navigation closes the old draft before rendering the destination, including history traversal.
  if (routeKey !== location.key) {
    setRouteKey(location.key);
    setOpen(false);
    setDiscardOpen(false);
  }
  const open = useCallback((options: EntryDialogOptions) => {
    opener.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    fallback.current = options.returnFocus;
    setRequest({ options, id: ++sequence.current });
    setReviewDirty(false);
    setDiscardOpen(false);
    setOpen(true);
  }, []);
  const value = useMemo(() => ({ open }), [open]);
  const requestClose = () => {
    if (reviewDirty) setDiscardOpen(true);
    else setOpen(false);
  };
  const saved = (result: EntrySavedResult, opening: number) => {
    if (opening === sequence.current) {
      setReviewDirty(false);
      setDiscardOpen(false);
      setOpen(false);
    }
    showEntryFeedback(client, result);
  };
  return (
    <EntryDialogContext.Provider value={value}>
      {children}
      <Dialog.Root
        open={isOpen}
        onOpenChange={({ open }) => {
          if (!open) requestClose();
        }}
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
                  {request?.options.entry ? "Edit entry" : "Review or log"}
                </Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                {isOpen && request && (
                  <EntryForm
                    key={request.id}
                    {...request.options}
                    onSaved={(result) => saved(result, request.id)}
                    onCancel={requestClose}
                    onReviewDirtyChange={setReviewDirty}
                  />
                )}
              </Dialog.Body>
              <Dialog.CloseTrigger asChild>
                <IconButton aria-label="Close" variant="ghost">
                  <LuX />
                </IconButton>
              </Dialog.CloseTrigger>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
      <Dialog.Root
        role="alertdialog"
        open={discardOpen}
        onOpenChange={({ open }) => setDiscardOpen(open)}
        placement="center"
        size="sm"
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content bg="layer-01" color="foreground">
              <Dialog.Header>
                <Dialog.Title>Discard your review?</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Dialog.Description>
                  Your changes to this review will be lost.
                </Dialog.Description>
              </Dialog.Body>
              <Dialog.Footer>
                <Button
                  variant="secondary"
                  onClick={() => setDiscardOpen(false)}
                >
                  Keep editing
                </Button>
                <Button
                  onClick={() => {
                    setDiscardOpen(false);
                    setReviewDirty(false);
                    setOpen(false);
                  }}
                >
                  Discard
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </EntryDialogContext.Provider>
  );
}
