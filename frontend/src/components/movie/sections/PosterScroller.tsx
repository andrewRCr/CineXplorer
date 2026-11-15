import { Box, Flex, IconButton, Skeleton } from "@chakra-ui/react";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";
import type { Ref } from "react";
import type { MovieListItem } from "@/types/movie";
import MovieCard from "@/components/movie/MovieCard";
import type { usePosterScroll } from "./usePosterScroll";
import { POSTER_GAP } from "./posterRowLayout";

export function PosterScroller({
  films,
  listRef,
  count = 1,
  source,
  loading = false,
}: {
  films: MovieListItem[];
  listRef: Ref<HTMLUListElement>;
  count?: number;
  source?: string;
  loading?: boolean;
}) {
  return (
    <Box
      as="ul"
      ref={listRef}
      aria-hidden={loading || undefined}
      display="flex"
      gap={`${POSTER_GAP}px`}
      overflowX="auto"
      scrollSnapType="x mandatory"
      scrollbarWidth="none"
      css={{ "&::-webkit-scrollbar": { display: "none" } }}
      listStyleType="none"
      p={0}
      m={0}
      minW="0"
    >
      {loading
        ? Array.from({ length: count }, (_, i) => (
            <Box as="li" key={i} flex="0 0 var(--poster-card-width, 100%)">
              <Skeleton bg="layer-02" h="360px" borderRadius="md" />
            </Box>
          ))
        : films.slice(0, 20).map((movie) => (
            <Box
              as="li"
              key={movie.tmdb_id}
              flex="0 0 var(--poster-card-width, 100%)"
              minW="138px"
              scrollSnapAlign="start"
            >
              <MovieCard movie={movie} source={source} />
            </Box>
          ))}
    </Box>
  );
}
export function PosterScrollButtons({
  scroll,
}: {
  scroll: ReturnType<typeof usePosterScroll>;
}) {
  return (
    <Flex gap={1}>
      <IconButton
        aria-label="Previous films"
        variant="outline"
        size="sm"
        disabled={scroll.atStart}
        onClick={scroll.previous}
      >
        <LuChevronLeft />
      </IconButton>
      <IconButton
        aria-label="Next films"
        variant="outline"
        size="sm"
        disabled={scroll.atEnd}
        onClick={scroll.next}
      >
        <LuChevronRight />
      </IconButton>
    </Flex>
  );
}
