import { Box } from "@chakra-ui/react";
import AdvancedFiltersPanel from "@/components/movie/browse/AdvancedFiltersPanel";
import QuickBrowseBar from "@/components/movie/browse/QuickBrowseBar";
import type { BrowseParams } from "@/types/browseTypes";

interface FilterSectionProps {
  showFilters: boolean;
  filterStyle: "expanded" | "minimal";
  showAdvanced: boolean;
  filters: BrowseParams;
  onFiltersChange: (
    filters:
      | Partial<BrowseParams>
      | ((prev: BrowseParams) => BrowseParams)
  ) => void;
  onToggleAdvanced: () => void;
  isFiltersCollapsed: boolean;
  onToggleCollapse: () => void;
  source?: string;
}

const FilterSection = ({
  showFilters,
  filterStyle,
  showAdvanced,
  filters,
  onFiltersChange,
  onToggleAdvanced,
  isFiltersCollapsed,
  onToggleCollapse,
  source,
}: FilterSectionProps) => {
  if (!showFilters) return null;

  return (
    <>
      {/* Minimal filter style */}
      {filterStyle === "minimal" && (
        <Box flexShrink={0} mb={2} minHeight="40px">
          <QuickBrowseBar
            browseParams={filters}
            onBrowseParamsChange={onFiltersChange}
            isAdvancedOpen={showAdvanced}
            onToggleAdvanced={onToggleAdvanced}
            pageSource={source}
          />
        </Box>
      )}

      {/* Expanded filter style */}
      {filterStyle === "expanded" && (
        <Box flexShrink={0} mb={6} minHeight="200px">
          <AdvancedFiltersPanel
            browseParams={filters}
            onBrowseParamsChange={onFiltersChange}
            isCollapsed={isFiltersCollapsed}
            onToggleCollapse={onToggleCollapse}
            pageSource={source}
          />
        </Box>
      )}

      {/* Advanced filters overlay for minimal style */}
      {showAdvanced && filterStyle === "minimal" && (
        <Box flexShrink={0} mb={6}>
          <AdvancedFiltersPanel
            browseParams={filters}
            onBrowseParamsChange={onFiltersChange}
            isCollapsed={false}
            onToggleCollapse={() => onToggleAdvanced()}
            pageSource={source}
          />
        </Box>
      )}
    </>
  );
};

export default FilterSection;
