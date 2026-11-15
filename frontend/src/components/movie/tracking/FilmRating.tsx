import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Drawer,
  HStack,
  Portal,
  RatingGroup,
  Text,
  useBreakpointValue,
} from "@chakra-ui/react";
import { RatingStars } from "@/components/movie/RatingStars";
import type { AuthStatus } from "@/types/auth-state";
import { getChangeCount } from "@/lib/session";

interface FilmRatingProps {
  tmdbId: number;
  rating: number | null;
  status: AuthStatus | undefined;
  allowAction: () => boolean;
  onSave: (rating: number | null) => void;
}
interface PendingRating {
  value: number;
  tmdbId: number;
  change: number;
}
const RATING_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
  " ",
]);

export function FilmRating(props: FilmRatingProps) {
  // Identity changes discard local input and its timer before another film or user can reuse it.
  return (
    <RatingControl
      key={`${props.tmdbId}:${props.status}:${getChangeCount()}`}
      {...props}
    />
  );
}

function RatingControl(props: FilmRatingProps) {
  const { tmdbId, rating, status, allowAction } = props;
  const authenticated = status === "authenticated";
  const wide = useBreakpointValue({ base: false, md: true }, { ssr: false });
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const [preview, setPreview] = useState<number | null>(null);
  const pending = useRef<PendingRating | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mode = useRef<"pointer" | "keyboard">("pointer");
  const latest = useRef(props);
  useLayoutEffect(() => {
    latest.current = props;
  }, [props]);
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      pending.current = null;
    },
    [],
  );

  const discard = () => {
    clearTimeout(timer.current);
    timer.current = undefined;
    pending.current = null;
    setPreview(null);
  };
  const flush = () => {
    const next = pending.current;
    discard();
    if (
      !next ||
      next.change !== getChangeCount() ||
      next.tmdbId !== latest.current.tmdbId ||
      latest.current.status !== "authenticated"
    )
      return;
    latest.current.onSave(next.value > 0 ? next.value * 2 : null);
  };
  const value = authenticated ? (preview ?? (rating ?? 0) / 2) : 0;
  const controls = (
    <Box
      onBlur={(event) => {
        if (
          !(event.relatedTarget instanceof Node) ||
          !event.currentTarget.contains(event.relatedTarget)
        )
          flush();
      }}
    >
      <HStack align="end" wrap="wrap">
        <RatingGroup.Root
          allowHalf
          count={5}
          value={value}
          readOnly={!authenticated}
          aria-disabled={!authenticated || undefined}
          onValueChange={({ value: next }) => {
            if (!allowAction()) return;
            clearTimeout(timer.current);
            pending.current = { value: next, tmdbId, change: getChangeCount() };
            setPreview(next);
            if (mode.current === "keyboard")
              timer.current = setTimeout(flush, 500);
          }}
        >
          <RatingGroup.Label>Your rating</RatingGroup.Label>
          {/* The value change settles after the click handlers; consume it once afterward. */}
          <RatingGroup.Control
            aria-disabled={!authenticated || undefined}
            onClick={() => queueMicrotask(flush)}
          >
            {[1, 2, 3, 4, 5].map((index) => (
              <RatingGroup.Item
                key={index}
                index={index}
                aria-disabled={!authenticated || undefined}
                boxSize={wide ? undefined : "48px"}
                fontSize={wide ? undefined : "48px"}
                onKeyDownCapture={(event) => {
                  if (!RATING_KEYS.has(event.key)) return;
                  if (!allowAction()) {
                    event.preventDefault();
                    return;
                  }
                  mode.current = "keyboard";
                }}
                onClickCapture={(event) => {
                  if (!allowAction()) {
                    event.preventDefault();
                    event.stopPropagation();
                    return;
                  }
                  mode.current = "pointer";
                }}
              >
                <RatingGroup.ItemIndicator />
              </RatingGroup.Item>
            ))}
          </RatingGroup.Control>
          <RatingGroup.HiddenInput />
        </RatingGroup.Root>
        {value > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (!allowAction()) return;
              discard();
              props.onSave(null);
            }}
          >
            Clear rating
          </Button>
        )}
      </HStack>
    </Box>
  );
  if (wide) return controls;
  const close = () => {
    flush();
    setOpen(false);
  };
  return (
    <>
      <HStack>
        {authenticated && rating !== null ? (
          <RatingStars rating={rating} />
        ) : (
          <Text>Not rated</Text>
        )}
        <Button
          ref={trigger}
          variant="outline"
          aria-disabled={!authenticated || undefined}
          onClick={() => {
            if (allowAction()) setOpen(true);
          }}
        >
          Rate
        </Button>
      </HStack>
      <Drawer.Root
        open={open}
        placement="bottom"
        unmountOnExit
        onOpenChange={({ open: next }) => {
          if (!next) close();
        }}
        finalFocusEl={() => trigger.current}
      >
        <Portal>
          <Drawer.Backdrop />
          <Drawer.Positioner>
            <Drawer.Content
              bg="layer-01"
              color="foreground"
              aria-describedby={undefined}
            >
              <Drawer.Header>
                <Drawer.Title>Your rating</Drawer.Title>
              </Drawer.Header>
              <Drawer.Body>{open && controls}</Drawer.Body>
              <Drawer.Footer>
                <Button onClick={close}>Done</Button>
              </Drawer.Footer>
            </Drawer.Content>
          </Drawer.Positioner>
        </Portal>
      </Drawer.Root>
    </>
  );
}
