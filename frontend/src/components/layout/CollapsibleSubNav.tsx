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

import { Box, Flex, Separator } from "@chakra-ui/react";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

export interface CollapsibleSubNavProps {
  /** Content to render inside the sub-nav (typically QuickBrowseBar) */
  children: ReactNode;

  /** Whether the sub-nav is collapsed (slid up off-screen) */
  isCollapsed: boolean;

  /** Optional drawer content that appears directly beneath the sub-nav */
  drawerContent?: ReactNode;

  /** Controls visibility of the drawer content */
  isDrawerOpen?: boolean;

  /** Callback fired when the total height (nav + drawer) changes */
  onHeightChange?: (height: number) => void;
}

/** Test ID for component identification in tests */
const SUB_NAV_TEST_ID = "collapsible-sub-nav";

/** Transition duration for collapse/expand animation */
const TRANSITION_DURATION = "250ms";

/**
 * Z-index: BELOW navbar so sub-nav slides "under" navbar when collapsing.
 * Navbar uses zIndex="navbar" (10), so we use 9 to ensure navbar covers us.
 */
const Z_INDEX = 9;

const CONTENT_MAX_WIDTH = "1200px";
const DRAWER_TEST_ID = "collapsible-sub-nav-drawer";

/**
 * A fixed sub-navigation bar that collapses when scrolling down
 */
export function CollapsibleSubNav({
  children,
  isCollapsed,
  drawerContent,
  isDrawerOpen = false,
  onHeightChange,
}: CollapsibleSubNavProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const ResizeObserverImpl = useRef<typeof ResizeObserver | undefined>(
    typeof ResizeObserver !== "undefined" ? ResizeObserver : undefined,
  );

  // Use ref to avoid effect re-runs when callback identity changes
  const onHeightChangeRef = useRef(onHeightChange);
  onHeightChangeRef.current = onHeightChange;

  // Report height changes (for spacing calculations in parent layouts)
  useEffect(() => {
    if (
      !onHeightChangeRef.current ||
      !containerRef.current ||
      !ResizeObserverImpl.current
    )
      return;

    const observer = new ResizeObserverImpl.current((entries) => {
      const entry = entries[0];
      if (entry?.contentRect?.height != null) {
        onHeightChangeRef.current?.(entry.contentRect.height);
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <Box
      ref={containerRef}
      as="nav"
      data-testid={SUB_NAV_TEST_ID}
      aria-label="Browse filters"
      aria-hidden={isCollapsed}
      // Positioning: fixed below navbar, full width
      position="fixed"
      top="var(--chakra-sizes-layout-navbar)"
      left={0}
      right={0}
      width="100%"
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
      <Box px={4}>
        <Box maxW={CONTENT_MAX_WIDTH} mx="auto" w="100%">
          {children}
        </Box>
      </Box>

      {drawerContent ? (
        <Box
          data-testid={DRAWER_TEST_ID}
          aria-hidden={!isDrawerOpen}
          pointerEvents={isDrawerOpen ? "auto" : "none"}
          maxHeight={isDrawerOpen ? "800px" : "0px"}
          opacity={isDrawerOpen ? 1 : 0}
          overflow="hidden"
          bg="layer-01"
          transition={`max-height 220ms ease, opacity 160ms ease`}
        >
          {/* Centered separator between QuickBrowseBar and drawer content */}
          <Flex justify="center" px={4} pt={1}>
            <Separator w="60%" borderColor="border-subtle-01" />
          </Flex>
          <Box maxW={CONTENT_MAX_WIDTH} mx="auto" w="100%" px={4} pt={3} pb={2}>
            {drawerContent}
          </Box>
        </Box>
      ) : null}
    </Box>
  );
}
