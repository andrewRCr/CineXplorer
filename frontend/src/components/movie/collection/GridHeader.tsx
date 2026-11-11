/**
 * GridHeader - Header section for movie grids
 *
 * Displays a consistent header above movie grids with configurable content:
 * - Optional title (left-aligned, PageHeader styling without underline)
 * - Results count text
 * - Optional pagination controls
 * - Bottom border separator
 *
 * Layout behavior:
 * - Title + results (no controls): title left, results right
 * - Results + controls (no title): results left, controls right
 * - Results only: results right-aligned
 *
 * Used by VirtualizedMovieGrid (with title) and SequentialMovieGrid
 * (with pagination controls).
 */

import { Box, Heading, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";

/** Shared text styles for result count display */
const resultTextStyles = {
  fontSize: "sm",
  fontFamily: "body",
  color: "on-muted",
  fontWeight: "medium",
  lineHeight: "1",
  mb: -1, // Nudge toward border separator
} as const;

export interface GridHeaderProps {
  /** Optional page title to display on the left */
  title?: string;
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
 * Grid header with optional title, results count, and pagination controls
 *
 * @example
 * ```tsx
 * // Virtualized infinite scroll (with title)
 * <GridHeader
 *   title="Browse"
 *   resultText="Showing 40 results"
 *   isLoading={isLoading}
 *   visible={hasResults}
 * />
 *
 *
 * // Sequential pagination (with controls)
 * <GridHeader
 *   resultText="Showing 1-20 of 500 results"
 *   paginationControls={<SequentialPaginationCtrl {...props} />}
 *   isLoading={isLoading}
 *   visible={hasResults}
 * />
 * ```
 */
export function GridHeader({
  title,
  resultText,
  paginationControls,
  isLoading = false,
  visible = true,
}: GridHeaderProps) {
  const hasTitle = !!title;
  const hasControls = !!paginationControls;

  // Layout logic:
  // - Title present: title left, results right (space-between)
  // - Controls present (no title): results left, controls right (space-between)
  // - Neither: results right-aligned (flex-end)
  const useSpaceBetween = hasTitle || hasControls;

  return (
    <Box
      display="flex"
      justifyContent={useSpaceBetween ? "space-between" : "flex-end"}
      alignItems="flex-end"
      mt={hasTitle ? 6 : 0}
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
      {/* Left side: Title (when present) or Results (when controls present) */}
      {hasTitle ? (
        <Heading
          as="h1"
          fontSize="3xl"
          fontWeight="normal"
          fontStyle="italic"
          fontFamily="heading"
          color="foreground"
          lineHeight="1"
          mb={-2} // Nudge toward border separator
        >
          {title}
        </Heading>
      ) : hasControls ? (
        <Text
          {...resultTextStyles}
          minWidth="150px"
          opacity={isLoading ? 0.6 : 1}
          transition="opacity 0.2s ease"
        >
          {resultText}
        </Text>
      ) : null}

      {/* Right side: Results (when title present) or Controls (when present) or Results (alone) */}
      {hasTitle ? (
        <Text
          {...resultTextStyles}
          opacity={isLoading ? 0.6 : 1}
          transition="opacity 0.2s ease"
        >
          {resultText}
        </Text>
      ) : hasControls ? (
        <Box minWidth="200px" display="flex" justifyContent="flex-end">
          {paginationControls}
        </Box>
      ) : (
        <Text
          {...resultTextStyles}
          minWidth="150px"
          textAlign="right"
          opacity={isLoading ? 0.6 : 1}
          transition="opacity 0.2s ease"
        >
          {resultText}
        </Text>
      )}
    </Box>
  );
}
