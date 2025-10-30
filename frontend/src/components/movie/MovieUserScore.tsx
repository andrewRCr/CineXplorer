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

const SCORE_COLORS = {
	high: "text.successDark", // >= 7.5
	medium: "blue.700", // 5.0–7.4
	low: "yellow.700", // < 5.0
};

const USER_RATING_COLORS = {
	high: "green.600", // >= 8
	medium: "orange.600", // 5-7
	low: "red.600", // < 5
};

const MovieUserScore: React.FC<MovieUserScoreProps> = ({
	score,
	userRating,
	userRatingOnly = false,
}) => {
	// Helper to get TMDB color (0-10 scale)
	const getTmdbColor = (tmdbScore: number) => {
		if (tmdbScore >= 7.5) return SCORE_COLORS.high;
		if (tmdbScore < 5.0) return SCORE_COLORS.low;
		return SCORE_COLORS.medium;
	};

	// Helper to get user rating color (1-10 scale)
	const getUserRatingColor = (rating: number) => {
		if (rating >= 8) return USER_RATING_COLORS.high;
		if (rating < 5) return USER_RATING_COLORS.low;
		return USER_RATING_COLORS.medium;
	};

	// Show only user rating
	if (userRatingOnly && userRating) {
		return (
			<Badge
				variant="surface"
				backgroundColor={getUserRatingColor(userRating)}
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
		return (
			<HStack gap={1}>
				<Badge
					variant="surface"
					backgroundColor={getTmdbColor(score)}
					fontSize="12px"
					paddingX={1}
					borderRadius={4}
					title="TMDB Rating"
				>
					{score.toFixed(1)}
				</Badge>
				<Badge
					variant="surface"
					backgroundColor={getUserRatingColor(userRating)}
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
	return (
		<Badge
			variant="surface"
			backgroundColor={getTmdbColor(score)}
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
