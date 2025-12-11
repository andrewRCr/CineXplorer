/**
 * ResultsHeaderBar - Header section with results count and optional pagination controls
 *
 * Displays a consistent header above movie grids with:
 * - Left: Results count text (e.g., "Showing 1-20 of 500 results")
 * - Right: Optional pagination controls slot
 * - Bottom border separator
 *
 * Used by both InfiniteMovieGrid and SequentialMovieGrid with mode-specific
 * result text and controls.
 */

import { Box, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";

export interface ResultsHeaderBarProps {
  /** Results count text to display (e.g., "Showing 40 of 500 results") */
  resultText: string;
  /** Optional pagination controls to render on the right side */
  paginationControls?: ReactNode;
  /** Whether data is currently loading (dims the text) */
  isLoading?: boolean;
  /** Whether to show the header (false hides but preserves space) */
  visible?: boolean;
}

/**
 * Results header bar with count and optional pagination
 *
 * @example
 * ```tsx
 * // Infinite scroll (no pagination controls)
 * <ResultsHeaderBar
 *   resultText="Showing 40 of 500 results"
 *   isLoading={isLoading}
 *   visible={hasResults}
 * />
 *
 * // Sequential pagination (with controls)
 * <ResultsHeaderBar
 *   resultText="Showing 1-20 of 500 results"
 *   paginationControls={<SequentialPaginationCtrl {...props} />}
 *   isLoading={isLoading}
 *   visible={hasResults}
 * />
 * ```
 */
export function ResultsHeaderBar({
  resultText,
  paginationControls,
  isLoading = false,
  visible = true,
}: ResultsHeaderBarProps) {
  // Right-align text when no pagination controls (cleaner for infinite scroll)
  const hasControls = !!paginationControls;

  return (
    <Box
      display="flex"
      justifyContent={hasControls ? "space-between" : "flex-end"}
      alignItems="flex-end"
      mt={0}
      mb={6}
      flexWrap="wrap"
      gap={2}
      minHeight="40px"
      paddingBottom={4}
      borderBottom="1px solid"
      borderBottomColor="border-subtle-00"
      opacity={visible ? 1 : 0}
      pointerEvents={visible ? "auto" : "none"}
      transition="opacity 0.2s ease"
    >
      {/* Results count - left when controls present, right otherwise */}
      <Box
        minWidth="150px"
        display="flex"
        alignItems="flex-end"
        justifyContent={hasControls ? "flex-start" : "flex-end"}
      >
        <Text
          fontSize="sm"
          fontFamily="inter"
          color="fg-muted"
          fontWeight="medium"
          opacity={isLoading ? 0.6 : 1}
          transition="opacity 0.2s ease"
        >
          {resultText}
        </Text>
      </Box>

      {/* Right: Optional pagination controls */}
      {paginationControls && (
        <Box minWidth="200px" display="flex" justifyContent="flex-end">
          {paginationControls}
        </Box>
      )}
    </Box>
  );
}
