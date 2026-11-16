import { useSyncExternalStore } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import useAuthContext from "@/hooks/auth/useAuthContext";
import { historyChangesQuery } from "@/lib/queries";
import { Box, Button, HStack, Image, Spinner, Text } from "@chakra-ui/react";
import PosterPlaceholder from "@/assets/PosterPlaceholder";
import { TextLink } from "@/components/common";
import { RatingStars } from "@/components/movie/RatingStars";
import type {
  HistoryChanges,
  HistoryChangeFilm,
} from "@/services/userMovieDataService";
import {
  isHistoryGroupExpanded,
  subscribeHistoryExpansion,
  setHistoryGroupExpanded,
} from "./libraryScrollMemory";
import { calendarDate } from "./calendarDate";

const labels = {
  watchlist: "Added to your watchlist",
  watched: "Marked watched",
  liked: "Liked",
  rating: "Rated",
};
const groupLabels = {
  watchlist: (n: number) => `Added ${n} films to your watchlist`,
  watched: (n: number) => `Marked ${n} films watched`,
  liked: (n: number) => `Liked ${n} films`,
  rating: (n: number) => `Rated ${n} films`,
};
function TinyPoster({ film }: { film: HistoryChangeFilm }) {
  return (
    <Box w="6" h="9" flexShrink={0} overflow="hidden" borderRadius="sm">
      {film.poster_path ? (
        <Image
          src={`https://image.tmdb.org/t/p/w92${film.poster_path}`}
          alt=""
          w="100%"
          h="100%"
          objectFit="cover"
        />
      ) : (
        <PosterPlaceholder
          w="100%"
          h="100%"
          aria-hidden="true"
          focusable="false"
        />
      )}
    </Box>
  );
}
export function HistoryChangeRow({
  film,
  field,
}: {
  film: HistoryChangeFilm;
  field: HistoryChanges["field"];
}) {
  return (
    <HStack
      as="article"
      aria-label={`${labels[field]}: ${film.title}`}
      gap={2}
      py={2}
      color="on-muted"
      fontSize="sm"
      flexWrap="wrap"
    >
      <TinyPoster film={film} />
      <Text>{labels[field]}</Text>
      <TextLink to={`/movie/${film.tmdb_id}?from=history`} color="on-muted">
        {film.title}
      </TextLink>
      {field === "rating" && <RatingStars rating={film.rating} size="sm" />}
    </HStack>
  );
}
export default function HistoryChangesRow({
  changes,
  showDay,
}: {
  changes: HistoryChanges;
  showDay: boolean;
}) {
  const key = `${changes.day}-${changes.field}`;
  const expanded = useSyncExternalStore(subscribeHistoryExpansion, () =>
    isHistoryGroupExpanded(key),
  );
  const setExpanded = (value: boolean) => setHistoryGroupExpanded(key, value);
  const { status } = useAuthContext() ?? {};
  const query = useInfiniteQuery({
    ...historyChangesQuery({ day: changes.day, field: changes.field }),
    enabled: expanded && status === "authenticated",
  });
  const films = [
    ...new Map(
      query.data?.pages
        .flatMap((page) => page.results)
        .map((film) => [film.tmdb_id, film]),
    ).values(),
  ];
  const retry = () => {
    if (query.isFetching) return;
    if (query.isFetchNextPageError) void query.fetchNextPage();
    else void query.refetch();
  };
  return (
    <HStack
      align="start"
      gap={3}
      borderBottomWidth="1px"
      borderColor="border-subtle-01"
    >
      <Text w="14" flexShrink={0} color="on-muted" fontSize="sm" py={2}>
        {showDay
          ? calendarDate(changes.day, { month: "short", day: "numeric" })
          : null}
      </Text>
      <Box flex="1" minW={0}>
        {changes.count <= 3 ? (
          changes.films.map((film) => (
            <HistoryChangeRow
              key={film.tmdb_id}
              film={film}
              field={changes.field}
            />
          ))
        ) : (
          <Box
            role="group"
            aria-label={`${groupLabels[changes.field](changes.count)}: ${calendarDate(changes.day, { month: "short", day: "numeric", year: "numeric" })}`}
            py={2}
          >
            <Text color="on-muted" fontSize="sm">
              {groupLabels[changes.field](changes.count)}
            </Text>
            <HStack gap={1} my={2}>
              {changes.films.slice(0, 8).map((film) => (
                <TinyPoster key={film.tmdb_id} film={film} />
              ))}
            </HStack>
            {expanded ? (
              <Box>
                {films.map((film) => (
                  <HistoryChangeRow
                    key={film.tmdb_id}
                    film={film}
                    field={changes.field}
                  />
                ))}
                {query.isFetching && (
                  <Spinner role="status" aria-label="Loading changes" />
                )}
                {query.isError ? (
                  <Box>
                    <Text>Couldn't load these changes.</Text>
                    <Button onClick={retry} disabled={query.isFetching}>
                      Retry
                    </Button>
                  </Box>
                ) : (
                  query.hasNextPage && (
                    <Button
                      onClick={() => {
                        if (!query.isFetching) void query.fetchNextPage();
                      }}
                      disabled={query.isFetching}
                    >
                      Show more
                    </Button>
                  )
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  aria-expanded={true}
                  onClick={() => setExpanded(false)}
                >
                  Show fewer
                </Button>
              </Box>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                aria-expanded={false}
                onClick={() => setExpanded(true)}
              >
                Show all {changes.count}
              </Button>
            )}
          </Box>
        )}
      </Box>
    </HStack>
  );
}
