import { Box, Link, Text } from "@chakra-ui/react";
import { Link as RouterLink } from "react-router";
import type { FeaturedMovie } from "@/services/movieService";

export function HeroCredit({
  film,
  directors,
  href,
  showTagline,
}: {
  film: Pick<FeaturedMovie, "title" | "release_date" | "tagline">;
  directors: readonly string[];
  href?: string;
  showTagline: boolean;
}) {
  const metadata = [directors.join(", "), film.release_date?.slice(0, 4)]
    .filter(Boolean)
    .join(" | ");
  return (
    <Box data-hero-credit>
      <Link
        asChild
        color="foreground"
        fontFamily="heading"
        fontWeight="semibold"
        fontSize="18px"
        lineHeight="1.4"
        _hover={{ color: "tertiary-hover" }}
      >
        <RouterLink to={href ?? "#"}>{film.title}</RouterLink>
      </Link>
      {metadata && (
        <Text data-hero-director fontSize="16px" lineHeight="1.5" mt={1}>
          {metadata}
        </Text>
      )}
      {showTagline && film.tagline && (
        <Text
          data-hero-tagline
          fontSize="15px"
          color="on-muted"
          lineHeight="1.5"
          lineClamp={2}
          mt={1}
        >
          {film.tagline}
        </Text>
      )}
    </Box>
  );
}
