import { useQuery, type QueryKey } from "@tanstack/react-query";
import {
  Box,
  Flex,
  Heading,
  Link,
  SimpleGrid,
  Text,
  useBreakpointValue,
  chakra,
} from "@chakra-ui/react";
import { Link as RouterLink } from "react-router";
import { groupByOpeningWeek } from "@/utilities/groupByOpeningWeek";
import { homeFilmPath } from "@/utilities/filmLinks";
import { genreOptions } from "@/constants/browseOptions";
import { FilmSection, type FilmQuery } from "./FilmSection";
import { FilmPoster } from "./FilmPoster";

export function ReleaseCalendar<Key extends QueryKey>({
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
  const cap = useBreakpointValue({ base: 2, lg: 3 }) ?? 2;
  const weeks = groupByOpeningWeek(films, cap);
  return (
    <FilmSection title={title} seeAll={seeAll} result={result} films={films}>
      <SimpleGrid
        columns={{ base: 1, lg: weeks.length || 1 }}
        gap={{ base: 6, lg: 5 }}
      >
        {weeks.map((week) => (
          <Box key={week.monday} minW="0">
            <Heading as="h3" size="lg" mb={4}>
              {week.heading.slice(0, week.heading.lastIndexOf(" ") + 1)}
              <Text as="span" fontSize="3xl" color="tertiary">
                {Number(week.monday.slice(-2))}
              </Text>
            </Heading>
            <chakra.ul listStyleType="none" m={0} p={0}>
              {week.films.map((film) => (
                <chakra.li key={film.tmdb_id} mb={4}>
                  <Link
                    asChild
                    color="foreground"
                    display="block"
                    _hover={{ color: "tertiary" }}
                  >
                    <RouterLink to={homeFilmPath(film.tmdb_id)}>
                      <Flex gap={3} align="start">
                        <Box w="52px" flexShrink={0}>
                          <FilmPoster film={film} />
                        </Box>
                        <Box minW="0">
                          <Text fontWeight="semibold" lineClamp={2}>
                            {film.title}
                          </Text>
                          <chakra.time
                            dateTime={film.release_date ?? undefined}
                            fontSize="sm"
                            color="on-muted"
                          >
                            {new Date(
                              `${film.release_date}T00:00:00Z`,
                            ).toLocaleDateString("en-US", {
                              weekday: "short",
                              timeZone: "UTC",
                            })}{" "}
                            {Number(film.release_date?.slice(-2))}
                          </chakra.time>
                          <Text fontSize="sm" color="on-muted">
                            {
                              genreOptions.find(
                                (genre) =>
                                  genre.value === String(film.genre_ids?.[0]),
                              )?.label
                            }
                          </Text>
                        </Box>
                      </Flex>
                    </RouterLink>
                  </Link>
                </chakra.li>
              ))}
            </chakra.ul>
            {week.remaining > 0 && (
              <Text fontSize="sm" color="on-muted">
                and {week.remaining} more
              </Text>
            )}
          </Box>
        ))}
      </SimpleGrid>
    </FilmSection>
  );
}
