import { Box, Image } from "@chakra-ui/react";
import type { FeaturedMovie } from "@/services/movieService";

export function HeroArtwork({
  path,
  contained,
  focusPoint,
  onError,
}: {
  path: string;
  contained: boolean;
  focusPoint?: FeaturedMovie["focus_point"];
  onError: () => void;
}) {
  return (
    <Box as="picture" position="absolute" inset={0}>
      {!contained && (
        <source
          media="(min-width: 80rem), (min-height: 987px)"
          srcSet={`https://image.tmdb.org/t/p/original${path}`}
        />
      )}
      <Image
        src={`https://image.tmdb.org/t/p/w1280${path}`}
        srcSet={`https://image.tmdb.org/t/p/w1280${path} 1x, https://image.tmdb.org/t/p/original${path} 2x`}
        alt=""
        w="100%"
        h="100%"
        objectFit={contained ? "contain" : "cover"}
        objectPosition={
          contained
            ? "center"
            : `${focusPoint?.x ?? 50}% ${focusPoint?.y ?? 28}%`
        }
        onError={onError}
      />
    </Box>
  );
}
