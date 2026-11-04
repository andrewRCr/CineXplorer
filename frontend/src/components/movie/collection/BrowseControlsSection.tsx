import { useState, useCallback, useEffect, useRef } from "react";
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
  /** Whether advanced filters are currently applied (for toggle button indicator) */
  hasActiveAdvancedFilters?: boolean;
  browseParams: BrowseParams;
  onBrowseParamsChange: (
    params: Partial<BrowseParams> | ((prev: BrowseParams) => BrowseParams),
  ) => void;
  onToggleAdvancedPanel: () => void;
  /** Direct setter for advanced panel state (for auto-close without override logic) */
  onSetAdvancedPanelOpen?: (open: boolean) => void;
  source?: string;
}

const BrowseControlsSection = ({
  showControls,
  isAdvancedPanelOpen,
  hasActiveAdvancedFilters = false,
  browseParams,
  onBrowseParamsChange,
  onToggleAdvancedPanel,
  onSetAdvancedPanelOpen,
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
  const forceExpandTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // Collapse when: scrolled past threshold AND scrolling down AND not force-expanded
  // Expand when: scrolling up OR at top of page (direction === 'idle') OR force-expanded
  const isSubNavCollapsed =
    isPastThreshold && direction === "down" && !forceExpand;

  // Auto-close advanced panel when scrolling down (user is browsing, not filtering)
  // This treats the advanced panel as a transient "configuration mode" rather than
  // a persistent UI state. The QuickBrowseBar remains accessible for quick adjustments.
  useEffect(() => {
    if (isSubNavCollapsed && isAdvancedPanelOpen && onSetAdvancedPanelOpen) {
      onSetAdvancedPanelOpen(false);
    }
  }, [isSubNavCollapsed, isAdvancedPanelOpen, onSetAdvancedPanelOpen]);

  // Cleanup timeout on unmount to prevent state updates after unmount
  useEffect(() => {
    return () => {
      if (forceExpandTimeoutRef.current) {
        clearTimeout(forceExpandTimeoutRef.current);
      }
    };
  }, []);

  // Handle scroll-to-top action: expand sub-nav temporarily
  // The force expand will be naturally cleared when user scrolls again
  const handleScrollToTop = useCallback(() => {
    // Clear any existing timeout before setting a new one
    if (forceExpandTimeoutRef.current) {
      clearTimeout(forceExpandTimeoutRef.current);
    }
    setForceExpand(true);
    // Clear force expand after a short delay (scroll animation completes ~300ms)
    // The sub-nav will stay expanded due to direction='idle' at top of page
    forceExpandTimeoutRef.current = setTimeout(
      () => setForceExpand(false),
      500,
    );
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
            onToggleCollapse={onToggleAdvancedPanel}
            pageSource={source}
            isDrawerOpen={isAdvancedPanelOpen && !isSubNavCollapsed}
          />
        }
        isDrawerOpen={isAdvancedPanelOpen}
      >
        <QuickBrowseBar
          browseParams={browseParams}
          onBrowseParamsChange={onBrowseParamsChange}
          isAdvancedOpen={isAdvancedPanelOpen}
          hasActiveAdvancedFilters={hasActiveAdvancedFilters}
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
