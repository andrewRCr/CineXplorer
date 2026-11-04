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
import { FiChevronUp, FiX } from "react-icons/fi";
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
      Partial<BrowseParams> | ((prev: BrowseParams) => BrowseParams),
  ) => void;
  onToggleCollapse?: () => void;
  pageSource?: string;
  /** Whether the drawer containing this panel is open (for auto-closing dropdowns) */
  isDrawerOpen?: boolean;
}

const LANGUAGE_WIDTH = "160px";

const AdvancedFiltersPanel = ({
  browseParams,
  onBrowseParamsChange,
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
    [],
  );

  const updateParam = useCallback(
    <K extends keyof BrowseParams>(key: K, value: BrowseParams[K]) => {
      onBrowseParamsChange((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    [onBrowseParamsChange],
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

  // Drawer layout: compact 3-row design
  // Row 1: Genres (full) | Certifications
  // Row 2: Language | Year range | Rating range
  // Row 3: Clear/Collapse buttons (right-aligned)
  return (
    <VStack gap={2} align="center" w="100%">
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
            {/* Custom styling to match StyledInput pattern on layer-01 */}
            <Select.Trigger
              w={LANGUAGE_WIDTH}
              minH="32px"
              h="32px"
              fontSize="14px"
              bg="transparent"
              borderColor="border-strong-01"
              _hover={{
                borderColor: "border-strong-02",
                bg: "tertiary/8",
              }}
              _focusVisible={{ borderColor: "tertiary" }}
              css={{
                padding: "0 12px",
              }}
            >
              <Select.ValueText
                placeholder="All Languages"
                color={browseParams.language ? "primary" : "foreground"}
              />
              <Select.Indicator color="foreground" />
            </Select.Trigger>
            <Select.Positioner>
              {/* Content uses selectRecipe base styles; custom overrides for width and scroll */}
              <Select.Content
                w={LANGUAGE_WIDTH}
                maxH="300px"
                overflowY="auto"
                zIndex="popover"
              >
                {languageCollection.items.map((item) => (
                  <Select.Item key={item.value} item={item}>
                    {item.label}
                  </Select.Item>
                ))}
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

      {/* Row 3: Action buttons - right-aligned */}
      <HStack gap={0} justify="flex-end" w="100%">
        {hasActiveParams && (
          <Button
            onClick={clearFilters}
            size="xs"
            variant="ghost"
            color="destructive"
            _hover={{ bg: "destructive/12", color: "destructive" }}
            aria-label="Clear all filters"
          >
            <Box as={FiX} mr="0.5" />
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
            aria-label="Collapse advanced filters"
          >
            <Box as={FiChevronUp} mr="0.5" />
            Collapse
          </Button>
        )}
      </HStack>
    </VStack>
  );
};

export default AdvancedFiltersPanel;
