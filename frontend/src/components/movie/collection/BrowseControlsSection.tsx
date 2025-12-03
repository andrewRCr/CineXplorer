import { Box } from "@chakra-ui/react";
import AdvancedFiltersPanel from "@/components/movie/browse/AdvancedFiltersPanel";
import QuickBrowseBar from "@/components/movie/browse/QuickBrowseBar";
import type { BrowseParams } from "@/types/browseTypes";

interface BrowseControlsSectionProps {
  showControls: boolean;
  browseLayout: "expanded" | "compact";
  isAdvancedPanelOpen: boolean;
  browseParams: BrowseParams;
  onBrowseParamsChange: (
    params:
      | Partial<BrowseParams>
      | ((prev: BrowseParams) => BrowseParams)
  ) => void;
  onToggleAdvancedPanel: () => void;
  isFiltersCollapsed: boolean;
  onToggleCollapse: () => void;
  source?: string;
}

const BrowseControlsSection = ({
  showControls,
  browseLayout,
  isAdvancedPanelOpen,
  browseParams,
  onBrowseParamsChange,
  onToggleAdvancedPanel,
  isFiltersCollapsed,
  onToggleCollapse,
  source,
}: BrowseControlsSectionProps) => {
  if (!showControls) return null;

  return (
    <>
      {/* Compact browse layout */}
      {browseLayout === "compact" && (
        <Box flexShrink={0} mb={2} minHeight="40px">
          <QuickBrowseBar
            browseParams={browseParams}
            onBrowseParamsChange={onBrowseParamsChange}
            isAdvancedOpen={isAdvancedPanelOpen}
            onToggleAdvanced={onToggleAdvancedPanel}
            pageSource={source}
          />
        </Box>
      )}

      {/* Expanded browse layout */}
      {browseLayout === "expanded" && (
        <Box flexShrink={0} mb={6} minHeight="200px">
          <AdvancedFiltersPanel
            browseParams={browseParams}
            onBrowseParamsChange={onBrowseParamsChange}
            isCollapsed={isFiltersCollapsed}
            onToggleCollapse={onToggleCollapse}
            pageSource={source}
          />
        </Box>
      )}

      {/* Advanced filters overlay for compact layout */}
      {isAdvancedPanelOpen && browseLayout === "compact" && (
        <Box flexShrink={0} mb={6}>
          <AdvancedFiltersPanel
            browseParams={browseParams}
            onBrowseParamsChange={onBrowseParamsChange}
            isCollapsed={false}
            onToggleCollapse={() => onToggleAdvancedPanel()}
            pageSource={source}
          />
        </Box>
      )}
    </>
  );
};

export default BrowseControlsSection;
