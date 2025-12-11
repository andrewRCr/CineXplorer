/**
 * ResultsFooterBar - Footer section with optional pagination controls
 *
 * Displays a consistent footer below movie grids with:
 * - Top border separator
 * - Optional pagination controls (right-aligned)
 *
 * Used by SequentialMovieGrid for bottom pagination.
 * InfiniteMovieGrid has its own end-of-results indicator inline.
 */

import { Box } from "@chakra-ui/react";
import type { ReactNode } from "react";

export interface ResultsFooterBarProps {
  /** Optional pagination controls to render on the right side */
  paginationControls?: ReactNode;
  /** Whether to show the footer (false hides but preserves space) */
  visible?: boolean;
}

/**
 * Results footer bar with optional pagination
 *
 * @example
 * ```tsx
 * // Sequential pagination (with controls)
 * <ResultsFooterBar
 *   paginationControls={<SequentialPaginationCtrl {...props} />}
 *   visible={hasResults}
 * />
 * ```
 */
export function ResultsFooterBar({
  paginationControls,
  visible = true,
}: ResultsFooterBarProps) {
  return (
    <Box
      display="flex"
      justifyContent="flex-end"
      mb={1}
      mt={0}
      borderTop="1px solid"
      borderTopColor="border-subtle-00"
      minHeight="50px"
      paddingTop={4}
      opacity={visible ? 1 : 0}
      pointerEvents={visible ? "auto" : "none"}
      transition="opacity 0.2s ease"
    >
      {paginationControls && (
        <Box minWidth="200px" display="flex" justifyContent="flex-end">
          {paginationControls}
        </Box>
      )}
    </Box>
  );
}
