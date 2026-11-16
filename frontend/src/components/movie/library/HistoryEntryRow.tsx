import { Badge, Box, HStack, Image, Text } from "@chakra-ui/react";
import PosterPlaceholder from "@/assets/PosterPlaceholder";
import { TextLink } from "@/components/common";
import { RatingStars } from "@/components/movie/RatingStars";
import { RewatchIcon } from "@/components/movie/RewatchIcon";
import type { HistoryEntry } from "@/services/userMovieDataService";
import { calendarDate } from "./calendarDate";

export default function HistoryEntryRow({
  entry,
  showDay,
}: {
  entry: HistoryEntry;
  showDay: boolean;
}) {
  return (
    <HStack
      as="article"
      aria-label={entry.title}
      align="start"
      gap={3}
      py={3}
      borderBottomWidth="1px"
      borderColor="border-subtle-01"
    >
      <Text w="14" flexShrink={0} color="on-muted" fontSize="sm">
        {showDay
          ? calendarDate(entry.day, { month: "short", day: "numeric" })
          : null}
      </Text>
      <Box w="12" h="18" flexShrink={0} overflow="hidden" borderRadius="sm">
        {entry.poster_path ? (
          <Image
            src={`https://image.tmdb.org/t/p/w92${entry.poster_path}`}
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
      <Box minW={0} flex="1">
        <HStack gap={2} flexWrap="wrap">
          <TextLink
            to={`/movie/${entry.tmdb_id}?from=history`}
            color="foreground"
            fontWeight="semibold"
          >
            {entry.title}
          </TextLink>
          {entry.release_date && (
            <Text color="on-muted" fontSize="sm">
              {entry.release_date.slice(0, 4)}
            </Text>
          )}
        </HStack>
        <HStack gap={2} mt={1}>
          <RatingStars rating={entry.rating} size="sm" />
          {entry.kind === "review" ? (
            <Badge variant="neutral">Review</Badge>
          ) : entry.rewatch ? (
            <RewatchIcon />
          ) : null}
        </HStack>
        {entry.review && (
          <Text fontSize="sm" mt={1} lineClamp={2} whiteSpace="pre-wrap">
            {entry.review}
          </Text>
        )}
      </Box>
    </HStack>
  );
}
