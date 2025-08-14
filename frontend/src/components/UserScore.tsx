import { Badge } from "@chakra-ui/react";
import React from "react";

interface UserScoreProps {
	score: number;
}

const UserScore: React.FC<UserScoreProps> = ({ score }) => {
	const fScore = Math.round(score * 10);
	// const color = fScore >= 75 ? "green" : fScore >= 50 ? "yellow" : "";
	const color = fScore >= 75 ? "green" : fScore < 50 ? "yellow" : "";
	return (
		<Badge
			variant="surface"
			colorPalette={color}
			fontSize="12px"
			paddingX={1}
			borderRadius={4}
		>
			{`${fScore}%`}
		</Badge>
	);
};

export default UserScore;
