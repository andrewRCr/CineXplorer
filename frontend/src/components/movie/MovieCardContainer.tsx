import { Box } from "@chakra-ui/react";
import React from "react";

interface MovieCardContainerProps {
  children: React.ReactNode;
}

const MovieCardContainer = ({ children }: MovieCardContainerProps) => {
  return (
    <Box
      borderRadius={10}
      boxShadow="shadow-sm"
      border="1px solid"
      borderColor="border-strong-01"
      overflow="hidden"
    >
      {children}
    </Box>
  );
};

export default MovieCardContainer;
