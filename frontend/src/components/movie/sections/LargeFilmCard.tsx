import { Box, Flex, Heading, Link, Text } from "@chakra-ui/react";
import { Link as RouterLink } from "react-router";
import type { MovieListItem } from "@/types/movie";
import { homeFilmPath } from "@/utilities/filmLinks";
import { genreOptions } from "@/constants/browseOptions";
import { FilmPoster } from "./FilmPoster";

export function LargeFilmCard({ film }: { film: MovieListItem }) {
  const genres = film.genre_ids
    ?.map(
      (id) => genreOptions.find((genre) => genre.value === String(id))?.label,
    )
    .filter(Boolean)
    .join(" · ");
  return (
    <Link
      asChild
      color="foreground"
      display="block"
      textDecoration="none"
      bg="layer-01"
      borderWidth="1px"
      borderColor="border-subtle-00"
      borderRadius="lg"
      overflow="hidden"
      h={{ base: "300px", lg: "320px" }}
      _hover={{ bg: "layer-hover-01" }}
    >
      <RouterLink to={homeFilmPath(film.tmdb_id)}>
        <Flex
          gap={{ base: 4, lg: 6 }}
          p={{ base: 4, lg: 6 }}
          align="start"
          h="100%"
        >
          <Box w={{ base: "100px", lg: "180px" }} flexShrink={0}>
            <FilmPoster film={film} />
          </Box>
          <Box minW="0">
            <Heading
              as="h3"
              size={{ base: "xl", lg: "2xl" }}
              lineClamp={2}
              mb={3}
            >
              {film.title}
            </Heading>
            <Flex gap={3} color="on-muted" fontSize="sm" mb={3}>
              {film.release_date && (
                <Text>{film.release_date.slice(0, 4)}</Text>
              )}
              {!!film.runtime && <Text>{film.runtime} min</Text>}
            </Flex>
            {genres && (
              <Text fontSize="sm" color="tertiary" mb={3} lineClamp={2}>
                {genres}
              </Text>
            )}
            <Text lineClamp={{ base: 3, lg: 5 }}>{film.overview}</Text>
          </Box>
        </Flex>
      </RouterLink>
    </Link>
  );
}
