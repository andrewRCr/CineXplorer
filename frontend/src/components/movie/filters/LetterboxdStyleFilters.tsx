import { Box, Text, HStack, VStack } from "@chakra-ui/react";
import type { BrowseParams } from "@/types/browseTypes";
import { DEFAULT_BROWSE_PARAMS } from "@/constants/browseDefaults";
import ConnectedDropdowns from "./ConnectedDropdowns";
import CollapsibleSearchBox from "./CollapsibleSearchBox";
import SortDropdown from "./SortDropdown";
import ClearFiltersButton from "./ClearFiltersButton";

interface LetterboxdStyleFiltersProps {
  filters: BrowseParams;
  onFiltersChange: (
    filters:
      | Partial<BrowseParams>
      | ((prev: BrowseParams) => BrowseParams)
  ) => void;
  showAdvanced?: boolean;
  onToggleAdvanced?: () => void;
  pageSource?: string; // Add page context for smart disabling
}

const LetterboxdStyleFilters = ({
  filters,
  onFiltersChange,
  showAdvanced = false,
  onToggleAdvanced,
  pageSource,
}: LetterboxdStyleFiltersProps) => {
  const updateFilter = <K extends keyof BrowseParams>(
    key: K,
    value: BrowseParams[K]
  ) => {
    onFiltersChange((prevFilters) => {
      const newFilters = { ...prevFilters, [key]: value };
      return newFilters;
    });
  };

  const clearFilters = () => {
    onFiltersChange({ ...DEFAULT_BROWSE_PARAMS });
  };

  const handleQueryChange = (query: string) => {
    updateFilter("query", query);
  };

  const handleSortChange = (sortBy: string) => {
    updateFilter("sortBy", sortBy as BrowseParams["sortBy"]);
  };

  return (
    <VStack
      w="100%"
      p={4}
      bg="background"
      gap={4}
      align="stretch"
      overflow="visible"
    >
      <Box
        maxW="1200px"
        w="100%"
        mx="auto"
        display="flex"
        flexDirection="column"
        gap={4}
      >
        {/* Main filter controls container */}
        <HStack justify="center" align="stretch" w="100%">
          {/* Browse by label */}
          <Text
            fontSize="sm"
            fontWeight="400"
            fontFamily="inter"
            color="on-muted"
            mr={2}
            alignSelf="center"
            flexShrink={0}
          >
            Browse by
          </Text>

          {/* Connected dropdowns and search */}
          <HStack gap={1} align="center" flex="1" maxW="1000px">
            {/* Wrapper for dropdowns and clear button */}
            <Box position="relative">
              <ConnectedDropdowns
                filters={filters}
                onFiltersChange={onFiltersChange}
                onToggleAdvanced={onToggleAdvanced}
                pageSource={pageSource}
              />
              <ClearFiltersButton
                filters={filters}
                onClearFilters={clearFilters}
                showAdvanced={showAdvanced}
              />
            </Box>

            <SortDropdown
              filters={filters}
              onSortChange={handleSortChange}
              pageSource={pageSource}
            />

            {/* Spacer before search */}
            <Box width="20px" flexShrink={0} />

            <CollapsibleSearchBox
              query={filters.query}
              onQueryChange={handleQueryChange}
              pageSource={pageSource}
            />
          </HStack>
        </HStack>
      </Box>
    </VStack>
  );
};

export default LetterboxdStyleFilters;
