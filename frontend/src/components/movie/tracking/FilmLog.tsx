import { useId, useState } from "react";
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
import useAuthContext from "@/hooks/auth/useAuthContext";
import { RatingStars } from "@/components/movie/RatingStars";
import { RewatchIcon } from "@/components/movie/RewatchIcon";

export function FilmLog({ movie }: { movie: MovieDetail }) {
  const heading = useId();
  const authenticated = useAuthContext()?.status === "authenticated";
  const query = useQuery({
    ...movieEntriesQuery(movie.tmdb_id),
    enabled: authenticated,
  });
  const [all, setAll] = useState(false);
  const entries = query.data?.entries;
  if (!authenticated || (query.isSuccess && !entries?.length)) return null;
  return (
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
                  ? new Date(`${entry.watched_on}T00:00:00`).toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric", year: "numeric" },
                    )
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
                        aria-label={`Edit ${label}`}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        aria-label={`Delete ${label}`}
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
