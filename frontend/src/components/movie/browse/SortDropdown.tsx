import { useMemo } from "react";
import { Box, Text, Select, createListCollection } from "@chakra-ui/react";
import { getAvailableSortOptions } from "@/utilities/sortAvailabilityUtils";
import type { BrowseParams } from "@/types/browseTypes";
import {
  BROWSE_SELECT_TRIGGER_BASE_PROPS,
  BROWSE_SELECT_TRIGGER_CSS,
} from "./selectStyles";

const SORT_WIDTH = "170px";

interface SortDropdownProps {
  browseParams: BrowseParams;
  onSortChange: (sortBy: string) => void;
  pageSource?: string;
}

const SortDropdown = ({
  browseParams,
  onSortChange,
  pageSource,
}: SortDropdownProps) => {
  const currentSortValue = browseParams.sortBy;

  // Get available sort options based on language (hides title sorts for non-Latin)
  const availableSortOptions = useMemo(
    () => getAvailableSortOptions(browseParams.language),
    [browseParams.language]
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
            {...BROWSE_SELECT_TRIGGER_BASE_PROPS}
            borderRadius="4px"
            // DESIGN: Uses button-outline (not input) for visual consistency with adjacent filter dropdowns
            css={BROWSE_SELECT_TRIGGER_CSS}
          >
            <Select.ValueText placeholder="Sort by" />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Positioner>
            <Select.Content w={SORT_WIDTH}>
              {sortCollection.items.map((item) => {
                const isDisabled = item.disabled === true;
                return (
                  <Select.Item
                    key={item.value}
                    item={item}
                    fontStyle={isDisabled ? "italic" : "normal"}
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
