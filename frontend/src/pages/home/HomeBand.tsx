import {
  Box,
  Container,
  Heading,
  SimpleGrid,
  Text,
  VisuallyHidden,
} from "@chakra-ui/react";
import { useId } from "react";
import { pageContainerProps } from "@/components/layout/pageContainer";

const points = [
  [
    "See what's on",
    "What's in theaters and coming soon, ordered and named for what it is.",
  ],
  [
    "Keep a watchlist",
    "Save films to see next from any poster, and find them on Home.",
  ],
  [
    "Search any film",
    "Find any film by its title, from the search in the bar.",
  ],
];
export function HomeBand() {
  const heading = useId();
  return (
    <Box
      as="section"
      aria-labelledby={heading}
      bg="layer-01"
      color="foreground"
      py={{ base: 8, lg: 12 }}
      mt={8}
    >
      <VisuallyHidden as="h2" id={heading}>
        What you can do
      </VisuallyHidden>
      <Container {...pageContainerProps}>
        <SimpleGrid columns={{ base: 1, lg: 3 }} gap={8}>
          {points.map(([title, line]) => (
            <Box key={title}>
              <Heading as="h3" size="lg" mb={2}>
                {title}
              </Heading>
              <Text>{line}</Text>
            </Box>
          ))}
        </SimpleGrid>
      </Container>
    </Box>
  );
}
