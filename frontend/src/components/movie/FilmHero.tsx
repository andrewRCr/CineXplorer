import { useState, type ReactNode } from "react";
import { Link as RouterLink } from "react-router";
import { Box, Container, Image, Link, Text, Theme } from "@chakra-ui/react";
import type { FeaturedMovie } from "@/services/movieService";
import { pageContainerProps } from "@/components/layout/pageContainer";

type HeroFilm = Pick<
  FeaturedMovie,
  "tmdb_id" | "title" | "release_date" | "backdrop_path" | "tagline"
>;
type FocusPoint = NonNullable<FeaturedMovie["focus_point"]>;

// The opaque mask plateau covers the wrapper; only the surrounding margin feathers.
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

/** Artwork and credit presentation, independent of how the film is selected or read. */
export function FilmHero({
  film,
  focusPoint,
  creditHref,
  children,
}: {
  film?: HeroFilm;
  focusPoint?: FocusPoint | null;
  creditHref?: string;
  children: ReactNode;
}) {
  const [failedFilm, setFailedFilm] = useState<number | null>(null);
  const hasArt = !!film?.backdrop_path && failedFilm !== film.tmdb_id;
  return (
    <Theme
      appearance="dark"
      position="relative"
      h="73svh"
      minH={{ base: "560px", lg: "480px" }}
      bg="background"
      color="foreground"
      overflow="hidden"
    >
      {hasArt && (
        <Box as="picture" position="absolute" inset={0}>
          <source
            media="(min-width: 80rem), (min-height: 987px)"
            srcSet={`https://image.tmdb.org/t/p/original${film.backdrop_path}`}
          />
          <Image
            src={`https://image.tmdb.org/t/p/w1280${film.backdrop_path}`}
            srcSet={`https://image.tmdb.org/t/p/w1280${film.backdrop_path} 1x, https://image.tmdb.org/t/p/original${film.backdrop_path} 2x`}
            alt=""
            w="100%"
            h="100%"
            objectFit="cover"
            objectPosition={`${focusPoint?.x ?? 50}% ${focusPoint?.y ?? 28}%`}
            onError={() => setFailedFilm(film.tmdb_id)}
          />
        </Box>
      )}
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
        gridTemplateColumns={{
          base: "minmax(0, 1fr)",
          lg: "minmax(0, 600px) minmax(0, 420px)",
        }}
        gridTemplateRows={{ base: "auto 128px", lg: "auto" }}
        alignContent="end"
        alignItems={{ base: "start", lg: "end" }}
        justifyContent="space-between"
        gap={{ base: 4, lg: 8 }}
        pb={{ base: 6, lg: "80px" }}
      >
        <Box css={textFade}>{children}</Box>
        <Box
          textAlign={{ base: "left", lg: "right" }}
          justifySelf={{ base: "start", lg: "end" }}
          maxW="100%"
        >
          {hasArt && (
            <Box css={textFade}>
              <Link
                asChild
                color="foreground"
                fontFamily="heading"
                fontWeight="semibold"
                fontSize="18px"
                lineHeight="1.4"
                _hover={{ color: "tertiary-hover" }}
              >
                <RouterLink to={creditHref ?? "#"}>
                  {film.title}
                  {film.release_date
                    ? ` (${film.release_date.slice(0, 4)})`
                    : ""}
                </RouterLink>
              </Link>
              {film.tagline && (
                <Text
                  fontSize="15px"
                  color="on-muted"
                  lineHeight="1.5"
                  lineClamp={2}
                  mt={1}
                >
                  {film.tagline}
                </Text>
              )}
            </Box>
          )}
        </Box>
      </Container>
    </Theme>
  );
}
