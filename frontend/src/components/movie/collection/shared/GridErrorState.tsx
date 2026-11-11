/**
 * Error state display for movie grid components.
 *
 * Shows error message with retry button when data fetch fails.
 */

import { Text, Button, Box } from "@chakra-ui/react";

interface GridErrorStateProps {
  /** Error object with message to display */
  error: Error | null;
  /** Callback to retry the failed request (optional for display-only errors) */
  onRetry?: () => void;
}

/**
 * GridErrorState
 *
 * Displays an error message with a retry button.
 * Used by all movie grid components for consistent error UX.
 */
export const GridErrorState = ({ error, onRetry }: GridErrorStateProps) => {
  return (
    <Box textAlign="center" mb={4} p={4} bg="layer-01" borderRadius="md">
      <Text color="destructive" mb={2}>
        {error?.message || "An error occurred while fetching movies."}
      </Text>
      {onRetry && (
        <Button size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </Box>
  );
};
