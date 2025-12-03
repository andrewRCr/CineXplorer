import { useMemo } from "react";
import { Box, Text, Select, createListCollection } from "@chakra-ui/react";
import { getAvailableSortOptions } from "@/utilities/sortAvailability";
import type { BrowseParams } from "@/types/browseTypes";

const SORT_WIDTH = "170px";

interface SortDropdownProps {
  filters: BrowseParams;
  onSortChange: (sortBy: string) => void;
  pageSource?: string;
}

const SortDropdown = ({
  filters,
  onSortChange,
  pageSource,
}: SortDropdownProps) => {
  const currentSortValue = filters.sortBy;

  // Get available sort options based on language (hides title sorts for non-Latin)
  const availableSortOptions = useMemo(
    () => getAvailableSortOptions(filters.language),
    [filters.language]
  );

  // Disable "Highest Rated" in Upcoming view - upcoming movies have few/no votes,
  // so the STRICT vote threshold (200) filters out everything
  const sortCollection = useMemo(
    () =>
      createListCollection({
        items: availableSortOptions.map((option) => ({
          label: option.label,
          value: option.value,
          disabled:
            option.value === "vote_average.desc" && pageSource === "upcoming",
        })),
      }),
    [availableSortOptions, pageSource]
  );

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
          value={[currentSortValue]}
          onValueChange={(details) => {
            if (details.value[0]) {
              onSortChange(details.value[0]);
            }
          }}
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
                const isDisabled = item.disabled === true;
                return (
                  <Select.Item
                    key={item.value}
                    item={item}
                    bg={isSelected ? "tertiary" : undefined}
                    color={isSelected ? "on-tertiary" : "foreground"}
                    fontStyle={isDisabled ? "italic" : "normal"}
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

export default SortDropdown;
