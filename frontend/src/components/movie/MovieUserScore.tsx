import { Badge, HStack, VisuallyHidden } from "@chakra-ui/react";
import React from "react";

/** Fewer TMDB votes than this and the average is not shown as a traffic-light score. */
const SCORE_DISPLAY_MIN_VOTES = 10;

interface MovieUserScoreProps {
  /** TMDB vote_average (0-10 scale) */
  score: number | null | undefined;
  /** TMDB vote_count; a missing count reads as no votes */
  voteCount: number | null | undefined;
  /** "compact" for cards, "detailed" for the detail page */
  presentation?: "compact" | "detailed";
  /** Optional user rating (1-10 scale) - if provided, shows both ratings */
  userRating?: number;
  /** Show just the user rating (for user-specific views) */
  userRatingOnly?: boolean;
}

interface TmdbBadge {
  variant: "success" | "warning" | "error" | "neutral";
  label: string;
  title: string;
}

const MovieUserScore: React.FC<MovieUserScoreProps> = ({
  score,
  voteCount,
  presentation = "compact",
  userRating,
  userRatingOnly = false,
}) => {
  // Helper to get TMDB badge variant (0-10 scale)
  // Traffic-light mapping: High (success) → Medium (warning) → Low (error)
  // Badge recipe provides solid backgrounds with on-* color pairs
  const getTmdbBadgeVariant = (tmdbScore: number): "success" | "warning" | "error" => {
    if (tmdbScore >= 7.5) return "success";  // High: Green
    if (tmdbScore < 5.0) return "error";     // Low: Red
    return "warning";                         // Medium: Yellow
  };

  // Helper to get the TMDB badge for the selected presentation
  // Traffic-light score from SCORE_DISPLAY_MIN_VOTES votes up; neutral placeholder or vote-counted average below
  const getTmdbBadge = (): TmdbBadge => {
    const isDetailed = presentation === "detailed";

    // A missing average or a missing or zero count means TMDB has no votes to show
    if (score == null || !voteCount) {
      return { variant: "neutral", label: isDetailed ? "Not yet rated" : "—", title: "No TMDB votes yet" };
    }

    // Too few votes: cards hold a placeholder, the detail page shows the average with its count
    if (voteCount < SCORE_DISPLAY_MIN_VOTES) {
      return isDetailed
        ? {
            variant: "neutral",
            label: `${score.toFixed(1)} · ${voteCount} ${voteCount === 1 ? "vote" : "votes"}`,
            title: "TMDB Rating",
          }
        : { variant: "neutral", label: "—", title: `Fewer than ${SCORE_DISPLAY_MIN_VOTES} TMDB votes` };
    }

    return { variant: getTmdbBadgeVariant(score), label: score.toFixed(1), title: "TMDB Rating" };
  };

  // Helper to get user rating badge variant (1-10 scale)
  // Uses same traffic-light variants as TMDB scores
  // Traffic-light mapping: High (success) → Medium (warning) → Low (error)
  const getUserRatingBadgeVariant = (rating: number): "success" | "warning" | "error" => {
    if (rating >= 8) return "success";
    if (rating < 5) return "error";
    return "warning";
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
        <VisuallyHidden>Your Rating: </VisuallyHidden>
        ★ {userRating}/10
      </Badge>
    );
  }

  const tmdbBadge = getTmdbBadge();

  // Show both TMDB and user rating
  if (userRating) {
    const userVariant = getUserRatingBadgeVariant(userRating);
    return (
      <HStack gap={1}>
        <Badge
          variant={tmdbBadge.variant}
          fontSize="12px"
          paddingX={1}
          title={tmdbBadge.title}
        >
          <VisuallyHidden>{tmdbBadge.title}: </VisuallyHidden>
          {tmdbBadge.label}
        </Badge>
        <Badge
          variant={userVariant}
          fontSize="12px"
          paddingX={1}
          title="Your Rating"
        >
          <VisuallyHidden>Your Rating: </VisuallyHidden>
          ★ {userRating}
        </Badge>
      </HStack>
    );
  }

  // Show only TMDB rating
  return (
    <Badge
      variant={tmdbBadge.variant}
      fontSize="12px"
      fontFamily="sourcesans"
      paddingX={1}
      title={tmdbBadge.title}
    >
      <VisuallyHidden>{tmdbBadge.title}: </VisuallyHidden>
      {tmdbBadge.label}
    </Badge>
  );
};

export default MovieUserScore;
