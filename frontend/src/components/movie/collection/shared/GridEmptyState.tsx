/**
 * Empty state display for movie grid components.
 *
 * Shows message when no movies match the current filters.
 */

import { Text, Box } from "@chakra-ui/react";

/**
 * GridEmptyState
 *
 * Displays a message indicating no results were found.
 * Used by all movie grid components for consistent empty state UX.
 */
export const GridEmptyState = () => {
  return (
    <Box textAlign="center" py={12}>
      <Text fontSize="lg" color="on-muted" mb={0}>
        No movies found matching your filters.
      </Text>
      <Text fontSize="sm" color="on-muted">
        Try adjusting your search criteria or filters.
      </Text>
    </Box>
  );
};
