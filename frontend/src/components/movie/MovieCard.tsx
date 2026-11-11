import {
  Card,
  Image,
  Box,
  ButtonGroup,
  IconButton,
  Center,
  Text,
} from "@chakra-ui/react";
import { useState, useRef, useEffect, memo, useMemo, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { type MovieListItem } from "@/types/movie";
import { Tooltip } from "../core/chakra/tooltip";
import { LuEye, LuHeart } from "react-icons/lu";
import { RiPlayListAddLine, RiPlayListFill } from "react-icons/ri";
import MovieUserScore from "./MovieUserScore";
import { useMovieActions } from "@/hooks/movie/useMovieActions";

// ============================================================================
// MovieCard Component
// ============================================================================
//
// Displays a movie poster card with:
// - Poster image with hover zoom effect
// - Title (with tooltip for truncated titles)
// - Release date and user score
// - Action buttons (watched, liked, watchlist)
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
}

const MovieCard = ({ movie, source, query }: MovieCardProps) => {
  // ==========================================================================
  // State & Hooks
  // ==========================================================================

  const [searchParams] = useSearchParams();
  const [isTitleTooltipOpen, setIsTitleTooltipOpen] = useState(false);
  const [isTitleTruncated, setIsTitleTruncated] = useState(false);
  const [isCardHovered, setIsCardHovered] = useState(false);
  const titleRef = useRef<HTMLParagraphElement>(null);

  // Local state for watchlist to handle immediate UI updates
  const [localWatchlistState, setLocalWatchlistState] = useState<
    boolean | null
  >(null);

  // Movie actions hook for watchlist, watched, liked, etc.
  const { toggleWatchlist, isUpdating } = useMovieActions({ movie });

  // ==========================================================================
  // Computed Values
  // ==========================================================================

  // Watchlist state: prefer local state (after toggle), fallback to prop
  const isOnWatchlist = useMemo(
    () =>
      localWatchlistState ?? movie.user_movie_data?.user_on_watchlist ?? false,
    [localWatchlistState, movie.user_movie_data],
  );

  // Format release date for display
  // CRITICAL: Parse ISO date without timezone conversion to avoid date shift
  // (e.g., "1980-01-01" displaying as "December 31, 1979" in US timezones)
  const formattedDate = useMemo(() => {
    if (!movie.release_date) return "Release date unknown";

    const dateParts = movie.release_date.split("-");
    if (dateParts.length !== 3) return "Release date unknown";

    const year = Number.parseInt(dateParts[0] ?? "", 10);
    const month = Number.parseInt(dateParts[1] ?? "", 10);
    const day = Number.parseInt(dateParts[2] ?? "", 10);

    if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
      return "Release date unknown";
    }

    // Create date in local timezone (month is 0-indexed in Date constructor)
    const date = new Date(year, month - 1, day);
    if (Number.isNaN(date.getTime())) return "Release date unknown";

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [movie.release_date]);

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
      : "https://placehold.co/500x750?text=No\nImage";
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
  // Event Handlers
  // ==========================================================================

  const handleWatchlistToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Capture previous state before optimistic update (avoids stale closure issues)
    const wasOnWatchlist = isOnWatchlist;

    // Optimistically update local state for immediate UI feedback
    setLocalWatchlistState(!wasOnWatchlist);

    try {
      // Toast notifications handled by useMovieActions hook
      await toggleWatchlist();
    } catch {
      // Rollback to previous state on error (toast handled by hook)
      setLocalWatchlistState(wasOnWatchlist);
    }
  };

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <Box
      width="100%"
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
        border="1px solid"
        borderColor="border-subtle-00"
        boxShadow={isCardHovered ? "shadow-md" : "shadow-sm"}
        transition="all 0.3s ease-in-out"
        _hover={{ bg: "layer-hover-01" }}
      >
        {/* Poster Image */}
        <Link
          to={`/movie/${movie.tmdb_id}${queryString}`}
          style={{ display: "block", textDecoration: "none" }}
        >
          <Box position="relative" paddingBottom="150%" overflow="hidden">
            <Image
              position="absolute"
              top="0"
              left="0"
              width="100%"
              height="100%"
              objectFit="cover"
              src={posterUrl}
              alt={movie.title}
              transform={isCardHovered ? "scale(1.05)" : "scale(1)"}
              transition="transform 0.3s ease-in-out"
              transformOrigin="center center"
            />
          </Box>
        </Link>

        {/* Card Body: Title, Date, Score */}
        <Box flex="1" display="flex" flexDirection="column">
          <Card.Body display="flex" flexDirection="column" p={3} height="100px">
            {/* Title with Tooltip */}
            <Box mb={2} position="relative">
              <Text
                ref={titleRef}
                fontSize="lg"
                fontWeight="semibold"
                fontFamily="heading"
                lineHeight="1.2"
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

            {/* Date and Score Row */}
            <Box>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Text fontSize="sm" fontFamily="body" color="on-muted">
                  {formattedDate}
                </Text>
                <MovieUserScore
                  score={movie.vote_average}
                  voteCount={movie.vote_count}
                />
              </Box>
            </Box>
          </Card.Body>

          {/* Action Buttons */}
          <Card.Footer p={3} pt={0}>
            <Center width="100%">
              <ButtonGroup size="sm" spaceX={1}>
                <Tooltip content="Watched" openDelay={500}>
                  <IconButton variant="ghost" size="sm">
                    <LuEye />
                  </IconButton>
                </Tooltip>
                <Tooltip content="Liked" openDelay={500}>
                  <IconButton variant="ghost" size="sm">
                    <LuHeart />
                  </IconButton>
                </Tooltip>
                <Tooltip
                  content={
                    isOnWatchlist ? "Remove from watchlist" : "Add to watchlist"
                  }
                  openDelay={500}
                >
                  <IconButton
                    variant="ghost"
                    color={isOnWatchlist ? "tertiary" : undefined}
                    size="sm"
                    onClick={(event) => void handleWatchlistToggle(event)}
                    disabled={isUpdating}
                  >
                    {isOnWatchlist ? <RiPlayListFill /> : <RiPlayListAddLine />}
                  </IconButton>
                </Tooltip>
              </ButtonGroup>
            </Center>
          </Card.Footer>
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
    prevProps.source === nextProps.source &&
    prevProps.query === nextProps.query
  );
});

MemoizedMovieCard.displayName = "MovieCard";

export default MemoizedMovieCard;
