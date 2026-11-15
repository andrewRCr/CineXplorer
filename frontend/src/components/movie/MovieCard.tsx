import { Card, Image, Box, Text, Icon } from "@chakra-ui/react";
import { useState, useRef, useEffect, memo, useMemo, useCallback } from "react";
import { Link, useSearchParams } from "react-router";
import { type MovieListItem } from "@/types/movie";
import { MovieCardActions } from "./MovieCardActions";
import { RatingStars } from "./RatingStars";
import { LuEye } from "react-icons/lu";
import { CARD_TEXT_HEIGHT } from "@/components/movie/collection/shared/gridConstants";
import MovieUserScore from "./MovieUserScore";
import { useUserMovieState } from "@/hooks/movie/useUserMovieState";
import PosterPlaceholder from "@/assets/PosterPlaceholder";

// ============================================================================
// MovieCard Component
// ============================================================================
//
// Displays a movie poster card with:
// - Poster image with hover zoom effect
// - Title (with tooltip for truncated titles)
// - Release year, score, watched mark and current rating
// - Signed-in pointer controls or touch actions
//
// ============================================================================

// Truncation detection constants
const TRUNCATION_HEIGHT_BUFFER = 5;
const RESIZE_DEBOUNCE_MS = 150;
const INITIAL_CHECK_DELAY_MS = 50;

interface MovieCardProps {
  movie: MovieListItem;
  source?: string;
  query?: string;
  showControls?: boolean;
}

