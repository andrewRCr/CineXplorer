import { useQuery } from "@tanstack/react-query";
import { useSearchParams, Link as RouterLink } from "react-router";
import { Box, Button, Flex, Heading, Link, Text } from "@chakra-ui/react";
import { featuredFilmQuery } from "@/lib/queries";
import { FilmHero } from "@/components/movie/FilmHero";
import { homeFilmPath } from "@/utilities/filmLinks";
import { signInPathFor } from "@/utilities/returnPath";

export function HomeHero() {
  const [params] = useSearchParams();
  const candidate = import.meta.env.DEV ? Number(params.get("film")) : 0;
  const filmId =
    Number.isSafeInteger(candidate) && candidate > 0 ? candidate : undefined;
  const { data: film } = useQuery(featuredFilmQuery(filmId));
  return (
    <FilmHero
      film={film}
      focusPoint={film?.focus_point}
      mirrored={film?.mirrored}
      directors={film?.directors}
      creditHref={film ? homeFilmPath(film.tmdb_id) : undefined}
      heading={
        <Heading
          as="h1"
          size={{ base: "3xl", lg: "4xl" }}
          lineHeight="1.1"
          mb={5}
          textWrap="balance"
        >
          Track what you watch. <Box as="br" hideBelow="lg" />
          Find what's next.
        </Heading>
      }
      description={
        <Text mb={6} fontSize="lg" textWrap="balance">
          New releases, all-time classics, <Box as="br" hideBelow="lg" />
          and everything in between.
        </Text>
      }
      actions={
        <Flex gap={5} align="center" flexWrap="wrap">
          <Button asChild variant="solid">
            <RouterLink to="/register">Create account</RouterLink>
          </Button>
          <Link asChild color="tertiary">
            <RouterLink to={signInPathFor("/", "")}>Sign in</RouterLink>
          </Link>
        </Flex>
      }
    />
  );
}
