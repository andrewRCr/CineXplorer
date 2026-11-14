import { useQuery, type QueryKey } from "@tanstack/react-query";
import { FilmSection, type FilmQuery } from "./FilmSection";
import { PosterScroller, PosterScrollButtons } from "./PosterScroller";
import { usePosterScroll } from "./usePosterScroll";

export function PosterRowSection<Key extends QueryKey>({
  title,
  seeAll,
  query,
}: {
  title: string;
  seeAll?: string;
  query: FilmQuery<Key>;
}) {
  const result = useQuery(query);
  const films = result.data?.results ?? [];
  const scroll = usePosterScroll();
  return (
    <FilmSection
      title={title}
      seeAll={seeAll}
      result={result}
      films={films}
      controls={<PosterScrollButtons scroll={scroll} />}
    >
      <PosterScroller films={films} listRef={scroll.ref} source="home" />
    </FilmSection>
  );
}
