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
  // Helper to get TMDB badge variant (0-10 scale)
  // Variant mapping: High (success) → Medium (info) → Low (warning)
  // Badge recipe provides solid backgrounds with on-* color pairs
  const getTmdbBadgeVariant = (tmdbScore: number): "success" | "info" | "warning" => {
    if (tmdbScore >= 7.5) return "success";  // High: Green
    if (tmdbScore < 5.0) return "warning";   // Low: Yellow
    return "info";                            // Medium: Blue
  };

  // Helper to get user rating badge variant (1-10 scale)
  // Uses same threshold-based semantic variants as TMDB scores
  // Variant mapping: High (success) → Medium (info) → Low (warning)
  const getUserRatingBadgeVariant = (rating: number): "success" | "info" | "warning" => {
    if (rating >= 8) return "success";
    if (rating < 5) return "warning";
    return "info";
  };

  // Show only user rating
  if (userRatingOnly && userRating) {
    const variant = getUserRatingBadgeVariant(userRating);
    return (
      <Badge
        variant={variant}
        fontSize="12px"
        paddingX={1}
        title="Your Rating"
      >
        ★ {userRating}/10
      </Badge>
    );
  }

  // Show both TMDB and user rating
  if (userRating) {
    const tmdbVariant = getTmdbBadgeVariant(score);
    const userVariant = getUserRatingBadgeVariant(userRating);
    return (
      <HStack gap={1}>
        <Badge
          variant={tmdbVariant}
          fontSize="12px"
          paddingX={1}
          title="TMDB Rating"
        >
          {score.toFixed(1)}
        </Badge>
        <Badge
          variant={userVariant}
          fontSize="12px"
          paddingX={1}
          title="Your Rating"
        >
          ★ {userRating}
        </Badge>
      </HStack>
    );
  }

  // Show only TMDB rating (current behavior)
  const tmdbVariant = getTmdbBadgeVariant(score);
  return (
    <Badge
      variant={tmdbVariant}
      fontSize="12px"
      fontFamily="sourcesans"
      paddingX={1}
      title="TMDB Rating"
    >
      {score.toFixed(1)}
    </Badge>
  );
};

export default MovieUserScore;
