import { Button, Dialog, Portal } from "@chakra-ui/react";

interface DeleteEntryConfirmationProps {
  open: boolean;
  busy: boolean;
  restoreFocus: boolean;
  finalFocusEl: () => HTMLElement | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteEntryConfirmation({
  open,
  busy,
  restoreFocus,
  finalFocusEl,
  onCancel,
  onConfirm,
}: DeleteEntryConfirmationProps) {
  return (
    <Dialog.Root
      role="alertdialog"
      open={open}
      placement="center"
      size="sm"
      closeOnEscape={!busy}
      closeOnInteractOutside={!busy}
      restoreFocus={restoreFocus}
      finalFocusEl={finalFocusEl}
      onOpenChange={({ open: next }) => {
        if (!next && !busy) onCancel();
      }}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content bg="layer-01" color="foreground">
            <Dialog.Header>
              <Dialog.Title>Delete this entry?</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Dialog.Description>
                This removes its date, rating and review. Watched and your
                current rating stay as they are.
              </Dialog.Description>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="outline" disabled={busy} onClick={onCancel}>
                Cancel
              </Button>
              <Button
                variant="solid"
                loading={busy}
                disabled={busy}
                onClick={onConfirm}
              >
                Delete
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
