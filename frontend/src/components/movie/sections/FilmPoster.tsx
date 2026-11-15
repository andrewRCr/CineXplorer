import { Box, Image } from "@chakra-ui/react";
import PosterPlaceholder from "@/assets/PosterPlaceholder";
import type { MovieListItem } from "@/types/movie";

export function FilmPoster({ film }: { film: MovieListItem }) {
  return (
    <Box aspectRatio={2 / 3} w="100%" overflow="hidden" borderRadius="sm">
      {film.poster_path ? (
        <Image
          src={`https://image.tmdb.org/t/p/w342${film.poster_path}`}
          alt={film.title}
          w="100%"
          h="100%"
          objectFit="cover"
        />
      ) : (
        <PosterPlaceholder width="100%" height="100%" aria-label={film.title} />
      )}
    </Box>
  );
}
