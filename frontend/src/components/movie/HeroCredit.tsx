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
  const names = directors.join(", ");
  const year = film.release_date?.slice(0, 4);
  return (
    <Box data-hero-credit>
      <Link
        asChild
        color="foreground"
        fontFamily="heading"
        fontWeight="semibold"
        fontSize="17px"
        lineHeight="1.4"
        textTransform="uppercase"
        letterSpacing="0.08em"
        _hover={{ color: "tertiary-hover" }}
      >
        {/* Browsers can name a capitalized link in capitals; keep the title's own case. */}
        <RouterLink to={href ?? "#"} aria-label={film.title}>
          {film.title}
        </RouterLink>
      </Link>
      {(names || year) && (
        <Text data-hero-director fontSize="16px" lineHeight="1.5" mt={1}>
          {names}
          {names && year && (
            <>
              {" "}
              <Box as="span" aria-hidden="true" color="on-muted" mx="0.2em">
                |
              </Box>{" "}
            </>
          )}
          {year}
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
