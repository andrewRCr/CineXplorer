import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
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
import { getChangeCount, getSaveSignal } from "@/lib/session";

interface Opening {
  options: EntryDialogOptions;
  id: number;
  owner: number;
  signal: AbortSignal;
}

export function EntryDialogHost({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const location = useLocation();
  const [routeKey, setRouteKey] = useState(location.key);
  const [request, setRequest] = useState<Opening | null>(null);
  const [isOpen, setOpen] = useState(false);
  const [reviewDirty, setReviewDirty] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const sequence = useRef(0);
  const active = useRef<Opening | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const fallback = useRef<EntryDialogOptions["returnFocus"]>(undefined);
  useLayoutEffect(() => {
    if (!request) return;
    const retire = () => {
      if (active.current !== request) return;
      active.current = null;
      opener.current = null;
      fallback.current = undefined;
      setRequest(null);
      setOpen(false);
      setReviewDirty(false);
      setDiscardOpen(false);
    };
    if (request.owner !== getChangeCount() || request.signal.aborted) {
      retire();
      return;
    }
    request.signal.addEventListener("abort", retire, { once: true });
    return () => request.signal.removeEventListener("abort", retire);
  }, [request]);
  // Navigation closes the old draft before rendering the destination, including history traversal.
  if (routeKey !== location.key) {
    setRouteKey(location.key);
    setOpen(false);
    setDiscardOpen(false);
  }
  const open = useCallback((options: EntryDialogOptions) => {
    const owner = getChangeCount();
    const opening = {
      options,
      owner,
      signal: getSaveSignal(owner),
      id: ++sequence.current,
    };
    active.current = opening;
    opener.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    fallback.current = options.returnFocus;
    setRequest(opening);
    setReviewDirty(false);
    setDiscardOpen(false);
    setOpen(true);
  }, []);
  const value = useMemo(() => ({ open }), [open]);
  const owns = useCallback(
    (opening: Opening | null) =>
      opening !== null &&
      active.current === opening &&
      opening.owner === getChangeCount(),
    [],
  );
  const reviewChanged = useCallback(
    (dirty: boolean) => {
      if (owns(request)) setReviewDirty(dirty);
    },
    [owns, request],
  );
  const requestClose = () => {
    if (!owns(request)) return;
    if (reviewDirty) setDiscardOpen(true);
    else setOpen(false);
  };
  const saved = (result: EntrySavedResult, opening: Opening) => {
    if (opening.owner !== getChangeCount()) return;
    if (owns(opening)) {
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
        restoreFocus={request !== null && request.owner === getChangeCount()}
        finalFocusEl={() => {
          if (!owns(request)) return null;
          if (request?.options.preferReturnFocus) {
            const target = fallback.current?.();
            return target?.isConnected
              ? target
              : opener.current?.isConnected
                ? opener.current
                : null;
          }
          return opener.current?.isConnected
            ? opener.current
            : (fallback.current?.() ?? null);
        }}
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
                    owner={request.owner}
                    onSaved={(result) => saved(result, request)}
                    onCancel={requestClose}
                    onReviewDirtyChange={reviewChanged}
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
        onOpenChange={({ open }) => {
          if (owns(request)) setDiscardOpen(open);
        }}
        restoreFocus={request !== null && request.owner === getChangeCount()}
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
                  onClick={() => {
                    if (owns(request)) setDiscardOpen(false);
                  }}
                >
                  Keep editing
                </Button>
                <Button
                  onClick={() => {
                    if (!owns(request)) return;
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
