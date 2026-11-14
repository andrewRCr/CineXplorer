import { useId, type ReactNode } from "react";
import {
  Box,
  Button,
  Flex,
  Heading,
  Link,
  Skeleton,
  Text,
} from "@chakra-ui/react";
import { Link as RouterLink } from "react-router";
import type {
  QueryKey,
  UseQueryOptions,
  UseQueryResult,
} from "@tanstack/react-query";
import type { MovieListItem, MovieListResponse } from "@/types/movie";

export type FilmQuery<Key extends QueryKey> = UseQueryOptions<
  MovieListResponse,
  Error,
  MovieListResponse,
  Key
>;
interface FilmSectionProps {
  title: string;
  seeAll?: string;
  controls?: ReactNode;
  result: Pick<
    UseQueryResult<MovieListResponse>,
    "isPending" | "isError" | "isFetching" | "refetch"
  >;
  films: MovieListItem[];
  children: ReactNode;
}

export function FilmSection({
  title,
  seeAll,
  controls,
  result,
  films,
  children,
}: FilmSectionProps) {
  const heading = useId();
  if (!result.isPending && !result.isError && films.length === 0) return null;
  return (
    <Box
      as="section"
      aria-labelledby={heading}
      py={{ base: 5, lg: 8 }}
      minW="0"
    >
      <Flex
        align="center"
        justify="space-between"
        gap={3}
        mb={4}
        flexWrap="wrap"
      >
        <Heading as="h2" id={heading} size="xl">
          {title}
        </Heading>
        <Flex align="center" gap={3}>
          {seeAll && (
            <Link asChild color="tertiary">
              <RouterLink to={seeAll}>See all</RouterLink>
            </Link>
          )}
          {!result.isPending && !result.isError && films.length > 0 && controls}
        </Flex>
      </Flex>
      {result.isPending || (result.isError && result.isFetching) ? (
        <Flex
          role="status"
          aria-label={`Loading ${title}`}
          gap={4}
          overflow="hidden"
        >
          {[0, 1, 2, 3].map((i) => (
            <Skeleton
              key={i}
              bg="layer-02"
              minW="138px"
              h="360px"
              flex="1"
              borderRadius="md"
            />
          ))}
        </Flex>
      ) : result.isError ? (
        <Box>
          <Text mb={3}>Couldn't load these films.</Text>
          <Button variant="outline" onClick={() => void result.refetch()}>
            Retry
          </Button>
        </Box>
      ) : (
        children
      )}
    </Box>
  );
}
