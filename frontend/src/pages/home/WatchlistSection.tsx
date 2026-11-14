import { useQuery } from "@tanstack/react-query";
import { Box } from "@chakra-ui/react";
import { homeWatchlistQuery } from "@/lib/queries";
import { FilmSection } from "@/components/movie/sections/FilmSection";
import { LargeFilmCard } from "@/components/movie/sections/LargeFilmCard";
import {
  PosterScroller,
  PosterScrollButtons,
} from "@/components/movie/sections/PosterScroller";
import { usePosterScroll } from "@/components/movie/sections/usePosterScroll";

export function WatchlistSection() {
  const result = useQuery(homeWatchlistQuery());
  const films = result.data?.results ?? [];
  const [first, ...rest] = films;
  const scroll = usePosterScroll();
  return (
    <FilmSection
      title="Your watchlist"
      seeAll="/watchlist"
      result={result}
      films={films}
      controls={
        rest.length > 0 ? <PosterScrollButtons scroll={scroll} /> : undefined
      }
    >
      {first && <LargeFilmCard film={first} />}
      {rest.length > 0 && (
        <Box mt={4}>
          <PosterScroller films={rest} source="home" listRef={scroll.ref} />
        </Box>
      )}
    </FilmSection>
  );
}
