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

	console.log("MovieDetail: Navigation params", { page, from, query });

	/* ============================================================
       Helper Methods & Derived Data
       ============================================================ */

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
				const date = new Date(movie.release_date);
				const month = date.getMonth() + 1;
				const day = date.getDate();
				const year = date.getFullYear();
				return `${month}/${day}/${year}`;
		  })()
		: "";

	/* ============================================================
       Loading/Error States
       ============================================================ */
	if (isLoading) {
		return (
			<Flex align="center" justify="center" minH="60vh">
				<Spinner size="xl" />
			</Flex>
		);
	}

	if (error) {
		return (
			<Box p={8}>
				<Text color="red.500">{error}</Text>
			</Box>
		);
	}

	if (!movie) {
		return null;
	}

	/* ============================================================
	   Main Render
	   ============================================================ */
	return (
		<Box maxW="6xl" mx="auto" p={4}>
			{/* Back to Results Button */}
			<Box mb={4}>
				{(() => {
					const backUrl =
						from === "search"
							? `/search?query=${encodeURIComponent(query)}&page=${page}`
							: `/${from}?page=${page}`;
					console.log("MovieDetail: Back to Results URL", backUrl);
					return (
						<Link to={backUrl}>
							<Button colorScheme="blue" variant="outline">
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
					);
				})()}
			</Box>
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
					<Text fontSize="md" color="gray.500">
						{formattedReleaseDate}
					</Text>
					{/* Header: Genres */}
					<Flex gap={2} wrap="wrap" justify="center" align="center">
					{movie.genres?.map((genre: Genre) => (
							<Tag key={genre.id} colorScheme="teal">
								{genre.name}
							</Tag>
						))}
					</Flex>
					{/* Header: Runtime */}
					{movie.runtime && (
						<Text fontSize="sm" color="gray.600">
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
					{/* <Button colorScheme="teal">Add to Watchlist</Button> */}
					<Button
						colorScheme={userMovieData?.inWatchlist ? "gray" : "teal"}
						loading={userMovieDataLoading && isAuthenticated}
						onClick={() => update({ inWatchlist: !userMovieData?.inWatchlist })}
						disabled={!isAuthenticated}
					>
						{userMovieData?.inWatchlist
							? "Remove from Watchlist"
							: "Add to Watchlist"}
					</Button>
					<Button colorScheme="teal" disabled={!isAuthenticated}>
						Mark as Watched
					</Button>
					<Button colorScheme="teal" disabled={!isAuthenticated}>
						Rate Movie
					</Button>
				</Flex>
			</Box>
			<Separator mb={6} />

			{/* Overview Section */}
			<Box mb={6}>
				<Heading size="md" mb={2}>
					Overview
				</Heading>
				<Text>{movie.overview}</Text>
			</Box>
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
							bg="gray.600"
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
								bg="gray.600"
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
						<Tag key={company.id || idx} colorScheme="purple">
							{company.name}
						</Tag>
					))}
				</Flex>
			</Box>
		</Box>
	);
};

export default MovieDetail;
