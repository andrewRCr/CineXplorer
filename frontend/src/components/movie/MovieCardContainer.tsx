import { Box } from "@chakra-ui/react";
import React from "react";

interface MovieCardContainerProps {
  children: React.ReactNode;
}

const MovieCardContainer = ({ children }: MovieCardContainerProps) => {
  return (
    <Box
      borderRadius={10}
      boxShadow="0 2px 8px rgba(0, 0, 0, 0.1)"
      border="1px solid"
      borderColor="border"
      overflow="hidden"
    >
      {children}
    </Box>
  );
};

export default MovieCardContainer;
