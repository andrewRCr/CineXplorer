import { COLORS } from "@/constants/theme";
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
	high: COLORS.text.successDark, // >= 75
	medium: "blue.700", // 50–74
	low: "yellow.700", // < 50
};

const USER_RATING_COLORS = {
	high: "green.600", // >= 8
	medium: "orange.600", // 5-7
	low: "red.600", // < 5
};

const MovieUserScore: React.FC<MovieUserScoreProps> = ({ 
	score, 
	userRating, 
	userRatingOnly = false 
}) => {
	// Helper to get TMDB color (percentage-based)
	const getTmdbColor = (tmdbScore: number) => {
		const percentage = Math.round(tmdbScore * 10);
		if (percentage >= 75) return SCORE_COLORS.high;
		if (percentage < 50) return SCORE_COLORS.low;
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
					{Math.round(score * 10)}%
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
	const tmdbPercentage = Math.round(score * 10);
	return (
		<Badge
			variant="surface"
			backgroundColor={getTmdbColor(score)}
			fontSize="12px"
			paddingX={1}
			borderRadius={4}
			title="TMDB Rating"
		>
			{tmdbPercentage}%
		</Badge>
	);
};

export default MovieUserScore;
