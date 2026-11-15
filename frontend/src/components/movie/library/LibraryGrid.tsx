import { useEffect, useRef, useState, type ReactNode } from "react";
import { Box, Button, Spinner, Text } from "@chakra-ui/react";
import { useInfiniteQuery } from "@tanstack/react-query";
import useAuthContext from "@/hooks/auth/useAuthContext";
import { libraryPagesQuery } from "@/lib/queries";
import type { MovieListItem } from "@/types/movie";
import type { UserMoviesQueryParams } from "@/services/userMovieService";
import MovieCard from "@/components/movie/MovieCard";
import { GAP } from "@/components/movie/collection/shared/gridConstants";
import { GridSkeletonLoader } from "@/components/movie/collection/shared/GridSkeletonLoader";
import { useMeasuredLibrary } from "./useMeasuredLibrary";
import { libraryColumnCount } from "./libraryGrid";

export interface LibraryGridProps {
  params: UserMoviesQueryParams;
  source: string;
  errorMessage: string;
  empty: ReactNode;
  cellFooter?: (movie: MovieListItem) => ReactNode;
}
export default function LibraryGrid({
  params,
  source,
  errorMessage,
  empty,
  cellFooter,
}: LibraryGridProps) {
  const { status } = useAuthContext() ?? {};
  const query = useInfiniteQuery({
    ...libraryPagesQuery(params),
    enabled: status === "authenticated",
  });
  const seen = new Set<number>();
  const movies = (
    query.data?.pages.flatMap((page) => page.results ?? []) ?? []
  ).filter((movie) => {
    if (seen.has(movie.tmdb_id)) return false;
    seen.add(movie.tmdb_id);
    return true;
  });
  const container = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(1);
  const [scrollMargin, setScrollMargin] = useState(0);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const measure = () => {
      setColumns(libraryColumnCount(element.offsetWidth));
      setScrollMargin(element.getBoundingClientRect().top + window.scrollY);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const rowCount = Math.ceil(movies.length / columns);
  const virtualizer = useMeasuredLibrary({
    source,
    params,
    isLoading: query.isLoading,
    hasContent: movies.length > 0,
    isError: query.isError,
    count: rowCount,
    estimateSize: () => 449,
    gap: GAP,
    scrollMargin,
    overscan: 2,
  });
  const rows = virtualizer.getVirtualItems();
  const lastVisible = rows.at(-1)?.index ?? -1;
  const { hasNextPage, isFetching, isError, fetchNextPage } = query;
  useEffect(() => {
    if (
      !hasNextPage ||
      isFetching ||
      isError ||
      !rowCount ||
      lastVisible < rowCount - 2
    )
      return;
    const timer = setTimeout(() => {
      void fetchNextPage();
    }, 150);
    return () => clearTimeout(timer);
  }, [hasNextPage, isFetching, isError, fetchNextPage, lastVisible, rowCount]);
  const firstError = query.isError && !query.data;
  return (
    <Box ref={container}>
      {query.isLoading && (
        <Box role="status" aria-label="Loading films">
          <GridSkeletonLoader />
        </Box>
      )}
      {firstError && (
        <Box>
          <Text>{errorMessage}</Text>
          <Button
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            Retry
          </Button>
        </Box>
      )}
      {!query.isLoading && !query.isError && !movies.length && empty}
      {!!movies.length && (
        <Box
          role="grid"
          aria-label="Films"
          position="relative"
          height={`${virtualizer.getTotalSize()}px`}
        >
          {rows.map((row) => (
            <Box
              role="row"
              key={row.key}
              data-index={row.index}
              ref={virtualizer.measureElement}
              position="absolute"
              top={0}
              left={0}
              width="100%"
              transform={`translateY(${row.start - virtualizer.options.scrollMargin}px)`}
              display="grid"
              gridTemplateColumns={`repeat(${columns}, minmax(0, 1fr))`}
              gap={`${GAP}px`}
            >
              {movies
                .slice(row.index * columns, (row.index + 1) * columns)
                .map((movie) => (
                  <Box
                    role="gridcell"
                    key={movie.tmdb_id}
                    minW={0}
                    display="flex"
                    flexDirection="column"
                  >
                    <Box flex="1" minH={0}>
                      <MovieCard movie={movie} source={source} />
                    </Box>
                    {cellFooter && (
                      <Box
                        h="6"
                        mt={1}
                        flexShrink={0}
                        data-testid="film-date-slot"
                      >
                        {cellFooter(movie)}
                      </Box>
                    )}
                  </Box>
                ))}
            </Box>
          ))}
        </Box>
      )}
      {query.isFetchingNextPage && <Spinner aria-label="Loading more films" />}
      {query.isError && !!query.data && (
        <Box>
          <Text>{errorMessage}</Text>
          <Button
            disabled={query.isFetching}
            onClick={() => {
              if (query.isFetching) return;
              if (query.isFetchNextPageError) void query.fetchNextPage();
              else void query.refetch();
            }}
          >
            Retry
          </Button>
        </Box>
      )}
    </Box>
  );
}
