/**
 * CollapsibleSubNav - A fixed sub-navigation bar below the navbar
 *
 * Sits directly below the main navbar and collapses/expands based on scroll
 * state. Used for QuickBrowseBar on list-view pages (browse, upcoming, search).
 *
 * Features:
 * - Fixed position below navbar using layout-navbar CSS variable
 * - Smooth slide animation for collapse/expand
 * - Full viewport width
 * - Proper z-index layering (below navbar, above content)
 * - Accessibility support (aria-hidden when collapsed)
 *
 * @example
 * ```tsx
 * const { isPastThreshold, direction } = useScrollState();
 * const isCollapsed = isPastThreshold && direction === 'down';
 *
 * <CollapsibleSubNav isCollapsed={isCollapsed}>
 *   <QuickBrowseBar />
 * </CollapsibleSubNav>
 * ```
 */

import { Box } from "@chakra-ui/react";
import type { ReactNode } from "react";

export interface CollapsibleSubNavProps {
  /** Content to render inside the sub-nav (typically QuickBrowseBar) */
  children: ReactNode;

  /** Whether the sub-nav is collapsed (slid up off-screen) */
  isCollapsed: boolean;
}

/** Test ID for component identification in tests */
const SUB_NAV_TEST_ID = "collapsible-sub-nav";

/** Transition duration for collapse/expand animation */
const TRANSITION_DURATION = "250ms";

/** Z-index: below navbar (which uses z-index token "navbar"), above page content */
const Z_INDEX = 10;

/**
 * A fixed sub-navigation bar that collapses when scrolling down
 */
export function CollapsibleSubNav({
  children,
  isCollapsed,
}: CollapsibleSubNavProps) {
  return (
    <Box
      as="nav"
      data-testid={SUB_NAV_TEST_ID}
      aria-label="Browse filters"
      aria-hidden={isCollapsed}
      // Positioning: fixed below navbar, full width
      position="fixed"
      top="var(--chakra-sizes-layout-navbar)"
      left={0}
      width="100vw"
      zIndex={Z_INDEX}
      // Styling: match navbar appearance
      bg="layer-01"
      borderBottomWidth="1px"
      borderColor="border-strong-01"
      boxShadow="sm"
      // Animation: slide up/down
      transform={isCollapsed ? "translateY(-100%)" : "translateY(0%)"}
      transition={`transform ${TRANSITION_DURATION} ease-out`}
      // Performance optimization for animations
      style={{ willChange: "transform" }}
    >
      {children}
    </Box>
  );
}
