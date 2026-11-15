import { Badge, Box, VisuallyHidden } from "@chakra-ui/react";
import React from "react";

/** Fewer TMDB votes than this and the chip stays neutral, without a score dot. */
const SCORE_DISPLAY_MIN_VOTES = 10;

type ScoreTier = "success" | "foreground" | "destructive";

interface MovieUserScoreProps {
  /** TMDB vote_average (0-10 scale) */
  score: number | null | undefined;
  /** TMDB vote_count; a missing count reads as no votes */
  voteCount: number | null | undefined;
  /** "compact" for cards, "detailed" for the detail page */
  presentation?: "compact" | "detailed";
}

interface ScoreChipProps {
  tier?: ScoreTier;
  label: string;
  title: string;
}

/** Color marks the score through a decorative dot; the number stays neutral. */
function ScoreChip({ tier, label, title }: ScoreChipProps) {
  return (
    <Badge
      variant="neutral"
      bg={tier ? "transparent" : "badge"}
      color={tier ? "foreground" : "on-badge"}
      borderWidth={tier ? "1px" : "0"}
      borderStyle="solid"
      borderColor={tier ? "border-subtle-01" : undefined}
      boxShadow="none"
      gap={1}
      fontSize="12px"
      fontFamily="body"
      paddingX={1}
      title={title}
    >
      {tier && (
        <Box
          as="span"
          aria-hidden="true"
          bg={tier}
          boxSize="8px"
          borderRadius="full"
          flexShrink={0}
        />
      )}
      <VisuallyHidden>{title}: </VisuallyHidden>
      {label}
    </Badge>
  );
}

function scoreTier(value: number, goodThreshold: number): ScoreTier {
  if (value >= goodThreshold) return "success";
  if (value < 5) return "destructive";
  return "foreground";
}

const MovieUserScore: React.FC<MovieUserScoreProps> = ({
  score,
  voteCount,
  presentation = "compact",
}) => {
  const getTmdbChip = (): ScoreChipProps => {
    const isDetailed = presentation === "detailed";
    if (score == null || !voteCount) {
      return {
        label: isDetailed ? "Not yet rated" : "—",
        title: "No TMDB votes yet",
      };
    }
    if (voteCount < SCORE_DISPLAY_MIN_VOTES) {
      return isDetailed
        ? {
            label: `${score.toFixed(1)} · ${voteCount} ${voteCount === 1 ? "vote" : "votes"}`,
            title: "TMDB Rating",
          }
        : {
            label: "—",
            title: `Fewer than ${SCORE_DISPLAY_MIN_VOTES} TMDB votes`,
          };
    }
    const label = score.toFixed(1);
    return { tier: scoreTier(Number(label), 7.5), label, title: "TMDB Rating" };
  };

  return <ScoreChip {...getTmdbChip()} />;
};

export default MovieUserScore;
