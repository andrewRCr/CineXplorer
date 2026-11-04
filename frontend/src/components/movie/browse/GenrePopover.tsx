import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Checkbox,
  CheckboxGroup,
  Popover,
  Portal,
  SimpleGrid,
  Text,
} from "@chakra-ui/react";
import { FiChevronDown } from "react-icons/fi";
import { genreOptions } from "@/constants/browseOptions";

interface GenrePopoverProps {
  selectedGenres: number[];
  onChange: (genres: number[]) => void;
  /** When false, auto-closes the popover (e.g., when drawer collapses) */
  isOpen?: boolean;
}

// Filter out "Any Genre" placeholder
const genreItems = genreOptions
  .filter((g) => g.value !== "")
  .map((g) => ({
    label: g.label,
    value: g.value, // string ID
  }));

// Slightly narrower than other controls to fit with certs on same row
const TRIGGER_WIDTH = "140px";

const GenrePopover = ({
  selectedGenres,
  onChange,
  isOpen: isDrawerOpen = true,
}: GenrePopoverProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  // Close popover when drawer closes
  useEffect(() => {
    if (!isDrawerOpen) {
      setIsPopoverOpen(false);
    }
  }, [isDrawerOpen]);

  // Convert numeric IDs to string array for CheckboxGroup
  const selectedValues = selectedGenres.map((id) => String(id));

  const handleValueChange = (values: string[]) => {
    // Convert string values back to numbers (filter NaN for safety)
    const numericIds = values.map((v) => Number(v)).filter((n) => !isNaN(n));
    onChange(numericIds);
  };

  // Trigger button text
  const triggerText =
    selectedGenres.length > 0
      ? `${selectedGenres.length} selected`
      : "All genres";

  return (
    <Box>
      <Text fontSize="sm" fontWeight="medium" mb={2} color="foreground">
        Genres (full)
      </Text>

      <Popover.Root
        open={isPopoverOpen}
        onOpenChange={(details) => setIsPopoverOpen(details.open)}
        positioning={{ placement: "bottom-start", gutter: 4 }}
      >
        <Popover.Trigger asChild>
          <Button
            variant="outline"
            size="sm"
            w={TRIGGER_WIDTH}
            h="32px"
            justifyContent="space-between"
            fontWeight="normal"
            borderColor="button-outline"
            bg="transparent"
            color={selectedGenres.length > 0 ? "primary" : "foreground"}
            _hover={{ bg: "tertiary/8" }}
            _expanded={{ borderColor: "tertiary" }}
          >
            {triggerText}
            <FiChevronDown />
          </Button>
        </Popover.Trigger>

        <Portal>
          <Popover.Positioner>
            <Popover.Content
              bg="layer-02"
              borderColor="border-subtle-02"
              p={3}
              maxH="300px"
              overflowY="auto"
              w="320px"
            >
              <CheckboxGroup
                value={selectedValues}
                onValueChange={handleValueChange}
              >
                <SimpleGrid columns={2} gap={2}>
                  {genreItems.map((item) => {
                    const isSelected = selectedValues.includes(item.value);
                    return (
                      <Checkbox.Root
                        key={item.value}
                        value={item.value}
                        size="sm"
                        cursor="pointer"
                      >
                        <Checkbox.HiddenInput />
                        <Checkbox.Control
                          borderColor={
                            isSelected ? "tertiary" : "border-strong-01"
                          }
                          _checked={{
                            bg: "tertiary",
                            borderColor: "tertiary",
                          }}
                        />
                        <Checkbox.Label
                          fontSize="sm"
                          color="foreground"
                          cursor="pointer"
                        >
                          {item.label}
                        </Checkbox.Label>
                      </Checkbox.Root>
                    );
                  })}
                </SimpleGrid>
              </CheckboxGroup>
            </Popover.Content>
          </Popover.Positioner>
        </Portal>
      </Popover.Root>
    </Box>
  );
};

export default GenrePopover;