const MovieCard = ({
  movie,
  source,
  query,
  showControls = true,
}: MovieCardProps) => {
  // ==========================================================================
  // State & Hooks
  // ==========================================================================

  const [searchParams] = useSearchParams();
  const [isTitleTooltipOpen, setIsTitleTooltipOpen] = useState(false);
  const [isTitleTruncated, setIsTitleTruncated] = useState(false);
  const [isCardHovered, setIsCardHovered] = useState(false);
  const titleRef = useRef<HTMLParagraphElement>(null);

  const { state, save } = useUserMovieState(
    movie.tmdb_id,
    movie.user_movie_data,
  );

  // ==========================================================================
  // Computed Values
  // ==========================================================================

  const releaseYear =
    movie.release_date?.match(/^(\d{4})-\d{2}-\d{2}$/)?.[1] ?? "Year unknown";

  // Build query string preserving filter parameters (not pagination)
  const queryString = useMemo(() => {
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      // Skip pagination params - infinite scroll doesn't use them
      if (key === "page" || key === "tmdb_page_start") return;
      if (value) {
        params[key] = value;
      }
    });

    // Props override URL - source and query only
    if (source) {
      params.from = source;
    }
    if (query) {
      params.query = query;
    }

    const queryStr = Object.entries(params)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join("&");

    return queryStr ? `?${queryStr}` : "";
  }, [searchParams, source, query]);

  // Poster image URL
  const posterUrl = useMemo(() => {
    return movie.poster_path
      ? `https://image.tmdb.org/t/p/w342${movie.poster_path}`
      : null;
  }, [movie.poster_path]);

  // ==========================================================================
  // Title Truncation Detection
  // ==========================================================================

  const checkTruncation = useCallback(() => {
    if (!titleRef.current) return;
    const element = titleRef.current;
    // Simple heuristic: if scrollHeight > clientHeight, it's truncated
    // Works in all modern browsers (IE9+)
    setIsTitleTruncated(
      element.scrollHeight > element.clientHeight + TRUNCATION_HEIGHT_BUFFER,
    );
  }, []);

  // Debounced resize handler for truncation check
  useEffect(() => {
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedCheck = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(checkTruncation, RESIZE_DEBOUNCE_MS);
    };

    // Initial check with small delay
    const initialTimer = setTimeout(checkTruncation, INITIAL_CHECK_DELAY_MS);

    window.addEventListener("resize", debouncedCheck);

    return () => {
      clearTimeout(initialTimer);
      if (resizeTimer) clearTimeout(resizeTimer);
      window.removeEventListener("resize", debouncedCheck);
    };
  }, [movie.title, checkTruncation]);

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <Box
      className="group"
      width="100%"
      minW="138px"
      height="100%"
      position="relative"
      onMouseEnter={() => setIsCardHovered(true)}
      onMouseLeave={() => setIsCardHovered(false)}
    >
      <Card.Root
        color="foreground"
        bg="layer-01"
        height="100%"
        display="flex"
        flexDirection="column"
        position="relative"
        overflow="hidden"
        borderRadius={10}
        borderWidth="0"
        boxShadow={isCardHovered ? "shadow-md" : "shadow-sm"}
        transition="all 0.3s ease-in-out"
        _hover={{ bg: "layer-hover-01" }}
      >
        {/* Poster Image */}
        <Box position="relative">
          <Link
            to={`/movie/${movie.tmdb_id}${queryString}`}
            style={{ display: "block", textDecoration: "none" }}
          >
            <Box position="relative" paddingBottom="150%" overflow="hidden">
              <Box
                position="absolute"
                top="0"
                left="0"
                width="100%"
                height="100%"
                transform={isCardHovered ? "scale(1.05)" : "scale(1)"}
                transition="transform 0.3s ease-in-out"
                transformOrigin="center center"
              >
                {posterUrl ? (
                  <Image
                    width="100%"
                    height="100%"
                    objectFit="cover"
                    src={posterUrl}
                    alt={movie.title}
                  />
                ) : (
                  <PosterPlaceholder
                    width="100%"
                    height="100%"
                    aria-label={movie.title}
                  />
                )}
              </Box>
            </Box>
          </Link>
          {showControls && (
            <MovieCardActions movie={movie} state={state} save={save} />
          )}
        </Box>

        {/* Fixed title, year, score and stars block */}
        <Box flex="1" display="flex" flexDirection="column">
          <Card.Body
            display="flex"
            flexDirection="column"
            p={3}
            height={`${CARD_TEXT_HEIGHT}px`}
            flex="none"
          >
            {/* Title with Tooltip */}
            <Box mb={2} position="relative">
              <Text
                ref={titleRef}
                fontSize="lg"
                fontWeight="semibold"
                fontFamily="heading"
                lineHeight="1.2"
                minH="2.4em"
                cursor="pointer"
                overflow="hidden"
                textOverflow="ellipsis"
                display="-webkit-box"
                css={{
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
                onMouseEnter={() =>
                  isTitleTruncated && setIsTitleTooltipOpen(true)
                }
                onMouseLeave={() => setIsTitleTooltipOpen(false)}
              >
                <Link
                  to={`/movie/${movie.tmdb_id}${queryString}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  {movie.title}
                </Link>
              </Text>

              {/* Title Tooltip - only shows when truncated */}
              {isTitleTooltipOpen && isTitleTruncated && (
                <Box
                  position="absolute"
                  top="-40px"
                  left="0"
                  zIndex="tooltip"
                  pointerEvents="none"
                >
                  <Box
                    bg="popover"
                    borderColor="border-strong-02"
                    borderWidth="1px"
                    borderRadius="md"
                    shadow="lg"
                    p={2}
                    fontSize="sm"
                    maxWidth="300px"
                    width="auto"
                    position="relative"
                  >
                    {/* Arrow pointing down */}
                    <Box
                      position="absolute"
                      bottom="-6px"
                      left="20px"
                      width="0"
                      height="0"
                      borderLeft="6px solid transparent"
                      borderRight="6px solid transparent"
                      borderTopColor="popover"
                      borderTopWidth="6px"
                      borderTopStyle="solid"
                    />
                    <Text
                      fontSize="sm"
                      fontWeight="medium"
                      fontFamily="body"
                      color="on-popover"
                      lineHeight="1.2"
                    >
                      {movie.title}
                    </Text>
                  </Box>
                </Box>
              )}
            </Box>

            {/* Year, score and watched mark */}
            <Box>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                gap={1}
              >
                <Text fontSize="sm" fontFamily="body" color="on-muted">
                  {releaseYear}
                </Text>
                <MovieUserScore
                  score={movie.vote_average}
                  voteCount={movie.vote_count}
                />
                {state.user_watched && (
                  <Icon
                    as={LuEye}
                    role="img"
                    aria-label="Watched"
                    aria-hidden={false}
                    boxSize="14px"
                    flexShrink={0}
                  />
                )}
              </Box>
            </Box>
            <Box minH="5" mt="1">
              <RatingStars rating={state.user_rating} />
            </Box>
          </Card.Body>
        </Box>

        {/* Animated Accent Line */}
        <Box
          position="absolute"
          bottom="0"
          left="0"
          width={isCardHovered ? "100%" : "0%"}
          height="3px"
          backgroundColor="tertiary"
          transition="width 0.3s ease-in-out"
          zIndex="1"
        />
      </Card.Root>
    </Box>
  );
};

// ============================================================================
// Memoization
// ============================================================================

const MemoizedMovieCard = memo(MovieCard, (prevProps, nextProps) => {
  return (
    prevProps.movie.tmdb_id === nextProps.movie.tmdb_id &&
    prevProps.movie.user_movie_data?.user_on_watchlist ===
      nextProps.movie.user_movie_data?.user_on_watchlist &&
    prevProps.movie.user_movie_data?.user_watched ===
      nextProps.movie.user_movie_data?.user_watched &&
    prevProps.movie.user_movie_data?.user_liked ===
      nextProps.movie.user_movie_data?.user_liked &&
    prevProps.movie.user_movie_data?.user_rating ===
      nextProps.movie.user_movie_data?.user_rating &&
    prevProps.movie.user_movie_data?.has_entries ===
      nextProps.movie.user_movie_data?.has_entries &&
    prevProps.showControls === nextProps.showControls &&
    prevProps.source === nextProps.source &&
    prevProps.query === nextProps.query
  );
});

MemoizedMovieCard.displayName = "MovieCard";

export default MemoizedMovieCard;
