import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Heading,
  HStack,
  Text,
  VStack,
  Skeleton,
} from "@chakra-ui/react";
import { useQuery } from "@tanstack/react-query";
import type { MovieDetail } from "@/types/movie";
import { movieEntriesQuery } from "@/lib/queries";
import { getChangeCount } from "@/lib/session";
import { useMovieEntries } from "@/hooks/movie/useMovieEntries";
import { DeleteEntryConfirmation } from "./DeleteEntryConfirmation";
import { useEntryDialog } from "@/hooks/movie/useEntryDialog";
import useAuthContext from "@/hooks/auth/useAuthContext";
import { RatingStars } from "@/components/movie/RatingStars";
import { RewatchIcon } from "@/components/movie/RewatchIcon";

interface DeleteRequest {
  entryId: number;
  index: number;
  owner: number;
  tmdbId: number;
  opener: HTMLElement;
}
interface Deletion {
  request: DeleteRequest;
  phase: "confirm" | "saving" | "deleted" | "cancelled";
}
export function FilmLog({
  movie,
  fallbackFocus,
}: {
  movie: MovieDetail;
  fallbackFocus: () => HTMLElement | null;
}) {
  const heading = useId();
  const { open } = useEntryDialog();
  const authenticated = useAuthContext()?.status === "authenticated";
  const query = useQuery({
    ...movieEntriesQuery(movie.tmdb_id),
    enabled: authenticated,
  });
  const [all, setAll] = useState(false);
  const entries = query.data?.entries;
  const writes = useMovieEntries(movie.tmdb_id);
  const [deletion, setDeletion] = useState<Deletion | null>(null);
  const buttons = useRef(new Map<number, HTMLButtonElement>());
  const mounted = useRef(true);
  const latest = useRef({ tmdbId: movie.tmdb_id, authenticated });
  const renderOwner = getChangeCount();
  useLayoutEffect(() => {
    latest.current = { tmdbId: movie.tmdb_id, authenticated };
  });
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const owned = (request: DeleteRequest) =>
    mounted.current &&
    request.owner === getChangeCount() &&
    request.tmdbId === latest.current.tmdbId &&
    latest.current.authenticated;
  const request = deletion?.request;
  const current =
    authenticated &&
    request?.owner === renderOwner &&
    request.tmdbId === movie.tmdb_id;
  const busy = deletion?.phase === "saving" || deletion?.phase === "deleted";
  // Close in the render that removes the confirmed entry, so remaining Edit refs commit with it.
  const awaitingRemoval =
    deletion?.phase === "deleted" &&
    (!entries || entries.some((entry) => entry.id === request?.entryId));
  const dialogOpen =
    current &&
    (deletion?.phase === "confirm" ||
      deletion?.phase === "saving" ||
      awaitingRemoval);
  const cancel = () =>
    setDeletion((value) => (value ? { ...value, phase: "cancelled" } : null));
  const confirm = async () => {
    if (!request || deletion?.phase !== "confirm" || !owned(request)) return;
    setDeletion({ request, phase: "saving" });
    try {
      await writes.deleteEntry(request.entryId);
      if (owned(request))
        setDeletion((value) =>
          value?.request === request ? { request, phase: "deleted" } : value,
        );
    } catch {
      if (owned(request))
        setDeletion((value) =>
          value?.request === request ? { request, phase: "confirm" } : value,
        );
    }
  };
  const showLog = authenticated && !(query.isSuccess && !entries?.length);
  return (
    <>
      {showLog && (
        <Box as="section" aria-labelledby={heading} mb="6">
          <Heading as="h2" id={heading} size="md" mb="2">
            Your log
          </Heading>
          {query.isPending ? (
            <VStack role="status" aria-label="Loading your log" align="stretch">
              {[1, 2, 3].map((index) => (
                <Skeleton
                  key={index}
                  role="img"
                  aria-label="Loading entry"
                  height="20"
                />
              ))}
            </VStack>
          ) : query.isError ? (
            <Box>
              <Text>Couldn't load your log.</Text>
              <Button variant="outline" onClick={() => void query.refetch()}>
                Retry
              </Button>
            </Box>
          ) : (
            <>
              <VStack as="ol" align="stretch" listStyleType="none" gap="3">
                {(all ? (entries ?? []) : (entries ?? []).slice(0, 3)).map(
                  (entry, index) => {
                    const date = entry.watched_on
                      ? new Date(
                          `${entry.watched_on}T00:00:00`,
                        ).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "No date";
                    const label = `entry ${index + 1}, ${entry.watched_on ? date : "undated"}`;
                    return (
                      <Box
                        as="li"
                        key={entry.id}
                        bg="layer-01"
                        p="4"
                        borderRadius="md"
                      >
                        <HStack>
                          <Text>{date}</Text>
                          {entry.rewatch && <RewatchIcon />}
                          <RatingStars rating={entry.rating} />
                        </HStack>
                        {entry.review && <EntryReview review={entry.review} />}
                        <HStack mt="2">
                          <Button
                            variant="outline"
                            size="sm"
                            ref={(node) => {
                              if (node) buttons.current.set(entry.id, node);
                              else buttons.current.delete(entry.id);
                            }}
                            aria-label={`Edit ${label}`}
                            onClick={() =>
                              open({
                                film: {
                                  tmdbId: movie.tmdb_id,
                                  title: movie.title,
                                  year: movie.release_date?.slice(0, 4) || null,
                                  posterPath: movie.poster_path ?? null,
                                },
                                entry,
                                dateOn: entry.watched_on !== null,
                                filmChangeable: false,
                                returnFocus: fallbackFocus,
                              })
                            }
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            aria-label={`Delete ${label}`}
                            onClick={(event) => {
                              if (renderOwner !== getChangeCount()) return;
                              setDeletion({
                                request: {
                                  entryId: entry.id,
                                  index,
                                  owner: renderOwner,
                                  tmdbId: movie.tmdb_id,
                                  opener: event.currentTarget,
                                },
                                phase: "confirm",
                              });
                            }}
                          >
                            Delete
                          </Button>
                        </HStack>
                      </Box>
                    );
                  },
                )}
              </VStack>
              {!all && entries && entries.length > 3 && (
                <Button variant="outline" mt="3" onClick={() => setAll(true)}>
                  Show all ({entries.length})
                </Button>
              )}
            </>
          )}
        </Box>
      )}
      <DeleteEntryConfirmation
        open={dialogOpen}
        busy={busy}
        restoreFocus={current}
        finalFocusEl={() => {
          if (!request || !owned(request))
            return document.activeElement instanceof HTMLElement
              ? document.activeElement
              : null;
          if (deletion?.phase === "deleted") {
            const visible = all ? (entries ?? []) : (entries ?? []).slice(0, 3);
            const next = visible[Math.min(request.index, visible.length - 1)];
            const target = next ? buttons.current.get(next.id) : null;
            return target?.isConnected ? target : fallbackFocus();
          }
          return request.opener.isConnected ? request.opener : fallbackFocus();
        }}
        onCancel={cancel}
        onConfirm={() => void confirm()}
      />
    </>
  );
}

function EntryReview({ review }: { review: string }) {
  const [expanded, setExpanded] = useState(false);
  const long = review.length > 280;
  const head = review.slice(0, 280);
  const lastSpace = head.lastIndexOf(" ");
  const excerpt = (lastSpace > 0 ? head.slice(0, lastSpace) : head) + "…";
  return (
    <>
      <Text whiteSpace="pre-wrap" mt="2">
        {long && !expanded ? excerpt : review}
      </Text>
      {long && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "Show less" : "Read more"}
        </Button>
      )}
    </>
  );
}
