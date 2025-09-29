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
import { Link } from "react-router-dom";
import { type Movie } from "@/types/movie";
import { Tooltip } from "../chakra/tooltip";
import { LuEye, LuHeart } from "react-icons/lu";
import { RiPlayListAddLine } from "react-icons/ri";
import MovieUserScore from "./MovieUserScore";

interface MovieCardProps {
	movie: Movie;
	currentPage?: number;
	source?: string;
	query?: string;
}

const MovieCard = ({ movie, currentPage, source, query }: MovieCardProps) => {
	const [isTitleTooltipOpen, setIsTitleTooltipOpen] = useState(false);
	const [isTitleTruncated, setIsTitleTruncated] = useState(false);
	const [isCardHovered, setIsCardHovered] = useState(false);
	const titleRef = useRef<HTMLParagraphElement>(null);
	const cardWidth = useBreakpointValue({
		base: "100%",
	});

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
		let initialTimer: ReturnType<typeof setTimeout> | null = setTimeout(checkTruncation, 50);

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
		const date = new Date(movie.release_date);
		if (Number.isNaN(date.getTime())) return "Release date unknown";
		return date.toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	}, [movie.release_date]);

	// Memoize query string building
	const queryString = useMemo(() => {
		const queryParams: string[] = [];
		if (typeof currentPage === "number")
			queryParams.push(`page=${currentPage}`);
		if (source) queryParams.push(`from=${source}`);
		if (query) queryParams.push(`query=${encodeURIComponent(query)}`);
		return queryParams.length > 0 ? `?${queryParams.join("&")}` : "";
	}, [currentPage, source, query]);

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
					<Card.Body flex="1" display="flex" flexDirection="column" p={3}>
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
										bg="background.main"
										borderColor="border.subtle"
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
											borderTopColor="background.main"
											borderTopWidth="6px"
											borderTopStyle="solid"
										/>
										<Text
											fontSize="sm"
											fontWeight="medium"
											fontFamily="sourcesans"
											color="text.main"
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
									color="text.secondary"
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
										colorPalette="blue"
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
								<Tooltip content="Add to watchlist" openDelay={500}>
									<IconButton variant="ghost" size="sm">
										<RiPlayListAddLine />
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
					backgroundColor="accent.primary"
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
		prevProps.currentPage === nextProps.currentPage &&
		prevProps.source === nextProps.source &&
		prevProps.query === nextProps.query
	);
});

MemoizedMovieCard.displayName = "MovieCard";

export default MemoizedMovieCard;
