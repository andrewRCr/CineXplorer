import { Box } from "@chakra-ui/react";
import AdvancedFiltersPanel from "@/components/movie/browse/AdvancedFiltersPanel";
import QuickBrowseBar from "@/components/movie/browse/QuickBrowseBar";
import { CollapsibleSubNav } from "@/components/layout/CollapsibleSubNav";
import { useScrollState } from "@/hooks/useScrollState";
import type { BrowseParams } from "@/types/browseTypes";

/** Scroll threshold before sub-nav collapses (px) */
const COLLAPSE_THRESHOLD = 200;

/** Minimum scroll delta to trigger direction change (prevents flicker) */
const SCROLL_HYSTERESIS = 15;

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
  // Track scroll state for collapsible sub-nav behavior
  const { direction, isPastThreshold } = useScrollState({
    threshold: COLLAPSE_THRESHOLD,
    hysteresis: SCROLL_HYSTERESIS,
  });

  // Collapse when: scrolled past threshold AND scrolling down
  // Expand when: scrolling up OR at top of page (direction === 'idle')
  const isSubNavCollapsed = isPastThreshold && direction === "down";

  if (!showControls) return null;

  return (
    <>
      {/* Collapsible sub-nav with QuickBrowseBar */}
      <CollapsibleSubNav isCollapsed={isSubNavCollapsed}>
        <QuickBrowseBar
          browseParams={browseParams}
          onBrowseParamsChange={onBrowseParamsChange}
          isAdvancedOpen={isAdvancedPanelOpen}
          onToggleAdvanced={onToggleAdvancedPanel}
          pageSource={source}
        />
      </CollapsibleSubNav>

      {/* Note: Top padding for sub-nav space is handled by MovieCollectionLayout */}

      {/* Advanced filters panel (shown when toggled open) - stays in content area */}
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
