import { useState, type ReactNode } from "react";
import { Box, Container, Theme, useMediaQuery } from "@chakra-ui/react";
import type { FeaturedMovie } from "@/services/movieService";
import { pageContainerProps } from "@/components/layout/pageContainer";
import { HeroArtwork } from "./HeroArtwork";
import { HeroCredit } from "./HeroCredit";

type HeroFilm = Pick<
  FeaturedMovie,
  "tmdb_id" | "title" | "release_date" | "backdrop_path" | "tagline"
>;

// The mask is opaque within the text bounds and feathers only through the outer margin.
const textFade = {
  position: "relative",
  isolation: "isolate",
  _before: {
    content: '""',
    position: "absolute",
    inset: "-48px",
    zIndex: -1,
    pointerEvents: "none",
    bg: "background/90",
    maskImage:
      "linear-gradient(to right, transparent, black 48px, black calc(100% - 48px), transparent), linear-gradient(to bottom, transparent, black 48px, black calc(100% - 48px), transparent)",
    maskComposite: "intersect",
  },
} as const;

/** Film presentation independent of its query, with content slots shared by both arrangements. */
export function FilmHero({
  film,
  focusPoint,
  directors = [],
  creditHref,
  heading,
  description,
  actions,
}: {
  film?: HeroFilm;
  focusPoint?: FeaturedMovie["focus_point"];
  directors?: readonly string[];
  creditHref?: string;
  heading: ReactNode;
  description?: ReactNode;
  actions: ReactNode;
}) {
  // Match Chakra's lg/md boundaries and resolve the actual browser viewport on the first render.
  const [desktop = false, portrait = false, tablet = false] = useMediaQuery(
    ["(min-width: 64rem)", "(orientation: portrait)", "(min-width: 48rem)"],
    { ssr: false },
  );
  const stacked = !desktop && portrait;
  const [failedFilm, setFailedFilm] = useState<number | null>(null);
  const backdrop =
    film && failedFilm !== film.tmdb_id ? film.backdrop_path : null;
  const artwork = backdrop ? (
    <HeroArtwork
      path={backdrop}
      contained={stacked}
      focusPoint={focusPoint}
      onError={() => {
        if (film) setFailedFilm(film.tmdb_id);
      }}
    />
  ) : null;
  const credit =
    film && backdrop ? (
      <HeroCredit
        film={film}
        directors={directors}
        href={creditHref}
        showTagline={desktop || (stacked && tablet)}
      />
    ) : null;
  const pitch = (
    <>
      {heading}
      {!stacked && description}
      {actions}
    </>
  );

  if (stacked)
    return (
      <Box data-hero-presentation="stacked" bg="background" color="foreground">
        <Theme
          appearance="dark"
          bg="background"
          position="relative"
          aspectRatio="16 / 9"
          w="100%"
        >
          {artwork}
        </Theme>
        <Container
          {...pageContainerProps}
          minH={tablet ? "128px" : "96px"}
          pt={3}
        >
          {credit}
        </Container>
        <Container {...pageContainerProps} pb={8}>
          {pitch}
        </Container>
      </Box>
    );

  const creditColumn = (
    <Box justifySelf="end" textAlign="right" maxW={desktop ? "100%" : "600px"}>
      {credit && <Box css={textFade}>{credit}</Box>}
    </Box>
  );
  return (
    <Theme
      appearance="dark"
      data-hero-presentation="full"
      position="relative"
      h="73svh"
      minH={desktop ? "480px" : "560px"}
      bg="background"
      color="foreground"
      overflow="hidden"
    >
      {artwork}
      <Box
        position="absolute"
        inset={0}
        pointerEvents="none"
        css={{
          backgroundImage:
            "linear-gradient(to top, {colors.background/95}, {colors.background/75} 35%, transparent 85%), linear-gradient(to right, {colors.background/75}, {colors.background/20} 65%, transparent)",
        }}
      />
      <Container
        {...pageContainerProps}
        position="relative"
        h="100%"
        display="grid"
        gridTemplateColumns={
          desktop ? "minmax(0, 600px) minmax(0, 420px)" : "minmax(0, 1fr)"
        }
        gridTemplateRows={desktop ? "auto" : "128px auto"}
        alignContent="end"
        alignItems={desktop ? "end" : "start"}
        justifyContent="space-between"
        gap={desktop ? 8 : 4}
        pb={desktop ? "80px" : 8}
      >
        {!desktop && creditColumn}
        <Box css={textFade}>{pitch}</Box>
        {desktop && creditColumn}
      </Container>
    </Theme>
  );
}
