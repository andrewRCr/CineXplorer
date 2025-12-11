import { useState, useCallback } from "react";
import AdvancedFiltersPanel from "@/components/movie/browse/AdvancedFiltersPanel";
import QuickBrowseBar from "@/components/movie/browse/QuickBrowseBar";
import { CollapsibleSubNav } from "@/components/layout/CollapsibleSubNav";
import { BackToTopButton } from "@/components/navigation/BackToTopButton";
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

  // Force expand state - temporarily overrides scroll-based collapse
  // Used by BackToTopButton to expand sub-nav when scrolling to top
  const [forceExpand, setForceExpand] = useState(false);

  // Collapse when: scrolled past threshold AND scrolling down AND not force-expanded
  // Expand when: scrolling up OR at top of page (direction === 'idle') OR force-expanded
  const isSubNavCollapsed =
    isPastThreshold && direction === "down" && !forceExpand;

  // Handle scroll-to-top action: expand sub-nav temporarily
  // The force expand will be naturally cleared when user scrolls again
  const handleScrollToTop = useCallback(() => {
    setForceExpand(true);
    // Clear force expand after a short delay (scroll animation completes ~300ms)
    // The sub-nav will stay expanded due to direction='idle' at top of page
    setTimeout(() => setForceExpand(false), 500);
  }, []);

  if (!showControls) return null;

  return (
    <>
      {/* Collapsible sub-nav with QuickBrowseBar */}
      <CollapsibleSubNav
        isCollapsed={isSubNavCollapsed}
        drawerContent={
          <AdvancedFiltersPanel
            browseParams={browseParams}
            onBrowseParamsChange={onBrowseParamsChange}
            isCollapsed={false}
            onToggleCollapse={onToggleAdvancedPanel}
            pageSource={source}
          />
        }
        isDrawerOpen={isAdvancedPanelOpen}
      >
        <QuickBrowseBar
          browseParams={browseParams}
          onBrowseParamsChange={onBrowseParamsChange}
          isAdvancedOpen={isAdvancedPanelOpen}
          onToggleAdvanced={onToggleAdvancedPanel}
          pageSource={source}
        />
      </CollapsibleSubNav>

      {/* Back to Top button - visible on scroll, expands sub-nav on click */}
      <BackToTopButton
        threshold={COLLAPSE_THRESHOLD}
        onScrollToTop={handleScrollToTop}
      />

      {/* Note: Top padding for sub-nav space is handled by MovieCollectionLayout */}
    </>
  );
};

export default BrowseControlsSection;
