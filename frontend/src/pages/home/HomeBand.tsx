import {
  Box,
  Container,
  Heading,
  SimpleGrid,
  Text,
  VisuallyHidden,
} from "@chakra-ui/react";
import { useId } from "react";
import { TextLink } from "@/components/common";
import { ROUTES } from "@/constants/routes";
import { pageContainerProps } from "@/components/layout/pageContainer";

const points = [
  [
    "Browse every film",
    "What's in theaters, what's coming, or the whole catalog by genre, year and rating.",
  ],
  [
    "Track your films",
    "Keep a watchlist, and mark films watched, rate and like them from any poster.",
  ],
  [
    "Know before you watch",
    "The story, cast, crew, score and runtime of any film, on one page.",
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
        <Text mt={8}>
          An account keeps your lists. If you sign in with Google or GitHub,
          CineXplorer receives the name, email address and basic profile the
          provider sends. We use that information only for your account, never
          for advertising.{" "}
          <TextLink to={ROUTES.PRIVACY}>Privacy Policy</TextLink>
        </Text>
      </Container>
    </Box>
  );
}
