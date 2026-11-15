import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Heading,
  Skeleton,
  Spinner,
  Text,
} from "@chakra-ui/react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useMeasuredLibrary } from "@/components/movie/library/useMeasuredLibrary";
import useAuthContext from "@/hooks/auth/useAuthContext";
import { historyPagesQuery } from "@/lib/queries";
import { TextLink } from "@/components/common";
import { calendarDate } from "@/components/movie/library/calendarDate";
import { historyTimeline } from "@/components/movie/library/historyTimeline";
import HistoryEntryRow from "@/components/movie/library/HistoryEntryRow";

export default function LibraryHistory() {
  const { status } = useAuthContext() ?? {};
  const query = useInfiniteQuery({
    ...historyPagesQuery(),
    enabled: status === "authenticated",
  });
  const items = useMemo(
    () =>
      historyTimeline(query.data?.pages.flatMap((page) => page.results) ?? []),
    [query.data],
  );
  const container = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const measure = () =>
      setScrollMargin(element.getBoundingClientRect().top + window.scrollY);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const getItemKey = useCallback(
    (index: number) => items[index]?.key ?? index,
    [items],
  );
  const virtualizer = useMeasuredLibrary({
    source: "history",
    params: {},
    isLoading: query.isLoading,
    hasContent: items.length > 0,
    isError: query.isError,
    count: items.length,
    estimateSize: () => 100,
    getItemKey,
    scrollMargin,
    overscan: 3,
  });
  const rows = virtualizer.getVirtualItems();
  const lastVisible = rows.at(-1)?.index ?? -1;
  const { hasNextPage, isFetching, isError, fetchNextPage } = query;
  useEffect(() => {
    if (
      !hasNextPage ||
      isFetching ||
      isError ||
      !items.length ||
      lastVisible < items.length - 2
    )
      return;
    const timer = setTimeout(() => {
      void fetchNextPage();
    }, 150);
    return () => clearTimeout(timer);
  }, [
    hasNextPage,
    isFetching,
    isError,
    fetchNextPage,
    lastVisible,
    items.length,
  ]);
  const retry = () => {
    if (query.isFetching) return;
    if (query.isFetchNextPageError) void query.fetchNextPage();
    else void query.refetch();
  };
  const error = (
    <Box>
      <Text>Couldn't load your history.</Text>
      <Button disabled={query.isFetching} onClick={retry}>
        Retry
      </Button>
    </Box>
  );
  return (
    <Box as="section" aria-label="History" ref={container}>
      {query.isLoading && (
        <Box role="status" aria-label="Loading history">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} h="20" mb={3} bg="layer-02" />
          ))}
        </Box>
      )}
      {query.isError && !query.data && error}
      {!query.isLoading && !query.isError && !items.length && (
        <Box>
          <Text>Your history is empty</Text>
          <TextLink to="/browse">Explore films</TextLink>
        </Box>
      )}
      {!!items.length && (
        <Box position="relative" height={`${virtualizer.getTotalSize()}px`}>
          {rows.map((row) => {
            const item = items[row.index];
            if (!item) return null;
            return (
              <Box
                key={row.key}
                data-index={row.index}
                data-testid="history-row"
                ref={virtualizer.measureElement}
                position="absolute"
                top={0}
                left={0}
                width="100%"
                transform={`translateY(${row.start - virtualizer.options.scrollMargin}px)`}
              >
                {item.type === "month" ? (
                  <Heading as="h2" size="md" py={3}>
                    {calendarDate(item.day, { month: "long", year: "numeric" })}
                  </Heading>
                ) : (
                  <HistoryEntryRow entry={item.entry} showDay={item.showDay} />
                )}
              </Box>
            );
          })}
        </Box>
      )}
      {query.isError && !!query.data && error}
      {query.isFetchingNextPage && (
        <Spinner aria-label="Loading more history" />
      )}
    </Box>
  );
}
