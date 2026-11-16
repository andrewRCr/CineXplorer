import { useId, useRef } from "react";
import {
  Box,
  HStack,
  IconButton,
  Menu,
  Portal,
  Text,
  useMediaQuery,
} from "@chakra-ui/react";
import {
  LuCheck,
  LuEllipsis,
  LuEye,
  LuHeart,
  LuLockKeyhole,
  LuPenLine,
} from "react-icons/lu";
import { RiPlayListAddLine, RiPlayListFill } from "react-icons/ri";
import useAuthContext from "@/hooks/auth/useAuthContext";
import { useEntryDialog } from "@/hooks/movie/useEntryDialog";
import { Tooltip } from "@/components/core/chakra/tooltip";
import type { MovieListItem } from "@/types/movie";
import type {
  UserMovieDataSchema,
  UserMovieDataPatchSchema,
} from "@/services/userMovieDataService";

import { isWatchedLocked, WATCHED_LOCK_EXPLANATION } from "./watchedLock";

interface MovieCardActionsProps {
  movie: MovieListItem;
  state: UserMovieDataSchema;
  save: (changes: UserMovieDataPatchSchema) => void;
}
export function MovieCardActions({
  movie,
  state,
  save,
}: MovieCardActionsProps) {
  const [hover] = useMediaQuery(["(hover: hover)"], { ssr: false });
  const trigger = useRef<HTMLButtonElement>(null);
  const descriptionId = useId();
  const locked = isWatchedLocked(state);
  const auth = useAuthContext();
  const { open } = useEntryDialog();
  if (auth?.status !== "authenticated") return null;
  const actions = [
    { name: "Watched", field: "user_watched", icon: <LuEye /> },
    { name: "Like", field: "user_liked", icon: <LuHeart /> },
    {
      name: "Watchlist",
      field: "user_on_watchlist",
      icon: state.user_on_watchlist ? (
        <RiPlayListFill />
      ) : (
        <RiPlayListAddLine />
      ),
    },
  ] as const;
  const review = () =>
    open({
      film: {
        tmdbId: movie.tmdb_id,
        title: movie.title,
        year: movie.release_date?.slice(0, 4) || null,
        posterPath: movie.poster_path ?? null,
      },
      dateOn: true,
      filmChangeable: false,
      returnFocus: () => trigger.current,
    });
  if (!hover)
    return (
      <Box position="absolute" top="6px" right="6px">
        <Menu.Root unmountOnExit>
          <Menu.Trigger asChild>
            <IconButton
              ref={trigger}
              aria-label={`Actions for ${movie.title}`}
              variant="ghost"
              boxSize="32px"
              minW="32px"
              bg="popover"
              color="foreground"
              _hover={{ bg: "popover" }}
            >
              <LuEllipsis />
            </IconButton>
          </Menu.Trigger>
          <Portal>
            <Menu.Positioner>
              <Menu.Content>
                {actions.map(({ name, field, icon }) => {
                  const isLocked = field === "user_watched" && locked;
                  return (
                    <Menu.CheckboxItem
                      key={field}
                      value={field}
                      checked={state[field]}
                      aria-disabled={isLocked || undefined}
                      closeOnSelect={!isLocked}
                      _disabled={{ opacity: 1 }}
                      onCheckedChange={() => {
                        if (!isLocked) save({ [field]: !state[field] });
                      }}
                    >
                      {isLocked ? <LuLockKeyhole /> : icon}
                      <Box>
                        <Text>{name}</Text>
                        {isLocked && (
                          <Text fontSize="xs">{WATCHED_LOCK_EXPLANATION}</Text>
                        )}
                      </Box>
                      <Menu.ItemIndicator ms="auto">
                        <LuCheck />
                      </Menu.ItemIndicator>
                    </Menu.CheckboxItem>
                  );
                })}
                <Menu.Item value="review" onSelect={review}>
                  <LuPenLine />
                  Review or log
                </Menu.Item>
              </Menu.Content>
            </Menu.Positioner>
          </Portal>
        </Menu.Root>
      </Box>
    );
  return (
    <HStack
      role="group"
      aria-label={`Your actions for ${movie.title}`}
      position="absolute"
      bottom="8px"
      left="50%"
      transform="translateX(-50%)"
      gap="6px"
      bg="popover"
      borderRadius="md"
      opacity="0"
      _groupHover={{ opacity: 1 }}
      _focusWithin={{ opacity: 1 }}
    >
      {actions.map(({ name, field, icon }) => (
        <Tooltip
          key={name}
          positioning={{ placement: "top" }}
          content={
            field === "user_watched" && locked ? WATCHED_LOCK_EXPLANATION : name
          }
        >
          <IconButton
            aria-label={name}
            aria-pressed={state[field]}
            aria-disabled={(field === "user_watched" && locked) || undefined}
            _disabled={{ opacity: 1 }}
            aria-describedby={
              field === "user_watched" && locked ? descriptionId : undefined
            }
            variant="ghost"
            boxSize="28px"
            minW="28px"
            bg="transparent"
            color={state[field] ? "tertiary" : "foreground"}
            _hover={{ bg: "transparent", color: "tertiary" }}
            onClick={() => {
              if (field !== "user_watched" || !locked)
                save({ [field]: !state[field] });
            }}
          >
            {field === "user_watched" && locked ? <LuLockKeyhole /> : icon}
          </IconButton>
        </Tooltip>
      ))}
      <Tooltip content="Review or log" positioning={{ placement: "top" }}>
        <IconButton
          aria-label="Review or log"
          variant="ghost"
          boxSize="28px"
          minW="28px"
          bg="transparent"
          color="foreground"
          _hover={{ bg: "transparent", color: "tertiary" }}
          onClick={review}
        >
          <LuPenLine />
        </IconButton>
      </Tooltip>
      {locked && (
        <Box id={descriptionId} srOnly>
          {WATCHED_LOCK_EXPLANATION}
        </Box>
      )}
    </HStack>
  );
}
