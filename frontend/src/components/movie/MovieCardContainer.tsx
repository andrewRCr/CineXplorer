import { COLORS } from "@/constants/theme";
import { Box } from "@chakra-ui/react";
import React from "react";

interface MovieCardContainerProps {
	children: React.ReactNode;
}

const MovieCardContainer = ({ children }: MovieCardContainerProps) => {
	return (
		<Box
			borderRadius={10}
			boxShadow={`0 2px 8px ${COLORS.border.main}`}
			border={`1px solid ${COLORS.border.main}`}
			overflow="hidden"
		>
			{children}
		</Box>
	);
};

export default MovieCardContainer;
