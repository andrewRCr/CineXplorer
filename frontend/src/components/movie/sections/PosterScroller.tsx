import { Box, Flex, IconButton } from "@chakra-ui/react";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";
import type { Ref } from "react";
import type { MovieListItem } from "@/types/movie";
import MovieCard from "@/components/movie/MovieCard";
import { CARD_WIDTH } from "@/components/movie/collection/shared/gridConstants";
import type { usePosterScroll } from "./usePosterScroll";

export function PosterScroller({
  films,
  listRef,
  source,
}: {
  films: MovieListItem[];
  listRef: Ref<HTMLUListElement>;
  source?: string;
}) {
  return (
    <Box
      as="ul"
      ref={listRef}
      display="flex"
      gap={4}
      overflowX="auto"
      listStyleType="none"
      p={0}
      m={0}
      pb={3}
      minW="0"
    >
      {films.slice(0, 20).map((movie) => (
        <Box
          as="li"
          key={movie.tmdb_id}
          flex="0 0 auto"
          w={{ base: "138px", lg: `${CARD_WIDTH}px` }}
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
