import useMovieDetail from "@/hooks/useMovieDetail";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { useMemo } from "react";
import { fetchMovieDetail } from "@/services/movieService";
import type { Movie, Genre, CastMember, CrewMember, ProductionCompany } from "@shared/index";
import {
  Box,
  Flex,
  Heading,
  Text,
  Spinner,
  Stack,
  Separator,
  Button,
  Image,
} from "@chakra-ui/react";
import { Tag } from "@chakra-ui/tag";
import MovieUserScore from "@/components/movie/MovieUserScore";
import { useUserMovieData } from "@/hooks/useUserMovieData";
import { useAuth } from "@/hooks/useAuth";

/* ============================================================
   MovieDetail Component
   ============================================================ */
const MovieDetail = () => {
  const { id } = useParams<{ id: string }>();
  const fetcher = useMemo(() => {
    return () => fetchMovieDetail().get<Movie>(id!);
  }, [id]);
  const { movie, error, isLoading } = useMovieDetail(fetcher);

  const { isAuthenticated } = useAuth();
  const shouldFetchUserMovieData = isAuthenticated && !!movie?.tmdb_id;

  const {
    data: userMovieData,
    loading: userMovieDataLoading,
    update,
  } = useUserMovieData(shouldFetchUserMovieData ? String(movie.tmdb_id) : "");

  const [searchParams] = useSearchParams();
  const page = searchParams.get("page") || "1";
  const from = searchParams.get("from") || "now-playing";
  const query = searchParams.get("query") || "";

  // Preserve all URL parameters for back navigation (filters, etc.)
  const allParams = useMemo(() => {
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return params;
  }, [searchParams]);

  console.log("MovieDetail: Navigation params", { page, from, query, allParams });

  /* ============================================================
       Helper Methods & Derived Data
       ============================================================ */

  // Back button component - available in all states (loading, error, success)
  // NOTE: If PersonDetail implements similar back navigation with query preservation,
  // consider extracting to shared <BackToCollectionButton> component (DRY principle)
  const BackButton = useMemo(() => {
    // Build query string with all preserved parameters (skip empty values)
    const queryString = Object.entries(allParams)
      .filter(([, value]) => value !== "")
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join("&");

    const backUrl =
      from === "search"
        ? `/search?${queryString}`
        : from === "browse"
        ? `/browse?${queryString}`
        : `/browse/${from}?${queryString}`;
    console.log("MovieDetail: Back to Results URL", backUrl);

    return (
      <Box mb={4}>
        <Link to={backUrl} style={{ textDecoration: "none" }}>
          <Button variant="outline">
            <span
              style={{
                display: "inline-block",
                transform: "translateY(2px)",
                marginRight: "8px",
              }}
            >
              &larr;
            </span>
            Back to Results
          </Button>
        </Link>
      </Box>
    );
  }, [allParams, from]);

  // extract key crew members (creative leads)
  const director = movie?.crew?.find(
    (member: CrewMember) => member.job === "Director"
  );
  const writers = movie?.crew?.filter((member: CrewMember) =>
    ["Writer", "Screenplay"].includes(member.job)
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

        const year = Number.parseInt(dateParts[0], 10);
        const month = Number.parseInt(dateParts[1], 10);
        const day = Number.parseInt(dateParts[2], 10);

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
        {BackButton}
        <Flex align="center" justify="center" minH="60vh">
          <Spinner size="xl" />
        </Flex>
      </Box>
    );
  }

  // Check for non-404 errors first (actual errors)
  const is404 = error && (error.includes('404') || error.includes('not found'));

  if (error && !is404) {
    return (
      <Box maxW="6xl" mx="auto" p={4}>
        {BackButton}
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
          <Text color="on-muted">
            {error}
          </Text>
        </Box>
      </Box>
    );
  }

  // 404 or no movie data - show not found
  if (!movie) {
    return (
      <Box maxW="6xl" mx="auto" p={4}>
        {BackButton}
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
      {BackButton}
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
              <Tag key={genre.id} bg="badge" color="on-badge">
                {genre.name}
              </Tag>
            ))}
          </Flex>
          {/* Header: Runtime */}
          {movie.runtime && (
            <Text fontSize="sm" color="on-muted">
              Runtime: {Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m
            </Text>
          )}
          {/* Header: User Score */}
          <Text fontWeight="bold">
            User Score: <MovieUserScore score={movie.vote_average} />
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
            const jobWriters = writers?.filter((w: CrewMember) => w.job === job);
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
            color={userMovieData?.user_on_watchlist ? "on-secondary" : "on-primary"}
            _hover={{ bg: userMovieData?.user_on_watchlist ? "secondary-hover" : "primary-hover" }}
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
        ?.filter((member: CrewMember) =>
              [
                "Director",
                "Writer",
                "Screenplay",
                "Director of Photography",
                "Editor",
                "Composer",
              ].includes(member.job)
            )
        .map((member: CrewMember, idx: number) => (
              <Box
                key={member.id || idx}
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
        {movie.production_companies?.map((company: ProductionCompany, idx: number) => (
            <Tag key={company.id || idx} bg="badge" color="on-badge">
              {company.name}
            </Tag>
          ))}
        </Flex>
      </Box>
    </Box>
  );
};

export default MovieDetail;
