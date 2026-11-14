import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, Link as RouterLink } from "react-router";
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Image,
  Link,
  Text,
} from "@chakra-ui/react";
import { featuredFilmQuery } from "@/lib/queries";
import { homeFilmPath } from "@/utilities/filmLinks";
import { signInPathFor } from "@/utilities/returnPath";
import { pageContainerProps } from "@/components/layout/pageContainer";

export function HomeHero() {
  const [params] = useSearchParams();
  const candidate = import.meta.env.DEV ? Number(params.get("film")) : 0;
  const filmId =
    Number.isSafeInteger(candidate) && candidate > 0 ? candidate : undefined;
  const result = useQuery(featuredFilmQuery(filmId));
  const film = result.data;
  const [failedFilm, setFailedFilm] = useState<number | null>(null);
  const hasArt = !!film?.backdrop_path && failedFilm !== film.tmdb_id;
  return (
    <Box
      position="relative"
      h={{ base: "auto", lg: "560px" }}
      bg="background"
      color="foreground"
      overflow="hidden"
    >
      {(result.isPending || hasArt) && (
        <Box
          position={{ base: "relative", lg: "absolute" }}
          inset={0}
          h={{ base: "220px", lg: "100%" }}
        >
          {hasArt && (
            <Image
              src={`https://image.tmdb.org/t/p/w1280${film.backdrop_path}`}
              alt=""
              w="100%"
              h="100%"
              objectFit="cover"
              objectPosition={{ base: "center", lg: "right center" }}
              onError={() => setFailedFilm(film.tmdb_id)}
            />
          )}
          <Box
            position="absolute"
            inset={0}
            css={{
              backgroundImage:
                "linear-gradient(to top, var(--chakra-colors-background), transparent 80%)",
              "@media (min-width: 64rem)": {
                backgroundImage:
                  "linear-gradient(to right, var(--chakra-colors-background) 60%, transparent 90%), linear-gradient(to top, var(--chakra-colors-background), transparent 80%)",
              },
            }}
          />
        </Box>
      )}
      <Container
        {...pageContainerProps}
        position="relative"
        h="100%"
        display="flex"
        alignItems="end"
      >
        <Box w={{ base: "100%", lg: "52%" }} py={{ base: 6, lg: 10 }}>
          {hasArt && (
            <Link asChild color="foreground" display="block" mb={5}>
              <RouterLink to={homeFilmPath(film.tmdb_id)}>
                <Text fontFamily="heading" fontWeight="semibold" fontSize="xl">
                  {film.title}
                  {film.release_date
                    ? ` (${film.release_date.slice(0, 4)})`
                    : ""}
                </Text>
                {film.tagline && (
                  <Text fontSize="sm" lineClamp={2}>
                    {film.tagline}
                  </Text>
                )}
              </RouterLink>
            </Link>
          )}
          <Heading
            as="h1"
            size={{ base: "3xl", lg: "4xl" }}
            lineHeight="1.1"
            mb={5}
          >
            Track the films you watch. Find the next one.
          </Heading>
          <Text mb={6} fontSize="lg">
            Browse what's in theaters and coming soon, keep a watchlist, and
            search any film. Film data from TMDB.
          </Text>
          <Flex gap={5} align="center" flexWrap="wrap">
            <Button asChild variant="solid">
              <RouterLink to="/register">Create account</RouterLink>
            </Button>
            <Link asChild color="tertiary">
              <RouterLink to={signInPathFor("/", "")}>Sign in</RouterLink>
            </Link>
          </Flex>
        </Box>
      </Container>
    </Box>
  );
}
