import { HStack, Image, Link as ChakraLink, Text } from "@chakra-ui/react";
import { Link } from "react-router";
import logo from "@/assets/icons8-movie-64.webp";

export default function Wordmark() {
  return (
    <ChakraLink
      asChild
      color="foreground"
      textDecoration="none"
      flexShrink="0"
      _focusVisible={{
        outlineWidth: "2px",
        outlineStyle: "solid",
        outlineColor: "ring",
        outlineOffset: "2px",
      }}
    >
      <Link to="/">
        <HStack gap={{ base: 1, lg: 3 }}>
          <Image src={logo} alt="" boxSize={{ base: "7", lg: "12" }} />
          <Text fontSize={{ base: "lg", lg: "2xl" }} fontWeight="bold">
            CineXplorer
          </Text>
        </HStack>
      </Link>
    </ChakraLink>
  );
}
