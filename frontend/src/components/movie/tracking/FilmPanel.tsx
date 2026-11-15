import { useId, useState, type Ref } from "react";
import {
  Box,
  Button,
  Flex,
  Heading,
  Link as ChakraLink,
  Text,
} from "@chakra-ui/react";
import { Link, useLocation } from "react-router";
import { LuEye, LuHeart, LuLockKeyhole, LuPenLine } from "react-icons/lu";
import { RiPlayListAddLine } from "react-icons/ri";
import type { MovieDetail } from "@/types/movie";
import useAuthContext from "@/hooks/auth/useAuthContext";
import { useUserMovieState } from "@/hooks/movie/useUserMovieState";
import { useEntryDialog } from "@/hooks/movie/useEntryDialog";
import { signInPathFor } from "@/utilities/returnPath";
import {
  isWatchedLocked,
  WATCHED_LOCK_EXPLANATION,
} from "@/components/movie/watchedLock";

interface FilmPanelProps {
  movie: MovieDetail;
  direction?: "row" | "column";
  reviewRef?: Ref<HTMLButtonElement>;
}
export function FilmPanel({
  movie,
  direction = "row",
  reviewRef,
}: FilmPanelProps) {
  const headingId = useId();
  const lockId = useId();
  const { status } = useAuthContext() ?? {};
  const { state, save } = useUserMovieState(
    movie.tmdb_id,
    movie.user_movie_data,
  );
  const { open } = useEntryDialog();
  const location = useLocation();
  const [showSignIn, setShowSignIn] = useState(false);
  const [showLock, setShowLock] = useState(false);
  const locked = isWatchedLocked(state);
  const authenticated = status === "authenticated";
  const allowAction = () => {
    if (authenticated) return true;
    if (status === "anonymous") setShowSignIn(true);
    return false;
  };
  const toggles = [
    {
      name: "Watched",
      field: "user_watched",
      icon: locked ? <LuLockKeyhole /> : <LuEye />,
    },
    { name: "Like", field: "user_liked", icon: <LuHeart /> },
    {
      name: "Watchlist",
      field: "user_on_watchlist",
      icon: <RiPlayListAddLine />,
    },
  ] as const;
  return (
    <Box as="section" aria-labelledby={headingId} mb="6">
      <Heading as="h2" id={headingId} size="md" mb="2">
        Your film
      </Heading>
      <Flex
        direction={direction}
        gap="2"
        wrap="wrap"
        justify="center"
        align="center"
      >
        {toggles.map(({ name, field, icon }) => {
          const isLocked = field === "user_watched" && locked;
          return (
            <Button
              key={field}
              variant="subtle"
              selected={state[field]}
              aria-pressed={state[field]}
              aria-disabled={!authenticated || isLocked || undefined}
              aria-describedby={isLocked ? lockId : undefined}
              _disabled={{ opacity: 1 }}
              onClick={() => {
                if (!allowAction()) return;
                if (isLocked) {
                  setShowLock(true);
                  return;
                }
                save({ [field]: !state[field] });
              }}
            >
              {icon}
              {name}
            </Button>
          );
        })}
        <Button
          ref={reviewRef}
          variant="outline"
          aria-disabled={!authenticated || undefined}
          _disabled={{ opacity: 1 }}
          onClick={() => {
            if (!allowAction()) return;
            open({
              film: {
                tmdbId: movie.tmdb_id,
                title: movie.title,
                year: movie.release_date?.slice(0, 4) || null,
                posterPath: movie.poster_path ?? null,
              },
              dateOn: false,
              filmChangeable: false,
            });
          }}
        >
          <LuPenLine />
          Review
        </Button>
      </Flex>
      {locked && (
        <Box srOnly id={lockId}>
          {WATCHED_LOCK_EXPLANATION}
        </Box>
      )}
      {authenticated && locked && showLock && (
        <Text role="status" mt="2">
          {WATCHED_LOCK_EXPLANATION}
        </Text>
      )}
      {status === "anonymous" && showSignIn && (
        <Text role="status" mt="2">
          Sign in to mark films watched, rate and log them, and keep a
          watchlist.{" "}
          <ChakraLink asChild>
            <Link to={signInPathFor(location.pathname, location.search)}>
              Sign in
            </Link>
          </ChakraLink>
        </Text>
      )}
    </Box>
  );
}
