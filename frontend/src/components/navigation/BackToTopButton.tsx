/**
 * BackToTopButton - A floating action button for returning to top of page
 *
 * Appears after scrolling past a threshold and smoothly scrolls to top when clicked.
 * Integrates with CollapsibleSubNav via callback to expand sub-navigation on scroll.
 *
 * Features:
 * - Uses useScrollState hook for visibility control
 * - Smooth scroll animation to top
 * - Callback prop for notifying parent components (e.g., sub-nav expand)
 * - Accessible with aria-label and keyboard support
 * - Fixed position in bottom-right corner with viewport padding
 */

import { IconButton } from "@chakra-ui/react";
import { LuChevronUp } from "react-icons/lu";
import { Tooltip } from "@/components/core/chakra/tooltip";
import { useScrollState } from "@/hooks/useScrollState";

export interface BackToTopButtonProps {
  /**
   * Scroll distance (px) before button appears
   * @default 200
   */
  threshold?: number;

  /**
   * Callback fired when button is clicked (before scroll starts)
   * Use to expand CollapsibleSubNav or other scroll-aware components
   */
  onScrollToTop?: () => void;
}

/**
 * Floating button that appears after scrolling and returns user to top of page
 *
 * @example
 * ```tsx
 * // Basic usage
 * <BackToTopButton />
 *
 * // With callback for sub-nav expansion
 * <BackToTopButton
 *   onScrollToTop={() => setSubNavCollapsed(false)}
 *   threshold={300}
 * />
 * ```
 */
export function BackToTopButton({
  threshold = 200,
  onScrollToTop,
}: BackToTopButtonProps) {
  const { isPastThreshold } = useScrollState({ threshold });

  const handleClick = () => {
    // Notify parent before scrolling (e.g., to expand sub-nav)
    onScrollToTop?.();

    // Smooth scroll to top
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // Don't render when not scrolled past threshold
  if (!isPastThreshold) {
    return null;
  }

  return (
    <Tooltip content="Back to top" positioning={{ placement: "left" }}>
      <IconButton
        aria-label="Scroll to top"
        data-testid="back-to-top-button"
        onClick={handleClick}
        position="fixed"
        bottom="6"
        right="6"
        zIndex="docked"
        size="lg"
        variant="solid"
        rounded="full"
        shadow="lg"
      >
        <LuChevronUp data-testid="back-to-top-icon" />
      </IconButton>
    </Tooltip>
  );
}
