import type { RefObject } from "react";
import { Button } from "@chakra-ui/react";
import { useOutletContext } from "react-router";
import { useEntryDialog } from "@/hooks/movie/useEntryDialog";

export function LibraryLogButton() {
  const currentLink =
    useOutletContext<RefObject<HTMLAnchorElement | null> | null>();
  const { open } = useEntryDialog();
  return (
    <Button
      variant="subtle"
      onClick={() =>
        open({
          dateOn: true,
          filmChangeable: true,
          returnFocus: () => currentLink?.current ?? null,
          preferReturnFocus: true,
        })
      }
    >
      Log a film
    </Button>
  );
}
