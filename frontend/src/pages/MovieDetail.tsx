import useMovieDetail from "@/hooks/useMovieDetail";
import { useParams } from "react-router-dom";
import { useMemo } from "react";
import { fetchMovieDetail, type Movie } from "@/services/movieService";

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

const MovieDetail = () => {
	const { id } = useParams<{ id: string }>();
	const fetcher = useMemo(() => {
		return () => fetchMovieDetail().get<Movie>(id!);
	}, [id]);
	const { movie, error, isLoading } = useMovieDetail(fetcher);

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

	return (
		<Box maxW="6xl" mx="auto" p={4}>
			{/* Header Section */}
			<Flex gap={8} align="flex-start" mb={6}>
				{/* Movie Poster */}
				<Box flexShrink={0} width="180px">
					<Image
						src={`https://image.tmdb.org/t/p/w185${movie.poster_path}`}
						alt={`Poster for ${movie.title}`}
						borderRadius="md"
						objectFit="cover"
					/>
				</Box>
				<Stack gap={2} flex={1}>
					<Heading size="lg">{movie.title}</Heading>
					<Text fontSize="md" color="gray.500">
						{movie.release_date}
					</Text>
					<Flex gap={2} wrap="wrap">
						{movie.genres?.map((genre: any) => (
							<Tag key={genre.id} colorScheme="teal">
								{genre.name}
							</Tag>
						))}
					</Flex>
					<Text fontWeight="bold">Avg. Rating: {movie.vote_average}</Text>
				</Stack>
			</Flex>

			{/* User Actions Section */}
			<Box mb={6}>
				<Heading size="md" mb={2}>
					Your Actions
				</Heading>
				<Flex gap={4} align="center">
					{/* Placeholder for UserScore component */}
					<Box bg="gray.100" p={2} borderRadius="md">
						User Score
					</Box>
					<Button colorScheme="teal">Add to Watchlist</Button>
					<Button colorScheme="teal">Mark as Watched</Button>
					<Button colorScheme="teal">Rate Movie</Button>
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
				<Flex gap={4} wrap="wrap">
					{/* Show top N cast members */}
					{movie.cast?.slice(0, 5).map((actor: any, idx: number) => (
						<Box
							key={actor.id || idx}
							bg="gray.100"
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
				<Flex gap={4} wrap="wrap">
					{/* Filter for key roles: Director, Writer, etc. */}
					{movie.crew
						?.filter((member: any) =>
							["Director", "Writer", "Screenplay"].includes(member.job)
						)
						.map((member: any, idx: number) => (
							<Box
								key={member.id || idx}
								bg="gray.100"
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
				<Flex gap={2} wrap="wrap">
					{movie.production_companies?.map((company: any, idx: number) => (
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
