import { Box, Heading, Text } from "@chakra-ui/react";
import { TextLink } from "@/components/common";
import LibraryGrid from "@/components/movie/library/LibraryGrid";
import LibrarySortSelect from "@/components/movie/library/LibrarySortSelect";
import { watchlistSorts } from "@/components/movie/library/librarySort";
import { useLibrarySort } from "@/hooks/movie/useLibrarySort";

export default function Watchlist() {
  const { sort, direction, value, onChange } = useLibrarySort(watchlistSorts);
  return (
    <Box py={4}>
      <Heading as="h1" mb={4}>
        Watchlist
      </Heading>
      <Box mb={4}>
        <LibrarySortSelect
          options={watchlistSorts}
          value={value}
          onChange={onChange}
        />
      </Box>
      <LibraryGrid
        params={{ watchlist: true, sort, direction }}
        source="watchlist"
        errorMessage="Couldn't load your watchlist."
        empty={
          <Box>
            <Text>Your watchlist is empty</Text>
            <TextLink to="/browse">Explore films</TextLink>
          </Box>
        }
      />
    </Box>
  );
}
