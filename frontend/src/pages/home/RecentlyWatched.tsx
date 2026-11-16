import { Box, HStack, Image, Text } from "@chakra-ui/react";
import type { UseQueryResult } from "@tanstack/react-query";
import type { ActivityPage } from "@/services/userMovieDataService";
import { FilmSection } from "@/components/movie/sections/FilmSection";
import PosterPlaceholder from "@/assets/PosterPlaceholder";
import { TextLink } from "@/components/common";
import { RatingStars } from "@/components/movie/RatingStars";
import { RewatchIcon } from "@/components/movie/RewatchIcon";
import { calendarDate } from "@/components/movie/library/calendarDate";

export function RecentlyWatched({
  result,
}: {
  result: UseQueryResult<ActivityPage>;
}) {
  const viewings = result.data?.results ?? [];
  return (
    <FilmSection
      title="Recently watched"
      seeAll="/library/history"
      result={result}
      films={viewings}
    >
      <Box as="ul" listStyleType="none" m={0} p={0}>
        {viewings.map((viewing) => (
          <HStack
            as="li"
            key={viewing.id}
            align="start"
            gap={3}
            py={3}
            borderBottomWidth="1px"
            borderColor="border-subtle-01"
          >
            <Box
              w="12"
              h="18"
              flexShrink={0}
              overflow="hidden"
              borderRadius="sm"
            >
              {viewing.poster_path ? (
                <Image
                  src={`https://image.tmdb.org/t/p/w92${viewing.poster_path}`}
                  alt=""
                  w="100%"
                  h="100%"
                  objectFit="cover"
                />
              ) : (
                <PosterPlaceholder
                  w="100%"
                  h="100%"
                  aria-hidden="true"
                  focusable="false"
                />
              )}
            </Box>
            <Box minW={0}>
              <HStack gap={2} flexWrap="wrap">
                <TextLink
                  to={`/movie/${viewing.tmdb_id}?from=home`}
                  color="foreground"
                  fontWeight="semibold"
                >
                  {viewing.title}
                </TextLink>
                {viewing.release_date && (
                  <Text color="on-muted" fontSize="sm">
                    {viewing.release_date.slice(0, 4)}
                  </Text>
                )}
              </HStack>
              <HStack gap={2} mt={1} flexWrap="wrap">
                {viewing.watched_on && (
                  <Text asChild color="on-muted" fontSize="sm">
                    <time dateTime={viewing.watched_on}>
                      {calendarDate(viewing.watched_on, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </time>
                  </Text>
                )}
                {viewing.rewatch && <RewatchIcon />}
                <RatingStars rating={viewing.rating} size="sm" />
              </HStack>
            </Box>
          </HStack>
        ))}
      </Box>
    </FilmSection>
  );
}
