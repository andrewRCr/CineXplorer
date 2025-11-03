import {
	Card,
	Image,
	Box,
	useBreakpointValue,
	ButtonGroup,
	IconButton,
	Center,
	Text,
} from "@chakra-ui/react";
import { useState, useRef, useEffect, memo, useMemo, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { type Movie } from "@/types/movie";
import { Tooltip } from "../chakra/tooltip";
import { LuEye, LuHeart } from "react-icons/lu";
import { RiPlayListAddLine, RiPlayListFill } from "react-icons/ri";
import MovieUserScore from "./MovieUserScore";
import { useMovieActions } from "../../hooks/useMovieActions";

interface MovieCardProps {
	movie: Movie;
	currentPage?: number;
	source?: string;
	query?: string;
}

const MovieCard = ({ movie, currentPage, source, query }: MovieCardProps) => {
	const [searchParams] = useSearchParams();
	const [isTitleTooltipOpen, setIsTitleTooltipOpen] = useState(false);
	const [isTitleTruncated, setIsTitleTruncated] = useState(false);
	const [isCardHovered, setIsCardHovered] = useState(false);
	const titleRef = useRef<HTMLParagraphElement>(null);
	const cardWidth = useBreakpointValue({
		base: "100%",
	});

	// Local state for watchlist to handle immediate UI updates
	const [localWatchlistState, setLocalWatchlistState] = useState<boolean | null>(null);

	// Movie actions hook for watchlist, watched, liked, etc.
	const { toggleWatchlist, isUpdating } = useMovieActions({ movie });

	// Compute watchlist state: prefer local state (after toggle), fallback to prop
	const isOnWatchlist = useMemo(
		() => localWatchlistState ?? movie.user_movie_data?.user_on_watchlist ?? false,
		[localWatchlistState, movie.user_movie_data]
	);

	// Optimize title truncation check with debounced callback
	const checkTruncation = useCallback(() => {
		if (!titleRef.current) return;

		const element = titleRef.current;

		// Use ResizeObserver API if available (more efficient than DOM cloning)
		if ("ResizeObserver" in window) {
			// Simple heuristic: if scrollHeight > clientHeight, it's truncated
			setIsTitleTruncated(element.scrollHeight > element.clientHeight + 5);
		} else {
			// Fallback for older browsers
			const clone = element.cloneNode(true) as HTMLElement;
			clone.style.cssText = `
				position: absolute;
				visibility: hidden;
				height: auto;
				width: ${element.clientWidth}px;
				-webkit-line-clamp: none;
				-webkit-box-orient: horizontal;
				display: block;
				overflow: visible;
			`;

			document.body.appendChild(clone);
			const naturalHeight = clone.scrollHeight;
			document.body.removeChild(clone);

			setIsTitleTruncated(naturalHeight > element.clientHeight + 10);
		}
	}, []);

	// Debounced resize handler for better performance
	useEffect(() => {
		let resizeTimer: ReturnType<typeof setTimeout> | null = null;
		const debouncedCheck = () => {
			if (resizeTimer) clearTimeout(resizeTimer);
			resizeTimer = setTimeout(checkTruncation, 150); // 150ms debounce
		};

		// Initial check with small delay
		const initialTimer: ReturnType<typeof setTimeout> | null = setTimeout(checkTruncation, 50);

		// Add resize listener with debouncing
		window.addEventListener("resize", debouncedCheck);

		return () => {
			if (initialTimer) clearTimeout(initialTimer);
			if (resizeTimer) clearTimeout(resizeTimer);
			window.removeEventListener("resize", debouncedCheck);
		};
	}, [movie.title, checkTruncation]);

	// Memoize expensive date formatting
	const formattedDate = useMemo(() => {
		if (!movie.release_date) return "Release date unknown";

		// Parse ISO date (YYYY-MM-DD) without timezone conversion
		// CRITICAL: new Date(iso_string) interprets as UTC then converts to local timezone
		// which causes "1980-01-01" to display as "December 31, 1979" in US timezones
		// Solution: Parse components and create date in local timezone directly
		const dateParts = movie.release_date.split("-");
		if (dateParts.length !== 3) return "Release date unknown";

		const year = Number.parseInt(dateParts[0], 10);
		const month = Number.parseInt(dateParts[1], 10);
		const day = Number.parseInt(dateParts[2], 10);

		// Validate parsed values
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

	// Memoize query string building - preserve all URL parameters
	const queryString = useMemo(() => {
		// Start with all URL params (includes filter params parent doesn't track)
		const params: Record<string, string> = {};
		searchParams.forEach((value, key) => {
			if (value) {
				params[key] = value;
			}
		});

		// Props override URL (parent controls pagination/source, we add filters)
		if (typeof currentPage === "number") {
			params.page = String(currentPage);
		}
		if (source) {
			params.from = source;
		}
		if (query) {
			params.query = query;
		}

		// Build query string
		const queryStr = Object.entries(params)
			.map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
			.join("&");

		return queryStr ? `?${queryStr}` : "";
	}, [searchParams, currentPage, source, query]);

	// Memoize poster URL to avoid recreation
	const posterUrl = useMemo(() => {
		return movie.poster_path
			? `https://image.tmdb.org/t/p/w342${movie.poster_path}`
			: "https://placehold.co/500x750?text=No\nImage";
	}, [movie.poster_path]);

	return (
		<Box
			width={cardWidth}
			height="100%"
			position="relative"
			onMouseEnter={() => setIsCardHovered(true)}
			onMouseLeave={() => setIsCardHovered(false)}
		>
			<Card.Root
				bg="card"
				height="100%"
				display="flex"
				flexDirection="column"
				position="relative"
				overflow="hidden"
				borderRadius={10}
				border={"0px"}
			>
				<Link
					to={`/movie/${movie.tmdb_id}${queryString}`}
					style={{ display: "block" }}
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
				<Box flex="1" display="flex" flexDirection="column">
					<Card.Body display="flex" flexDirection="column" p={3} height="100px">
						<Box mb={2} position="relative">
							<Text
								ref={titleRef}
								fontSize="lg"
								fontWeight="semibold"
								fontFamily="inter"
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
									zIndex="9999"
									pointerEvents="none"
								>
									<Box
										bg="popover"
										borderColor="border"
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
											fontFamily="sourcesans"
											color="popover-foreground"
											lineHeight="1.2"
										>
											{movie.title}
										</Text>
									</Box>
								</Box>
							)}
						</Box>
						<Box>
							<Box
								display="flex"
								justifyContent="space-between"
								alignItems="center"
							>
								<Text
									fontSize="sm"
									fontFamily="sourcesans"
									color="muted-foreground"
								>
									{formattedDate}
								</Text>
								<MovieUserScore score={movie.vote_average ?? 0} />
							</Box>
						</Box>
					</Card.Body>
					<Card.Footer p={3} pt={0}>
						<Center width="100%">
							<ButtonGroup size="sm" spaceX={1}>
								<Tooltip content="Watched" openDelay={500}>
									<IconButton
										variant="ghost"
										size="sm"
									>
										<LuEye />
									</IconButton>
								</Tooltip>
								<Tooltip content="Liked" openDelay={500}>
									<IconButton variant="ghost" size="sm">
										<LuHeart />
									</IconButton>
								</Tooltip>
								<Tooltip
									content={isOnWatchlist ? "Remove from watchlist" : "Add to watchlist"}
									openDelay={500}
								>
									<IconButton
										variant="ghost"
										color={isOnWatchlist ? "accent" : undefined}
										size="sm"
										onClick={async (e) => {
											e.preventDefault();
											e.stopPropagation();
											// Optimistically update local state for immediate UI feedback
											setLocalWatchlistState(!isOnWatchlist);
											try {
												await toggleWatchlist();
												// TODO (7.7.7): Show success notification
												console.log(
													isOnWatchlist
														? "Movie removed from watchlist"
														: "Movie added to watchlist"
												);
											} catch (error) {
												// Rollback on error
												setLocalWatchlistState(isOnWatchlist);
												console.error("Failed to toggle watchlist:", error);
											}
										}}
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
					backgroundColor="accent"
					transition="width 0.3s ease-in-out"
					zIndex="1"
				/>
			</Card.Root>
		</Box>
	);
};

// Memoize the component to prevent unnecessary re-renders
const MemoizedMovieCard = memo(MovieCard, (prevProps, nextProps) => {
	// Custom comparison function for better performance
	return (
		prevProps.movie.tmdb_id === nextProps.movie.tmdb_id &&
		prevProps.movie.user_movie_data?.user_on_watchlist ===
			nextProps.movie.user_movie_data?.user_on_watchlist &&
		prevProps.currentPage === nextProps.currentPage &&
		prevProps.source === nextProps.source &&
		prevProps.query === nextProps.query
	);
});

MemoizedMovieCard.displayName = "MovieCard";

export default MemoizedMovieCard;
