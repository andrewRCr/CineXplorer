import { COLORS } from "@/constants/theme";
import { Badge } from "@chakra-ui/react";
import React from "react";

interface MovieUserScoreProps {
	score: number;
}

const SCORE_COLORS = {
	high: COLORS.text.successDark, // >= 75
	medium: "blue.700", // 50–74
	low: "yellow.700", // < 50
};

const MovieUserScore: React.FC<MovieUserScoreProps> = ({ score }) => {
	const fScore = Math.round(score * 10);
	let color = COLORS.accent.primary;
	if (fScore >= 75) color = SCORE_COLORS.high;
	else if (fScore < 50) color = SCORE_COLORS.low;
	return (
		<Badge
			variant="surface"
			backgroundColor={color}
			fontSize="12px"
			paddingX={1}
			borderRadius={4}
		>
			{`${fScore}%`}
		</Badge>
	);
};

export default MovieUserScore;
