import { Box, Button, Flex, HStack, Text } from "@chakra-ui/react";
import { useSearchParams } from "react-router";
import { TextLink } from "@/components/common";
import LibraryGrid from "@/components/movie/library/LibraryGrid";
import LibrarySortSelect from "@/components/movie/library/LibrarySortSelect";
import { filmSorts } from "@/components/movie/library/librarySort";
import { calendarDate } from "@/components/movie/library/calendarDate";
import { useLibrarySort } from "@/hooks/movie/useLibrarySort";
import { LibraryLogButton } from "@/components/movie/library/LibraryLogButton";

export default function LibraryFilms() {
  const [params, setParams] = useSearchParams();
  const liked = params.get("liked") === "true";
  const rated = params.get("rated") === "true";
  const { sort, direction, value, onChange } = useLibrarySort(filmSorts);
  function toggle(field: "liked" | "rated", enabled: boolean) {
    const next = new URLSearchParams(params);
    if (enabled) next.set(field, "true");
    else next.delete(field);
    void setParams(next, { replace: true });
  }
  function clearFilters() {
    const next = new URLSearchParams(params);
    next.delete("liked");
    next.delete("rated");
    void setParams(next, { replace: true });
  }
  return (
    <Box as="section" aria-label="Films">
      <Flex gap={2} mb={4} flexWrap="wrap" alignItems="center">
        <Button
          variant="subtle"
          selected={liked}
          aria-pressed={liked}
          onClick={() => toggle("liked", !liked)}
        >
          Liked
        </Button>
        <Button
          variant="subtle"
          selected={rated}
          aria-pressed={rated}
          onClick={() => toggle("rated", !rated)}
        >
          Rated
        </Button>
        <LibrarySortSelect
          options={filmSorts}
          value={value}
          onChange={onChange}
        />
      </Flex>
      <LibraryGrid
        params={{
          watched: true,
          liked: liked || undefined,
          rated: rated || undefined,
          sort,
          direction,
        }}
        source="library"
        errorMessage="Couldn't load your films."
        empty={
          liked || rated ? (
            <Box>
              <Text>No films match</Text>
              <Button variant="subtle" onClick={clearFilters}>
                Clear filters
              </Button>
            </Box>
          ) : (
            <Box>
              <Text>Your Library is empty</Text>
              <HStack gap={3} mt={2}>
                <TextLink to="/browse">Explore films</TextLink>
                <LibraryLogButton />
              </HStack>
            </Box>
          )
        }
        cellFooter={(movie) =>
          movie.user_movie_data?.last_logged_on ? (
            <Text fontSize="xs" color="on-muted" whiteSpace="nowrap">
              Last watched{" "}
              {calendarDate(movie.user_movie_data.last_logged_on, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </Text>
          ) : null
        }
      />
    </Box>
  );
}
