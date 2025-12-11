import { useCallback, useMemo } from "react";
import {
  Box,
  VStack,
  Button,
  HStack,
  Text,
  Select,
  createListCollection,
  Flex,
} from "@chakra-ui/react";
import { FiChevronUp, FiFilter, FiX } from "react-icons/fi";
import GenrePopover from "./GenrePopover";
import YearSelector from "./YearSelector";
import RatingSelector from "./RatingSelector";
import CertificationFilter from "./CertificationFilter";
import { languageOptions } from "@/constants/browseOptions";
import { DEFAULT_BROWSE_PARAMS } from "@/constants/browseDefaults";
import type { BrowseParams } from "@/types/browseTypes";
import { hasActiveFilters } from "@/utilities/browseParamUtils";

interface AdvancedFiltersPanelProps {
  browseParams: BrowseParams;
  onBrowseParamsChange: (
    paramsOrUpdater:
      | Partial<BrowseParams>
      | ((prev: BrowseParams) => BrowseParams)
  ) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  pageSource?: string;
  /** Whether the drawer containing this panel is open (for auto-closing dropdowns) */
  isDrawerOpen?: boolean;
}

const LANGUAGE_WIDTH = "160px";

const AdvancedFiltersPanel = ({
  browseParams,
  onBrowseParamsChange,
  isCollapsed = false,
  onToggleCollapse,
  pageSource,
  isDrawerOpen = true,
}: AdvancedFiltersPanelProps) => {
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

  const updateParam = useCallback(
    <K extends keyof BrowseParams>(key: K, value: BrowseParams[K]) => {
      onBrowseParamsChange((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    [onBrowseParamsChange]
  );

  // Clear filters but preserve sort (sort is user preference, not a filter)
  const clearFilters = useCallback(() => {
    onBrowseParamsChange({
      ...DEFAULT_BROWSE_PARAMS,
      sortBy: browseParams.sortBy, // Preserve current sort preference
    });
  }, [onBrowseParamsChange, browseParams.sortBy]);

  // Use hasActiveFilters (excludes sort) for button visibility
  const hasActiveParams = hasActiveFilters(browseParams);

  // Collapsed state: show expand button (used when not in drawer context)
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
          {hasActiveParams ? "Filters (Active)" : "Filters"}
        </Button>
      </Box>
    );
  }

  // Drawer layout: compact 3-row design
  // Row 1: Genres (full) | Certifications
  // Row 2: Language | Year range | Rating range
  // Row 3: Clear/Collapse buttons (right-aligned)
  return (
    <VStack gap={3} align="center" w="100%">
      {/* Row 1: Genres + Certifications side by side */}
      <Flex gap={6} wrap="wrap" align="flex-start" justify="center">
        <GenrePopover
          selectedGenres={browseParams.genres}
          onChange={(genres) => updateParam("genres", genres)}
          isOpen={isDrawerOpen}
        />

        <CertificationFilter
          selectedCertifications={browseParams.certifications}
          onChange={(certifications) =>
            updateParam("certifications", certifications)
          }
        />
      </Flex>

      {/* Row 2: Language, Year, Rating */}
      <Flex gap={6} wrap="wrap" align="flex-start" justify="center">
        <Box>
          <Text fontSize="sm" fontWeight="medium" mb={2} color="foreground">
            Language
          </Text>
          <Select.Root
            collection={languageCollection}
            value={browseParams.language ? [browseParams.language] : [""]}
            onValueChange={(details) => {
              updateParam("language", details.value[0] ?? "");
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
                "& > span": {
                  transition: "color 0.15s ease-out 0.05s",
                  color: browseParams.language
                    ? "var(--chakra-colors-primary)"
                    : "var(--chakra-colors-foreground)",
                },
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
                bg="layer-02"
                borderColor="border-subtle-02"
                color="foreground"
                maxH="300px"
                overflowY="auto"
                zIndex="popover"
              >
                {languageCollection.items.map((item) => {
                  const isSelected = browseParams.language === item.value;
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

        <YearSelector
          minYear={browseParams.minYear}
          maxYear={browseParams.maxYear}
          onMinYearChange={(year) => updateParam("minYear", year)}
          onMaxYearChange={(year) => updateParam("maxYear", year)}
          pageSource={pageSource}
        />

        <RatingSelector
          minRating={browseParams.minRating}
          maxRating={browseParams.maxRating}
          onMinRatingChange={(rating) => updateParam("minRating", rating)}
          onMaxRatingChange={(rating) => updateParam("maxRating", rating)}
        />
      </Flex>

      {/* Row 3: Action buttons - right-aligned, minimal top spacing */}
      <HStack gap={0} justify="flex-end" w="100%" mt={-2}>
        {hasActiveParams && (
          <Button
            onClick={clearFilters}
            size="xs"
            variant="ghost"
            color="destructive"
            _hover={{ bg: "destructive/12", color: "destructive" }}
          >
            <FiX style={{ marginRight: "2px" }} />
            Clear
          </Button>
        )}
        {onToggleCollapse && (
          <Button
            onClick={onToggleCollapse}
            size="xs"
            variant="ghost"
            color="tertiary"
            _hover={{ bg: "tertiary/8", color: "tertiary-hover" }}
          >
            <FiChevronUp style={{ marginRight: "2px" }} />
            Collapse
          </Button>
        )}
      </HStack>
    </VStack>
  );
};

export default AdvancedFiltersPanel;
