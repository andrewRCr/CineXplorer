import { Box, Text, HStack, VStack } from "@chakra-ui/react";
import type { BrowseParams } from "@/types/browseTypes";
import { DEFAULT_BROWSE_PARAMS } from "@/constants/browseDefaults";
import ConnectedDropdowns from "./ConnectedDropdowns";
import SortDropdown from "./SortDropdown";
import ClearBrowseParamsButton from "./ClearBrowseParamsButton";

interface QuickBrowseBarProps {
  browseParams: BrowseParams;
  onBrowseParamsChange: (
    params:
      | Partial<BrowseParams>
      | ((prev: BrowseParams) => BrowseParams)
  ) => void;
  isAdvancedOpen?: boolean;
  onToggleAdvanced?: () => void;
  pageSource?: string;
}

const QuickBrowseBar = ({
  browseParams,
  onBrowseParamsChange,
  isAdvancedOpen = false,
  onToggleAdvanced,
  pageSource,
}: QuickBrowseBarProps) => {
  const updateParam = <K extends keyof BrowseParams>(
    key: K,
    value: BrowseParams[K]
  ) => {
    onBrowseParamsChange((prev) => {
      return { ...prev, [key]: value };
    });
  };

  const clearBrowseParams = () => {
    onBrowseParamsChange({ ...DEFAULT_BROWSE_PARAMS });
  };

  const handleSortChange = (sortBy: string) => {
    updateParam("sortBy", sortBy as BrowseParams["sortBy"]);
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

          {/* Browse controls */}
          <HStack gap={1} align="center">
            {/* Wrapper for dropdowns and clear button */}
            <Box position="relative">
              <ConnectedDropdowns
                filters={browseParams}
                onFiltersChange={onBrowseParamsChange}
                onToggleAdvanced={onToggleAdvanced}
                pageSource={pageSource}
              />
              <ClearBrowseParamsButton
                browseParams={browseParams}
                onClear={clearBrowseParams}
                isAdvancedOpen={isAdvancedOpen}
              />
            </Box>

            <SortDropdown
              browseParams={browseParams}
              onSortChange={handleSortChange}
              pageSource={pageSource}
            />
          </HStack>
        </HStack>
      </Box>
    </VStack>
  );
};

export default QuickBrowseBar;
