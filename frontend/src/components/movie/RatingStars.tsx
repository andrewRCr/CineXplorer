import { HStack, Icon } from "@chakra-ui/react";
import { FaStar, FaStarHalf } from "react-icons/fa";

interface RatingStarsProps {
  rating?: number | null;
  size?: "sm" | "lg";
}

/** A user's 1–10 rating, displayed as earned half stars on a five-star scale. */
export function RatingStars({ rating, size = "sm" }: RatingStarsProps) {
  if (rating == null) return null;
  const stars = rating / 2;
  return (
    <HStack
      as="span"
      display="inline-flex"
      gap={0}
      color="imdb-gold"
      fontSize={size === "sm" ? "sm" : "xl"}
      role="img"
      aria-label={`Rated ${stars} out of 5 stars`}
    >
      {Array.from({ length: Math.floor(stars) }, (_, index) => (
        <Icon
          key={index}
          as={FaStar}
          boxSize="1em"
          aria-hidden="true"
          focusable="false"
        />
      ))}
      {rating % 2 !== 0 && (
        <Icon
          as={FaStarHalf}
          boxSize="1em"
          me="-0.5em"
          aria-hidden="true"
          focusable="false"
        />
      )}
    </HStack>
  );
}
