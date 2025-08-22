import { Box } from "@chakra-ui/react";
import React from "react";

interface MovieCardContainerProps {
	children: React.ReactNode;
}

const MovieCardContainer = ({ children }: MovieCardContainerProps) => {
	return (
		<Box borderRadius={10} boxShadow="md" overflow="hidden">
			{children}
		</Box>
	);
};

export default MovieCardContainer;
