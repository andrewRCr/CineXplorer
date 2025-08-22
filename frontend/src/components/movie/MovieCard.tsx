import {
	Card,
	Image,
	Heading,
	Box,
	useBreakpointValue,
	ButtonGroup,
	IconButton,
	Center,
	Link,
	HStack,
} from "@chakra-ui/react";
import { type Movie } from "../../services/movieService";
import { Tooltip } from "../chakra/tooltip";
import { LuEye, LuHeart } from "react-icons/lu";
import { RiPlayListAddLine } from "react-icons/ri";
import MovieUserScore from "./MovieUserScore";

interface MovieCardProps {
	movie: Movie;
}

const MovieCard = ({ movie }: MovieCardProps) => {
	const cardWidth = useBreakpointValue({
		base: "100%",
	});

	const getFDate = (dateStr: string): string => {
		const date = new Date(dateStr);
		return date.toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	};

	return (
		<Box width={cardWidth} p={0.5}>
			<Card.Root
				_after={{
					content: '""',
					width: "0%",
					position: "absolute",
					bottom: "0",
					left: "0",
					height: "2px",
					backgroundColor: "blue.500",
					transition: "width 0.3s ease-in-out",
				}}
				_hover={{
					_after: {
						width: "100%",
					},
				}}
			>
				<Link href={`/movie/${movie.tmdb_id}`}>
					<Image
						height="100%"
						width="100%"
						objectFit="cover"
						src={
							movie.poster_path
								? `https://image.tmdb.org/t/p/w342${movie.poster_path}`
								: "https://placehold.co/500x750?text=No\nImage"
						}
						alt={movie.title}
					/>
				</Link>
				<Box marginTop={-5}>
					<Card.Body>
						<Heading p={0} size="md" lineClamp={1}>
							<Link
								lineClamp={1}
								href={`/movie/${movie.tmdb_id}`}
								textDecoration="none"
								_hover={{
									colorPalette: "blue",
								}}
							>
								{movie.title}
							</Link>
						</Heading>
						<Card.Description>
							<HStack justifyContent={"space-between"}>
								{getFDate(movie.release_date)}
								<Tooltip content="User Score">
									<span>
										<MovieUserScore score={movie.vote_average} />
									</span>
								</Tooltip>
							</HStack>
						</Card.Description>
					</Card.Body>
					<Card.Footer p={0} mt="-2" mb="2">
						<Center width="100%">
							<ButtonGroup size="sm" mb={0} mt={-3} spaceX={-3}>
								<Tooltip content="Watched" openDelay={500}>
									<IconButton variant="ghost" colorScheme="blue" p={0}>
										<LuEye />
									</IconButton>
								</Tooltip>
								<Tooltip content="Liked" openDelay={500}>
									<IconButton variant="ghost" p={0}>
										<LuHeart />
									</IconButton>
								</Tooltip>
								<Tooltip content="Add to watchlist" openDelay={500}>
									<IconButton variant="ghost" p={0}>
										<RiPlayListAddLine />
									</IconButton>
								</Tooltip>
							</ButtonGroup>
						</Center>
					</Card.Footer>
				</Box>
			</Card.Root>
		</Box>
	);
};

export default MovieCard;
