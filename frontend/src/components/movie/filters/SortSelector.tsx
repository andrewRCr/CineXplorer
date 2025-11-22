import { Box, Text, Select, createListCollection } from "@chakra-ui/react";
import {
  advancedSortOptions,
  type SortOptionValue,
} from "@/constants/movieFilterOptions";

interface SortSelectorProps {
  value: SortOptionValue;
  onChange: (sort: SortOptionValue) => void;
}

const SORT_WIDTH = "240px";

const SortSelector = ({ value, onChange }: SortSelectorProps) => {
  const sortCollection = createListCollection({
    items: advancedSortOptions.map((option) => ({
      label: option.label,
      value: option.value,
    })),
  });

  return (
    <Box>
      <Text fontSize="sm" fontWeight="medium" mb={2} color="foreground">
        Sort By
      </Text>
      <Select.Root
        collection={sortCollection}
        value={[value]}
        onValueChange={(details) => {
          if (details.value.length > 0) {
            onChange(details.value[0] as SortOptionValue);
          }
        }}
        positioning={{ placement: "bottom-start", gutter: 2 }}
      >
        <Select.Trigger
          w={SORT_WIDTH}
          minH="32px"
          h="32px"
          fontSize="14px"
          lineHeight="1.3"
          borderColor="border-strong-01"
          _hover={{ borderColor: "border-strong-02", bg: "tertiary/8" }}
          _focusVisible={{ borderColor: "tertiary", outline: "none" }}
          css={{
            padding: "6px 12px",
            "& [data-part='indicator']": {
              width: "16px",
              height: "16px",
            },
          }}
        >
          <Select.ValueText />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Positioner>
          <Select.Content w={SORT_WIDTH}>
            {sortCollection.items.map((item) => {
              const isSelected = value === item.value;
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
  );
};

export default SortSelector;
