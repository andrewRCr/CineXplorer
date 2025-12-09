import { Box } from "@chakra-ui/react";
import AdvancedFiltersPanel from "@/components/movie/browse/AdvancedFiltersPanel";
import QuickBrowseBar from "@/components/movie/browse/QuickBrowseBar";
import type { BrowseParams } from "@/types/browseTypes";

interface BrowseControlsSectionProps {
  showControls: boolean;
  isAdvancedPanelOpen: boolean;
  browseParams: BrowseParams;
  onBrowseParamsChange: (
    params:
      | Partial<BrowseParams>
      | ((prev: BrowseParams) => BrowseParams)
  ) => void;
  onToggleAdvancedPanel: () => void;
  source?: string;
}

const BrowseControlsSection = ({
  showControls,
  isAdvancedPanelOpen,
  browseParams,
  onBrowseParamsChange,
  onToggleAdvancedPanel,
  source,
}: BrowseControlsSectionProps) => {
  if (!showControls) return null;

  return (
    <>
      {/* Quick browse bar with toggle for advanced panel */}
      <Box flexShrink={0} mb={2} minHeight="40px">
        <QuickBrowseBar
          browseParams={browseParams}
          onBrowseParamsChange={onBrowseParamsChange}
          isAdvancedOpen={isAdvancedPanelOpen}
          onToggleAdvanced={onToggleAdvancedPanel}
          pageSource={source}
        />
      </Box>

      {/* Advanced filters panel (shown when toggled open) */}
      {isAdvancedPanelOpen && (
        <Box flexShrink={0} mb={6}>
          <AdvancedFiltersPanel
            browseParams={browseParams}
            onBrowseParamsChange={onBrowseParamsChange}
            isCollapsed={false}
            onToggleCollapse={onToggleAdvancedPanel}
            pageSource={source}
          />
        </Box>
      )}
    </>
  );
};

export default BrowseControlsSection;
