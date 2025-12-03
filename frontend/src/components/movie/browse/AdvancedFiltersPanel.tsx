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
import GenreSelector from "../filters/GenreSelector";
import YearSelector from "../filters/YearSelector";
import RatingSelector from "../filters/RatingSelector";
import { languageOptions } from "@/constants/browseOptions";
import { DEFAULT_BROWSE_PARAMS, DEFAULT_SORT } from "@/constants/browseDefaults";
import type { BrowseParams } from "@/types/browseTypes";

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
}

const LANGUAGE_WIDTH = "160px";

const AdvancedFiltersPanel = ({
  browseParams,
  onBrowseParamsChange,
  isCollapsed = false,
  onToggleCollapse,
  pageSource,
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

  const clearBrowseParams = useCallback(() => {
    onBrowseParamsChange({ ...DEFAULT_BROWSE_PARAMS });
  }, [onBrowseParamsChange]);

  const hasActiveParams =
    browseParams.query ||
    browseParams.genres.length > 0 ||
    browseParams.minYear ||
    browseParams.maxYear ||
    browseParams.minRating ||
    browseParams.maxRating ||
    browseParams.minRuntime ||
    browseParams.maxRuntime ||
    browseParams.language ||
    browseParams.sortBy !== DEFAULT_SORT;

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
          {hasActiveParams && (
            <Button
              onClick={clearBrowseParams}
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
          selectedGenres={browseParams.genres}
          onChange={(genres) => updateParam("genres", genres)}
        />

        <Separator borderColor="border-subtle-01" />

        <HStack justify="center" align="start" gap={8}>
          <Box>
            <YearSelector
              minYear={browseParams.minYear}
              maxYear={browseParams.maxYear}
              onMinYearChange={(year) => updateParam("minYear", year)}
              onMaxYearChange={(year) => updateParam("maxYear", year)}
              pageSource={pageSource}
            />
          </Box>
          <Box>
            <RatingSelector
              minRating={browseParams.minRating}
              maxRating={browseParams.maxRating}
              onMinRatingChange={(rating) => updateParam("minRating", rating)}
              onMaxRatingChange={(rating) => updateParam("maxRating", rating)}
            />
          </Box>
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
        </HStack>
      </VStack>
    </Box>
  );
};

export default AdvancedFiltersPanel;
