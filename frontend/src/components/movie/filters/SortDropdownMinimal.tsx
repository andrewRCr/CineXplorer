import { Box, Text, Select, createListCollection } from "@chakra-ui/react";
import { minimalSortOptions } from "@/constants/movieFilterOptions";
import type { MovieFilters as UnifiedMovieFilters } from "./AdvancedMovieFilters";

const SORT_WIDTH = "170px";

interface SortDropdownMinimalProps {
  filters: UnifiedMovieFilters;
  onSortChange: (sortBy: string) => void;
}

const SortDropdownMinimal = ({
  filters,
  onSortChange,
}: SortDropdownMinimalProps) => {
  const getCurrentSortValue = () => {
    // This function maps the API sort value (from filters.sortBy)
    // back to the value used by the minimal dropdown's sortOptions.
    const apiValue = filters.sortBy;
    switch (apiValue) {
      case "vote_average.desc":
        return "vote_average.desc";
      case "vote_average.asc":
        return "vote_average.asc";
      case "popularity.desc":
        return "popularity.desc";
      case "original_title.asc":
        return "original_title.asc";
      case "original_title.desc":
        return "original_title.desc";
      default:
        return apiValue;
    }
  };

  const currentSortValue = getCurrentSortValue();
  const isSortCustom = !minimalSortOptions.some(
    (opt) => opt.value === currentSortValue
  );

  const sortDisplayValue = () => {
    if (isSortCustom) return "custom";
    return currentSortValue;
  };

  const sortCollection = createListCollection({
    items: [
      ...(isSortCustom ? [{ label: "Custom", value: "custom" }] : []),
      ...minimalSortOptions.map((option) => ({
        label: option.label,
        value: option.value,
      })),
    ],
  });

  return (
    <>
      {/* Spacer to separate filters from sort */}
      <Box width="20px" flexShrink={0} />

      {/* Sort by label */}
      <Text
        fontSize="sm"
        fontWeight="400"
        fontFamily="inter"
        color="on-muted"
        alignSelf="center"
        flexShrink={0}
        mr={2}
      >
        Sort by
      </Text>

      {/* Sort dropdown */}
      <Box position="relative">
        <Select.Root
          collection={sortCollection}
          value={[sortDisplayValue()]}
          onValueChange={(details) => {
            if (details.value[0]) {
              onSortChange(details.value[0]);
            }
          }}
          disabled={isSortCustom}
          positioning={{ placement: "bottom-start", gutter: 2 }}
        >
          <Select.Trigger
            w={SORT_WIDTH}
            minH="32px"
            h="32px"
            fontSize="14px"
            lineHeight="1.2"
            borderRadius="4px"
            border="1px solid"
            // DESIGN: Uses button-outline (not input) for visual consistency with adjacent filter dropdowns
            borderColor="button-outline"
            backgroundColor="transparent"
            _hover={{
              bg: "tertiary/8",
            }}
            _focusVisible={{
              borderColor: "tertiary",
            }}
            _disabled={{
              opacity: 1,
              cursor: "not-allowed",
            }}
            css={{
              padding: "6px 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              "& > span": {
                fontStyle: isSortCustom ? "italic" : "normal",
                color: isSortCustom ? "on-muted" : "foreground",
              },
              "& [data-part='indicator']": {
                width: "16px",
                height: "16px",
              },
            }}
          >
            <Select.ValueText placeholder="Sort by" />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Positioner>
            <Select.Content
              w={SORT_WIDTH}
              bg="muted"
              borderColor="border-subtle-02"
              color="foreground"
            >
              {sortCollection.items.map((item) => {
                const isSelected = currentSortValue === item.value;
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
    </>
  );
};

export default SortDropdownMinimal;
