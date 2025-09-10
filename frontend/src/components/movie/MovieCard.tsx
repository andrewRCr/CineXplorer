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
import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { COLORS } from "@/constants/theme";
import { type Movie } from "../../services/movieService";
import { Tooltip } from "../chakra/tooltip";
import { LuEye, LuHeart } from "react-icons/lu";
import { RiPlayListAddLine } from "react-icons/ri";
import MovieUserScore from "./MovieUserScore";

interface MovieCardProps {
	movie: Movie;
	currentPage?: number;
	source?: string;
}

const MovieCard = ({ movie, currentPage, source }: MovieCardProps) => {
	const [isTitleTooltipOpen, setIsTitleTooltipOpen] = useState(false);
	const [isTitleTruncated, setIsTitleTruncated] = useState(false);
	const [isCardHovered, setIsCardHovered] = useState(false);
	const titleRef = useRef<HTMLParagraphElement>(null);
	const cardWidth = useBreakpointValue({
		base: "100%",
	});

	// Check if title is truncated
	useEffect(() => {
		const checkTruncation = () => {
			if (titleRef.current) {
				const element = titleRef.current;

				// Create a hidden clone to measure natural height
				const clone = element.cloneNode(true) as HTMLElement;
				clone.style.position = "absolute";
				clone.style.visibility = "hidden";
				clone.style.height = "auto";
				clone.style.width = element.clientWidth + "px";
				clone.style.webkitLineClamp = "none";
				clone.style.webkitBoxOrient = "horizontal";
				clone.style.display = "block";
				clone.style.overflow = "visible";

				document.body.appendChild(clone);
				const naturalHeight = clone.scrollHeight;
				document.body.removeChild(clone);

				const clampedHeight = element.clientHeight;

				// Check if text is actually truncated (natural height significantly larger than clamped)
				setIsTitleTruncated(naturalHeight > clampedHeight + 10); // 10px buffer for line height variations
			}
		};

		// Small delay to ensure element is fully rendered
		const timeoutId = setTimeout(checkTruncation, 10);

		// Check after component mounts and when window resizes
		window.addEventListener("resize", checkTruncation);
		return () => {
			clearTimeout(timeoutId);
			window.removeEventListener("resize", checkTruncation);
		};
	}, [movie.title]);

	const getFDate = (dateStr: string): string => {
		const date = new Date(dateStr);
		return date.toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	};

	// Build query string for navigation
	const queryParams: string[] = [];
	if (typeof currentPage === "number") queryParams.push(`page=${currentPage}`);
	if (source) queryParams.push(`from=${source}`);
	const queryString = queryParams.length > 0 ? `?${queryParams.join("&")}` : "";

	return (
		<Box
			width={cardWidth}
			p={0.5}
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
							src={
								movie.poster_path
									? `https://image.tmdb.org/t/p/w342${movie.poster_path}`
									: "https://placehold.co/500x750?text=No\nImage"
							}
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
										bg={COLORS.background.main}
										borderColor={COLORS.border.main}
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
											borderTop={`6px solid ${COLORS.background.main}`}
										/>
										<Text
											fontSize="sm"
											fontWeight="medium"
											color={COLORS.text.main}
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
								<Text fontSize="sm" color={COLORS.text.secondary}>
									{getFDate(movie.release_date)}
								</Text>
								<MovieUserScore score={movie.vote_average} />
							</Box>
						</Box>
					</Card.Body>
					<Card.Footer p={3} pt={0}>
						<Center width="100%">
							<ButtonGroup size="sm" spaceX={1}>
								<Tooltip content="Watched" openDelay={500}>
									<IconButton
										variant="ghost"
										colorScheme={COLORS.accent.primary}
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
					backgroundColor={COLORS.accent.primary}
					transition="width 0.3s ease-in-out"
					zIndex="1"
				/>
			</Card.Root>
		</Box>
	);
};

export default MovieCard;
