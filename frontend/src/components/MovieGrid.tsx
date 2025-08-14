import { useEffect, useState } from "react";
import apiClient from "@/services/apiClient";
import useMovie from "@/hooks/useMovie";
import { SimpleGrid, Text } from "@chakra-ui/react";
import MovieCard from "./MovieCard";
import MovieCardSkeleton from "./MovieCardSkeleton";
import MovieCardContainer from "./MovieCardContainer";

const MovieGrid = () => {
	const { movies, error, setMovies, setError, isLoading } = useMovie();
	const skeletons = [1, 2, 3, 4, 5, 6, 7, 8];

	return (
		<>
			{error && <Text>{error}</Text>}
			<SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} gap="15px" p={1}>
				{/* <SimpleGrid minChildWidth="xs" gap="5px" p={2}> */}
				{isLoading &&
					skeletons.map((skeleton) => (
						<MovieCardContainer key={skeleton}>
							<MovieCardSkeleton />
						</MovieCardContainer>
					))}
				{movies.map((movie) => (
					<MovieCardContainer>
						<MovieCard key={movie.id} movie={movie} />
					</MovieCardContainer>
				))}
			</SimpleGrid>
		</>
	);
};

export default MovieGrid;
