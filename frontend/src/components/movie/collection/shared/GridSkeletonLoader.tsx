/**
 * Skeleton loading state for movie grid components.
 *
 * Renders a grid of skeleton placeholders during initial data loading.
 */

import { Box, Skeleton } from "@chakra-ui/react";
import MovieCard from "../../MovieCard";
import MovieCardContainer from "../../MovieCardContainer";
import {
  CARD_WIDTH,
  GAP,
  SKELETON_COUNT,
  placeholderMovie,
} from "./gridConstants";

interface GridSkeletonLoaderProps {
  /** Number of skeleton items to display. Defaults to SKELETON_COUNT (20). */
  count?: number;
  /** Whether to wrap in a grid container. Set false if parent provides grid. */
  withContainer?: boolean;
}

/**
 * GridSkeletonLoader
 *
 * Displays skeleton loading placeholders in a responsive grid.
 * Used during initial data fetch to show expected content layout.
 */
export const GridSkeletonLoader = ({
  count = SKELETON_COUNT,
  withContainer = true,
}: GridSkeletonLoaderProps) => {
  const skeletons = Array.from({ length: count }, (_, i) => (
    <Skeleton
      key={`skeleton-${i}`}
      borderRadius="md"
      overflow="hidden"
      bg="layer-02"
      data-testid={`skeleton-loader-${i}`}
    >
      <MovieCardContainer>
        <MovieCard movie={placeholderMovie} />
      </MovieCardContainer>
    </Skeleton>
  ));

  if (!withContainer) {
    return <>{skeletons}</>;
  }

  return (
    <Box
      display="grid"
      gridTemplateColumns={`repeat(auto-fit, ${CARD_WIDTH}px)`}
      gap={`${GAP}px`}
      mb={6}
      justifyContent="center"
    >
      {skeletons}
    </Box>
  );
};
