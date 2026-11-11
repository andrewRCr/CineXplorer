import { Text, HStack } from "@chakra-ui/react";
import type { BrowseParams } from "@/types/browseTypes";
import { DEFAULT_BROWSE_PARAMS } from "@/constants/browseDefaults";
import ConnectedDropdowns from "./ConnectedDropdowns";
import SortDropdown from "./SortDropdown";
import ClearBrowseParamsButton from "./ClearBrowseParamsButton";

interface QuickBrowseBarProps {
  browseParams: BrowseParams;
  onBrowseParamsChange: (
    params: Partial<BrowseParams> | ((prev: BrowseParams) => BrowseParams),
  ) => void;
  isAdvancedOpen?: boolean;
  /** Whether advanced filters are currently applied (for toggle button indicator) */
  hasActiveAdvancedFilters?: boolean;
  onToggleAdvanced?: () => void;
  pageSource?: string;
}

const QuickBrowseBar = ({
  browseParams,
  onBrowseParamsChange,
  isAdvancedOpen = false,
  hasActiveAdvancedFilters = false,
  onToggleAdvanced,
  pageSource,
}: QuickBrowseBarProps) => {
  const updateParam = <K extends keyof BrowseParams>(
    key: K,
    value: BrowseParams[K],
  ) => {
    onBrowseParamsChange((prev) => {
      return { ...prev, [key]: value };
    });
  };

  // Clear filters but preserve sort (sort is user preference, not a filter)
  const clearFilters = () => {
    onBrowseParamsChange({
      ...DEFAULT_BROWSE_PARAMS,
      sortBy: browseParams.sortBy, // Preserve current sort preference
    });
  };

  const handleSortChange = (sortBy: string) => {
    updateParam("sortBy", sortBy as BrowseParams["sortBy"]);
  };

  return (
    <HStack w="100%" py={2} justify="center" align="center" gap={0}>
      {/* Browse by label */}
      <Text
        fontSize="sm"
        fontWeight="400"
        fontFamily="body"
        color="on-muted"
        mr={2}
        flexShrink={0}
      >
        Browse by
      </Text>

      {/* Filter dropdowns (Genre, Year, Advanced toggle) */}
      <ConnectedDropdowns
        filters={browseParams}
        onFiltersChange={onBrowseParamsChange}
        onToggleAdvanced={onToggleAdvanced}
        isAdvancedOpen={isAdvancedOpen}
        hasActiveAdvancedFilters={hasActiveAdvancedFilters}
        pageSource={pageSource}
      />

      {/* Clear filters - icon button after filters, before sort (clears filters only) */}
      <ClearBrowseParamsButton
        browseParams={browseParams}
        onClear={clearFilters}
        isAdvancedOpen={isAdvancedOpen}
      />

      {/* Sort dropdown */}
      <SortDropdown
        browseParams={browseParams}
        onSortChange={handleSortChange}
        pageSource={pageSource}
      />
    </HStack>
  );
};

export default QuickBrowseBar;
