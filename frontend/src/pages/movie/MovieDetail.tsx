import useMovieDetail from "@/hooks/movie/useMovieDetail";
import { useParams, useSearchParams } from "react-router-dom";
import { useMemo } from "react";
import { fetchMovieDetail } from "@/services/movieService";
import type {
  MovieDetail as MovieDetailType,
  Genre,
  CastMember,
  CrewMember,
  ProductionCompany,
  SpokenLanguage,
} from "@/types/movie";
import CertificationBadge from "@/components/movie/CertificationBadge";
import { BackToCollectionLink } from "@/components/navigation";
import {
  Box,
  Button,
  Flex,
  Heading,
  Text,
  Spinner,
  Stack,
  Separator,
  Image,
  Tag,
} from "@chakra-ui/react";
import MovieUserScore from "@/components/movie/MovieUserScore";
import { useUserMovieData } from "@/hooks/movie/useUserMovieData";
import useAuthContext from "@/hooks/auth/useAuthContext";

/* ============================================================
   MovieDetail Component
   ============================================================ */
const MovieDetail = () => {
  const { id } = useParams<{ id: string }>();
  const fetcher = useMemo(() => {
    return () => fetchMovieDetail().get<MovieDetailType>(id!);
  }, [id]);
  const { movie, error, isLoading } = useMovieDetail(fetcher);

  const { isAuthenticated } = useAuthContext() ?? {};
  const shouldFetchUserMovieData = isAuthenticated && !!movie?.tmdb_id;

  const {
    data: userMovieData,
    loading: userMovieDataLoading,
    update,
  } = useUserMovieData(shouldFetchUserMovieData ? String(movie.tmdb_id) : "");

  const [searchParams] = useSearchParams();

  /* ============================================================
       Helper Methods & Derived Data
       ============================================================ */

  // extract key crew members (creative leads)
  const director = movie?.crew?.find(
    (member: CrewMember) => member.job === "Director",
  );
  const writers = movie?.crew?.filter(
    (member: CrewMember) =>
      member.job && ["Writer", "Screenplay"].includes(member.job),
  );

  const jobPrefixMap: Record<string, string> = {
    Writer: "Written by",
    Screenplay: "Screenplay by",
  };

  const formattedReleaseDate = movie?.release_date
    ? (() => {
        // Parse ISO date (YYYY-MM-DD) without timezone conversion
        // Using new Date(iso_string) causes timezone shifts (e.g., "1980-01-01" → "12/31/1979" in US Eastern)
        // Solution: Parse components directly to avoid UTC → local timezone conversion
        const dateParts = movie.release_date.split("-");
        if (dateParts.length !== 3) return "";

        const year = Number.parseInt(dateParts[0] ?? "", 10);
        const month = Number.parseInt(dateParts[1] ?? "", 10);
        const day = Number.parseInt(dateParts[2] ?? "", 10);

        if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
          return "";
        }

        return `${month}/${day}/${year}`;
      })()
    : "";

  /* ============================================================
       Loading/Error States
       ============================================================ */
  if (isLoading) {
    return (
      <Box maxW="6xl" mx="auto" p={4}>
        <BackToCollectionLink searchParams={searchParams} />
        <Flex align="center" justify="center" minH="60vh">
          <Spinner size="xl" />
        </Flex>
      </Box>
    );
  }

  // Check for non-404 errors first (actual errors)
  const is404 = error && (error.includes("404") || error.includes("not found"));

  if (error && !is404) {
    return (
      <Box maxW="6xl" mx="auto" p={4}>
        <BackToCollectionLink searchParams={searchParams} />
        <Box
          minH="40vh"
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
        >
          <Heading as="h2" size="xl" mb={4}>
            Error Loading Movie
          </Heading>
          <Text color="on-muted">{error}</Text>
        </Box>
      </Box>
    );
  }

  // 404 or no movie data - show not found
  if (!movie) {
    return (
      <Box maxW="6xl" mx="auto" p={4}>
        <BackToCollectionLink searchParams={searchParams} />
        <Box
          minH="40vh"
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
        >
          <Heading as="h2" size="xl" mb={4}>
            Movie Not Found
          </Heading>
          <Text color="on-muted">
            The movie you're looking for doesn't exist or has been removed.
          </Text>
        </Box>
      </Box>
    );
  }

  /* ============================================================
     Main Render
     ============================================================ */
  return (
    <Box maxW="6xl" mx="auto" p={4}>
      {/* Back to Results Button */}
      <BackToCollectionLink searchParams={searchParams} />
      {/* Header Section */}
      <Flex gap={8} align="flex-start" mb={6}>
        {/* Header: Movie Poster */}
        <Box flexShrink={0} width="180px">
          <Image
            src={`https://image.tmdb.org/t/p/w185${movie.poster_path}`}
            alt={`Poster for ${movie.title}`}
            borderRadius="md"
            objectFit="cover"
          />
        </Box>
        <Stack gap={2} flex={1}>
          {/* Header: Movie Title */}
          <Heading size="lg">{movie.title}</Heading>
          {/* Header: Release Date */}
          <Text fontSize="md" color="on-muted">
            {formattedReleaseDate}
          </Text>
          {/* Header: Genres */}
          <Flex gap={2} wrap="wrap" justify="center" align="center">
            {movie.genres?.map((genre: Genre) => (
              <Tag.Root key={genre.id} bg="badge" color="on-badge">
                <Tag.Label>{genre.name}</Tag.Label>
              </Tag.Root>
            ))}
          </Flex>
          {/* Header: Spoken Languages */}
          {movie.spoken_languages && movie.spoken_languages.length > 0 && (
            <Text fontSize="sm" color="on-muted">
              {movie.spoken_languages
                .map((lang: SpokenLanguage) => lang.english_name)
                .join(", ")}
            </Text>
          )}
          {/* Header: Certification & Runtime */}
          {(movie.us_certification || movie.runtime) && (
            <Flex align="center" gap={2} fontSize="sm" color="on-muted">
              <CertificationBadge certification={movie.us_certification} />
              {movie.us_certification && movie.runtime && <Text>·</Text>}
              {movie.runtime && (
                <Text>
                  {Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m
                </Text>
              )}
            </Flex>
          )}
          {/* Header: User Score */}
          <Text fontWeight="bold">
            User Score:{" "}
            <MovieUserScore
              score={movie.vote_average}
              voteCount={movie.vote_count}
              presentation="detailed"
            />
          </Text>
          {/* Header: Key Crew Section (creative leads) */}
          <Box mt={2}>
            {director && (
              <Text>
                Directed by <strong>{director.name}</strong>
              </Text>
            )}
            {/* Group writers by job and use custom prefix */}
            {["Writer", "Screenplay"].map((job) => {
              const jobWriters = writers?.filter(
                (w: CrewMember) => w.job === job,
              );
              return jobWriters && jobWriters.length > 0 ? (
                <Text key={job}>
                  {jobPrefixMap[job]}{" "}
                  <strong>
                    {jobWriters.map((w: CrewMember) => w.name).join(", ")}
                  </strong>
                </Text>
              ) : null;
            })}
          </Box>
        </Stack>
      </Flex>

      {/* User Actions Section */}
      <Box mb={6}>
        <Heading size="md" mb={2}>
          Your Actions
        </Heading>
        <Flex gap={4} justify="center">
          {/* <Button bg="primary" color="on-primary">Add to Watchlist</Button> */}
          {/* TODO: Refactor to variant-based styling when MovieDetail page styling is finalized.
               Replace inline bg/color/_hover with conditional variant="solid"/"outline" (or custom recipe).
               This is deferred until comprehensive MovieDetail redesign. */}
          <Button
            bg={userMovieData?.user_on_watchlist ? "secondary" : "primary"}
            color={
              userMovieData?.user_on_watchlist ? "on-secondary" : "on-primary"
            }
            _hover={{
              bg: userMovieData?.user_on_watchlist
                ? "secondary-hover"
                : "primary-hover",
            }}
            loading={userMovieDataLoading && isAuthenticated}
            onClick={() =>
              update({
                user_on_watchlist: !userMovieData?.user_on_watchlist,
              })
            }
            disabled={!isAuthenticated}
          >
            {userMovieData?.user_on_watchlist
              ? "Remove from Watchlist"
              : "Add to Watchlist"}
          </Button>
          <Button variant="solid" disabled={!isAuthenticated}>
            Mark as Watched
          </Button>
          <Button variant="solid" disabled={!isAuthenticated}>
            Rate Movie
          </Button>
        </Flex>
      </Box>
      <Separator mb={6} />

      {/* Overview Section */}
      {movie.overview && (
        <Box mb={6}>
          <Heading size="md" mb={2}>
            Overview
          </Heading>
          <Text>{movie.overview}</Text>
        </Box>
      )}
      <Separator mb={6} />

      {/* Cast Section */}
      <Box mb={6}>
        <Heading size="md" mb={2}>
          Cast
        </Heading>
        <Flex gap={4} wrap="wrap" justify="center">
          {/* Show top N cast members */}
          {movie.cast?.slice(0, 5).map((actor: CastMember, idx: number) => (
            <Box
              key={actor.id || idx}
              bg="layer-01"
              p={2}
              borderRadius="md"
              minW="120px"
            >
              <Text fontWeight="bold">{actor.name}</Text>
              <Text fontSize="sm">as {actor.character}</Text>
            </Box>
          ))}
        </Flex>
      </Box>
      <Separator mb={6} />

      {/* Crew Section */}
      <Box mb={6}>
        <Heading size="md" mb={2}>
          Crew
        </Heading>
        <Flex gap={4} wrap="wrap" justify="center">
          {/* Filter for key roles: Director, Writer, etc. */}
          {movie.crew
            ?.filter(
              (member: CrewMember) =>
                member.job &&
                [
                  "Director",
                  "Writer",
                  "Screenplay",
                  "Director of Photography",
                  "Editor",
                  "Composer",
                ].includes(member.job),
            )
            .map((member: CrewMember) => (
              <Box
                key={`${member.id}-${member.job}`}
                bg="layer-01"
                p={2}
                borderRadius="md"
                minW="120px"
              >
                <Text fontWeight="bold">{member.name}</Text>
                <Text fontSize="sm">{member.job}</Text>
              </Box>
            ))}
        </Flex>
      </Box>
      <Separator mb={6} />

      {/* Production Companies Section */}
      <Box mb={6}>
        <Heading size="md" mb={2}>
          Production Companies
        </Heading>
        <Flex gap={2} wrap="wrap" justify="center">
          {movie.production_companies?.map(
            (company: ProductionCompany, idx: number) => (
              <Tag.Root key={company.id || idx} bg="badge" color="on-badge">
                <Tag.Label>{company.name}</Tag.Label>
              </Tag.Root>
            ),
          )}
        </Flex>
      </Box>
    </Box>
  );
};

export default MovieDetail;
