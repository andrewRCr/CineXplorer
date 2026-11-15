import { Select, createListCollection } from "@chakra-ui/react";
import { useMemo } from "react";
import {
  BROWSE_SELECT_TRIGGER_BASE_PROPS,
  BROWSE_SELECT_TRIGGER_CSS,
} from "@/components/movie/browse/selectStyles";
import type { LibrarySortOption } from "./librarySort";

interface Props {
  options: LibrarySortOption[];
  value: string;
  onChange: (value: string) => void;
}
export default function LibrarySortSelect({ options, value, onChange }: Props) {
  const collection = useMemo(
    () =>
      createListCollection({
        items: options.map((option) => ({
          label: option.label,
          value: `${option.sort}:${option.direction}`,
        })),
      }),
    [options],
  );
  return (
    <Select.Root
      collection={collection}
      value={[value]}
      display="flex"
      flexDirection="row"
      alignItems="center"
      gap={2}
      w="auto"
      onValueChange={({ value: values }) => {
        if (values[0]) onChange(values[0]);
      }}
    >
      <Select.Label color="on-muted" fontSize="sm">
        Sort by
      </Select.Label>
      <Select.Trigger
        {...BROWSE_SELECT_TRIGGER_BASE_PROPS}
        css={BROWSE_SELECT_TRIGGER_CSS}
        w="210px"
        borderRadius="sm"
      >
        <Select.ValueText />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Positioner>
        <Select.Content>
          {collection.items.map((item) => (
            <Select.Item key={item.value} item={item}>
              {item.label}
              <Select.ItemIndicator />
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Positioner>
    </Select.Root>
  );
}
