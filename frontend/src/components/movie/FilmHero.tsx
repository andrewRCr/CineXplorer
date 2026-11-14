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

const panelPadding = "24px";
// The page content stops widening at 1440px with a 32px inset, so below a 1456px hero the panel's padding would
// leave less than 16px of image at the window's edge; the panel runs flush there instead (clipped by the hero).
const flushBelow = "@container hero (min-width: 1456px)";

/** A hard-edged panel behind text, flush to the hero's edge on its outer side where only a sliver would remain. */
function textPanel(outer: "left" | "right") {
  return {
    position: "relative",
    isolation: "isolate",
    _before: {
      content: '""',
      position: "absolute",
      inset: `-${panelPadding}`,
      [outer]: "-100vw",
      zIndex: -1,
      pointerEvents: "none",
      bg: "background/90",
      [flushBelow]: { [outer]: `-${panelPadding}` },
    },
  } as const;
}

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
      {credit && <Box css={textPanel("right")}>{credit}</Box>}
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
      css={{ containerType: "inline-size", containerName: "hero" }}
    >
      {artwork}
      <Box
        position="absolute"
        inset={0}
        pointerEvents="none"
        css={{
          backgroundImage:
            "linear-gradient(to top, {colors.background/85}, {colors.background/40} 18%, transparent 40%)",
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
        pb={desktop ? "80px" : 10}
      >
        {!desktop && creditColumn}
        <Box justifySelf="start" maxW="100%" css={textPanel("left")}>
          {pitch}
        </Box>
        {desktop && creditColumn}
      </Container>
    </Theme>
  );
}
