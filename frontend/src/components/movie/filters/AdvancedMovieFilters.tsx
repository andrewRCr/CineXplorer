import { useCallback, useMemo } from "react";
import {
  Box,
  VStack,
  Button,
  HStack,
  Text,
  Separator,
  Select,
  createListCollection,
} from "@chakra-ui/react";
import { FiFilter, FiX } from "react-icons/fi";
import GenreSelector from "./GenreSelector";
import YearSelector from "./YearSelector";
import RatingSelector from "./RatingSelector";
import { languageOptions } from "@/constants/movieFilterOptions";
import {
  DEFAULT_FILTERS,
  DEFAULT_SORT,
  type MovieFilters,
} from "@/constants/filterDefaults";
import type { MinimalMovieFilters } from "./LetterboxdStyleFilters";

// Re-export for consumers that import from here
export type { MovieFilters };

interface MovieFiltersProps {
  filters: MovieFilters;
  minimalFilters?: MinimalMovieFilters;
  onFiltersChange: (
    filtersOrUpdater:
      | Partial<MovieFilters>
      | ((prevFilters: MovieFilters) => MovieFilters)
  ) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  pageSource?: string;
}

const LANGUAGE_WIDTH = "160px";

const AdvancedMovieFilters = ({
  filters,
  minimalFilters,
  onFiltersChange,
  isCollapsed = false,
  onToggleCollapse,
  pageSource,
}: MovieFiltersProps) => {
  const languageCollection = useMemo(
    () =>
      createListCollection({
        items: languageOptions.map((option) => ({
          label: option.label,
          value: option.value,
        })),
      }),
    []
  );

  const updateFilter = useCallback(
    <K extends keyof MovieFilters>(key: K, value: MovieFilters[K]) => {
      onFiltersChange((prevFilters) => ({
        ...prevFilters,
        [key]: value,
      }));
    },
    [onFiltersChange]
  );

  const clearFilters = useCallback(() => {
    onFiltersChange({ ...DEFAULT_FILTERS });
  }, [onFiltersChange]);

  const hasAdvancedActiveFilters =
    filters.query ||
    filters.genres.length > 0 ||
    filters.minYear ||
    filters.maxYear ||
    filters.minRating ||
    filters.maxRating ||
    filters.minRuntime ||
    filters.maxRuntime ||
    filters.language ||
    filters.sortBy !== DEFAULT_SORT;

  const hasMinimalActiveFilters = minimalFilters
    ? minimalFilters.genres.length > 0 || minimalFilters.year !== ""
    : false;

  const hasActiveFilters = hasAdvancedActiveFilters || hasMinimalActiveFilters;

  if (isCollapsed) {
    return (
      <Box mb={4}>
        <Button
          onClick={onToggleCollapse}
          variant="outline"
          size="sm"
          borderColor="button-outline"
          color="on-button-outline"
          _hover={{
            bg: "tertiary/8",
            borderColor: "tertiary",
            color: "tertiary",
          }}
        >
          <FiFilter style={{ marginRight: "6px" }} />
          {hasActiveFilters ? "Filters (Active)" : "Filters"}
        </Button>
      </Box>
    );
  }

  return (
    <Box
      mb={0}
      ml={4}
      p={6}
      border="1px solid"
      borderColor="border-strong-01"
      borderRadius="md"
      bg="layer-01"
      boxShadow="shadow-sm"
    >
      <HStack justify="space-between" mb={4}>
      <Text fontSize="lg" fontWeight="medium" color="foreground">
          Advanced Filters
        </Text>
        <HStack>
          {hasActiveFilters && (
            <Button
              onClick={clearFilters}
              size="sm"
              variant="ghost"
              color="destructive"
              _hover={{ bg: "tertiary/8", color: "destructive" }}
            >
              <FiX style={{ marginRight: "6px" }} />
              Clear Filters
            </Button>
          )}
          {onToggleCollapse && (
            <Button
              onClick={onToggleCollapse}
              size="sm"
              variant="ghost"
              color="tertiary"
              _hover={{ bg: "tertiary/8", color: "tertiary-hover" }}
            >
              <FiFilter style={{ marginRight: "6px" }} />
              Collapse
            </Button>
          )}
        </HStack>
      </HStack>

      <VStack gap={4} align="stretch">
        <GenreSelector
          selectedGenres={filters.genres}
          onChange={(genres) => updateFilter("genres", genres)}
        />

        <Separator borderColor="border-subtle-01" />

        <HStack justify="center" align="start" gap={8}>
          <Box>
            <YearSelector
              minYear={filters.minYear}
              maxYear={filters.maxYear}
              onMinYearChange={(year) => updateFilter("minYear", year)}
              onMaxYearChange={(year) => updateFilter("maxYear", year)}
              pageSource={pageSource}
            />
          </Box>
          <Box>
            <RatingSelector
              minRating={filters.minRating}
              maxRating={filters.maxRating}
              onMinRatingChange={(rating) => updateFilter("minRating", rating)}
              onMaxRatingChange={(rating) => updateFilter("maxRating", rating)}
            />
          </Box>
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={2} color="foreground">
              Language
            </Text>
            <Select.Root
              collection={languageCollection}
              value={filters.language ? [filters.language] : [""]}
              onValueChange={(details) => {
                updateFilter("language", details.value[0] ?? "");
              }}
              positioning={{ placement: "bottom-start", gutter: 2 }}
            >
              <Select.Trigger
                w={LANGUAGE_WIDTH}
                minH="32px"
                h="32px"
                fontSize="14px"
                lineHeight="1.2"
                borderRadius="4px"
                border="1px solid"
                borderColor="button-outline"
                backgroundColor="transparent"
                _hover={{ bg: "tertiary/8" }}
                _focusVisible={{ borderColor: "tertiary" }}
                css={{
                  padding: "6px 12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  "& [data-part='indicator']": {
                    width: "16px",
                    height: "16px",
                  },
                }}
              >
                <Select.ValueText placeholder="All Languages" />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Positioner>
                <Select.Content
                  w={LANGUAGE_WIDTH}
                  bg="muted"
                  borderColor="border-subtle-02"
                  color="foreground"
                  maxH="300px"
                  overflowY="auto"
                >
                  {languageCollection.items.map((item) => {
                    const isSelected = filters.language === item.value;
                    return (
                      <Select.Item
                        key={item.value}
                        item={item}
                        bg={isSelected ? "tertiary" : undefined}
                        color={isSelected ? "on-tertiary" : "foreground"}
                        _hover={{
                          bg: isSelected ? "tertiary" : "tertiary/12",
                          color: isSelected ? "on-tertiary" : "foreground",
                        }}
                      >
                        {item.label}
                      </Select.Item>
                    );
                  })}
                </Select.Content>
              </Select.Positioner>
            </Select.Root>
          </Box>
        </HStack>
      </VStack>
    </Box>
  );
};

export default AdvancedMovieFilters;
