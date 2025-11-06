import { Badge, HStack } from "@chakra-ui/react";
import React from "react";

interface MovieUserScoreProps {
  /** TMDB vote_average (0-10 scale) */
  score: number;
  /** Optional user rating (1-10 scale) - if provided, shows both ratings */
  userRating?: number;
  /** Show just the user rating (for user-specific views) */
  userRatingOnly?: boolean;
}

const MovieUserScore: React.FC<MovieUserScoreProps> = ({
  score,
  userRating,
  userRatingOnly = false,
}) => {
  // Helper to get TMDB badge colors (0-10 scale)
  // Color mapping: High (green) → Medium (blue) → Low (yellow)
  // Uses theme-specific "on-*" tokens for text on solid colored backgrounds
  const getTmdbBadgeColors = (tmdbScore: number) => {
    if (tmdbScore >= 7.5) return { bg: "success", color: "on-success" };      // High: Green
    if (tmdbScore < 5.0) return { bg: "warning", color: "on-warning" };        // Low: Yellow
    return { bg: "info", color: "on-info" };                                    // Medium: Blue
  };

  // Helper to get user rating badge colors (1-10 scale)
  // NOTE: Future enhancement will use `rating` token for personal ratings
  // For now, using threshold-based semantic tokens consistent with TMDB
  // Color mapping: High (green) → Medium (blue) → Low (yellow)
  const getUserRatingBadgeColors = (rating: number) => {
    if (rating >= 8) return { bg: "success", color: "on-success" };
    if (rating < 5) return { bg: "warning", color: "on-warning" };
    return { bg: "info", color: "on-info" };
  };

  // Show only user rating
  if (userRatingOnly && userRating) {
    const colors = getUserRatingBadgeColors(userRating);
    return (
      <Badge
        variant="surface"
        bg={colors.bg}
        color={colors.color}
        fontSize="12px"
        paddingX={1}
        borderRadius={4}
        title="Your Rating"
      >
        ★ {userRating}/10
      </Badge>
    );
  }

  // Show both TMDB and user rating
  if (userRating) {
    const tmdbColors = getTmdbBadgeColors(score);
    const userColors = getUserRatingBadgeColors(userRating);
    return (
      <HStack gap={1}>
        <Badge
          variant="surface"
          bg={tmdbColors.bg}
          color={tmdbColors.color}
          fontSize="12px"
          paddingX={1}
          borderRadius={4}
          title="TMDB Rating"
        >
          {score.toFixed(1)}
        </Badge>
        <Badge
          variant="surface"
          bg={userColors.bg}
          color={userColors.color}
          fontSize="12px"
          paddingX={1}
          borderRadius={4}
          title="Your Rating"
        >
          ★ {userRating}
        </Badge>
      </HStack>
    );
  }

  // Show only TMDB rating (current behavior)
  const tmdbColors = getTmdbBadgeColors(score);
  return (
    <Badge
      variant="surface"
      bg={tmdbColors.bg}
      color={tmdbColors.color}
      fontSize="12px"
      fontFamily="sourcesans"
      paddingX={1}
      borderRadius={4}
      title="TMDB Rating"
    >
      {score.toFixed(1)}
    </Badge>
  );
};

export default MovieUserScore;
