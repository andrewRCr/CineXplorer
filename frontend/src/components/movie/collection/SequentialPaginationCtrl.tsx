/**
 * SequentialPaginationCtrl - Simple prev/next pagination without page numbers
 *
 * A minimal pagination control for sequential navigation through results.
 * Used as alternative to infinite scroll for A/B comparison testing.
 *
 * Features:
 * - Simple prev/next buttons only (no random access)
 * - Loading state support
 * - Accessible with aria-labels and keyboard navigation
 */

import { Box, ButtonGroup, IconButton } from "@chakra-ui/react";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";
import { memo, useCallback } from "react";

export interface SequentialPaginationCtrlProps {
  /** Whether there are previous results available */
  hasPrev: boolean;
  /** Whether there are more results available */
  hasNext: boolean;
  /** Callback when prev button is clicked */
  onPrev: () => void;
  /** Callback when next button is clicked */
  onNext: () => void;
  /** Whether data is currently loading (disables both buttons) */
  isLoading?: boolean;
}

/**
 * Sequential pagination control with prev/next buttons
 *
 * @example
 * ```tsx
 * <SequentialPaginationCtrl
 *   hasPrev={currentPage > 1}
 *   hasNext={hasNextPage}
 *   onPrev={() => setPage(p => p - 1)}
 *   onNext={() => setPage(p => p + 1)}
 *   isLoading={isFetching}
 * />
 * ```
 */
export const SequentialPaginationCtrl = memo(function SequentialPaginationCtrl({
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  isLoading = false,
}: SequentialPaginationCtrlProps) {
  const handlePrev = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (hasPrev && !isLoading) {
        onPrev();
      }
    },
    [hasPrev, isLoading, onPrev]
  );

  const handleNext = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (hasNext && !isLoading) {
        onNext();
      }
    },
    [hasNext, isLoading, onNext]
  );

  const isPrevDisabled = !hasPrev || isLoading;
  const isNextDisabled = !hasNext || isLoading;

  return (
    <Box
      as="nav"
      aria-label="Pagination"
      data-testid="sequential-pagination-ctrl"
    >
      <ButtonGroup variant="ghost" size="sm">
        <IconButton
          aria-label="Previous page"
          color="foreground"
          borderColor="button-outline"
          disabled={isPrevDisabled}
          onClick={handlePrev}
        >
          <LuChevronLeft />
        </IconButton>

        <IconButton
          aria-label="Next page"
          color="foreground"
          borderColor="button-outline"
          disabled={isNextDisabled}
          onClick={handleNext}
        >
          <LuChevronRight />
        </IconButton>
      </ButtonGroup>
    </Box>
  );
});
