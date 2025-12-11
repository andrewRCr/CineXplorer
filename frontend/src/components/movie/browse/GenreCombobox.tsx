import { useMemo, useState, useEffect } from "react";
import {
  Box,
  Combobox,
  HStack,
  Portal,
  Tag,
  Text,
  Flex,
  useFilter,
  useListCollection,
} from "@chakra-ui/react";
import { genreOptions } from "@/constants/browseOptions";

interface GenreComboboxProps {
  selectedGenres: number[];
  onChange: (genres: number[]) => void;
  /** When false, auto-closes the dropdown (e.g., when drawer collapses) */
  isOpen?: boolean;
}

// Filter out "Any Genre" placeholder and map to combobox format
const genreItems = genreOptions
  .filter((g) => g.value !== "")
  .map((g) => ({
    label: g.label,
    value: g.value, // string ID
  }));

// Max visible tags before showing "+N more"
const MAX_VISIBLE_TAGS = 3;

// Match other filter control widths
const COMBOBOX_WIDTH = "180px";

const GenreCombobox = ({
  selectedGenres,
  onChange,
  isOpen: isDrawerOpen = true,
}: GenreComboboxProps) => {
  const { contains } = useFilter({ sensitivity: "base" });

  const { collection, filter } = useListCollection({
    initialItems: genreItems,
    filter: contains,
  });

  // Controlled open state - auto-closes when drawer closes
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Close dropdown when drawer closes
  useEffect(() => {
    if (!isDrawerOpen) {
      setIsDropdownOpen(false);
    }
  }, [isDrawerOpen]);

  // Convert numeric IDs to string array for Combobox value prop
  const selectedValues = useMemo(
    () => selectedGenres.map((id) => String(id)),
    [selectedGenres]
  );

  // Get genre labels for selected items (for tag display)
  const selectedLabels = useMemo(() => {
    return selectedGenres
      .map((id) => {
        const genre = genreItems.find((g) => g.value === String(id));
        return genre ? { id, label: genre.label } : null;
      })
      .filter(Boolean) as { id: number; label: string }[];
  }, [selectedGenres]);

  const visibleTags = selectedLabels.slice(0, MAX_VISIBLE_TAGS);
  const overflowCount = selectedLabels.length - MAX_VISIBLE_TAGS;

  const handleValueChange = (details: Combobox.ValueChangeDetails) => {
    // Convert string values back to numbers
    const numericIds = details.value.map((v) => Number(v));
    onChange(numericIds);
  };

  const handleRemoveGenre = (genreId: number) => {
    onChange(selectedGenres.filter((id) => id !== genreId));
  };

  const handleInputChange = (details: Combobox.InputValueChangeDetails) => {
    filter(details.inputValue);
  };

  const handleOpenChange = (details: Combobox.OpenChangeDetails) => {
    setIsDropdownOpen(details.open);
  };

  // Placeholder changes based on selection
  const placeholder =
    selectedGenres.length > 0
      ? `${selectedGenres.length} selected`
      : "All genres";

  return (
    <Box>
      {/* Label row with tags */}
      <Flex align="center" gap={2} mb={2} flexWrap="wrap">
        <Text fontSize="sm" fontWeight="medium" color="foreground">
          Genres
        </Text>

        {/* Selected tags appear next to label */}
        {visibleTags.map(({ id, label }) => (
          <Tag.Root key={id} size="sm" variant="subtle" colorPalette="gray">
            <Tag.Label>{label}</Tag.Label>
            <Tag.EndElement>
              <Tag.CloseTrigger
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveGenre(id);
                }}
              />
            </Tag.EndElement>
          </Tag.Root>
        ))}
        {overflowCount > 0 && (
          <Tag.Root size="sm" variant="outline" colorPalette="gray">
            <Tag.Label>+{overflowCount} more</Tag.Label>
          </Tag.Root>
        )}
      </Flex>

      <Combobox.Root
        collection={collection}
        multiple
        closeOnSelect={false}
        value={selectedValues}
        onValueChange={handleValueChange}
        onInputValueChange={handleInputChange}
        open={isDropdownOpen}
        onOpenChange={handleOpenChange}
        width={COMBOBOX_WIDTH}
      >
        <Combobox.Control
          border="1px solid"
          borderColor="button-outline"
          borderRadius="4px"
          bg="transparent"
          _hover={{ bg: "tertiary/8" }}
          _focusWithin={{ borderColor: "tertiary" }}
          h="32px"
          minH="32px"
        >
          <HStack gap={0} flex={1} h="100%">
            <Combobox.Input
              placeholder={placeholder}
              bg="transparent"
              border="none"
              outline="none"
              flex={1}
              h="100%"
              px={3}
              _focus={{ outline: "none", boxShadow: "none" }}
              _placeholder={{
                color: selectedGenres.length > 0 ? "primary" : "foreground",
              }}
              color="foreground"
              fontSize="14px"
            />
          </HStack>
          <Combobox.IndicatorGroup pr={2}>
            <Combobox.Trigger />
          </Combobox.IndicatorGroup>
        </Combobox.Control>

        <Portal>
          <Combobox.Positioner>
            <Combobox.Content
              bg="layer-02"
              borderColor="border-subtle-02"
              color="foreground"
              maxH="300px"
              overflowY="auto"
              zIndex="popover"
              minW={COMBOBOX_WIDTH}
            >
              <Combobox.Empty color="muted">No genres found</Combobox.Empty>
              {collection.items.map((item) => {
                const isSelected = selectedValues.includes(item.value);
                return (
                  <Combobox.Item
                    key={item.value}
                    item={item}
                    bg={isSelected ? "tertiary/12" : undefined}
                    color="foreground"
                    _hover={{
                      bg: isSelected ? "tertiary/20" : "layer-hover-02",
                    }}
                    _highlighted={{
                      bg: isSelected ? "tertiary/20" : "layer-hover-02",
                    }}
                  >
                    <Combobox.ItemText>{item.label}</Combobox.ItemText>
                    <Combobox.ItemIndicator />
                  </Combobox.Item>
                );
              })}
            </Combobox.Content>
          </Combobox.Positioner>
        </Portal>
      </Combobox.Root>
    </Box>
  );
};

export default GenreCombobox;
