import { useEffect, useState } from "react";
// import useMovie from "@/hooks/useMovie";
import useMoviesArrResult from "@/hooks/useMoviesArray";
import { SimpleGrid, Text } from "@chakra-ui/react";
import MovieCard from "./MovieCard";
import MovieCardSkeleton from "./MovieCardSkeleton";
import MovieCardContainer from "./MovieCardContainer";
import { PaginationCtrl } from "./PaginationCtrl";
import useMoviesArray from "@/hooks/useMoviesArray";
import { type Movie } from "../services/movieService";

interface MovieGridProps {
	fetcher: () => { request: Promise<{ data: Movie[] }>; cancel: () => void };
}

const MovieGrid = ({ fetcher }: MovieGridProps) => {
	const { movies, error, setMovies, setError, isLoading } =
		useMoviesArray(fetcher);
	const skeletons = [1, 2, 3, 4, 5, 6, 7, 8];

	// pagination state
	const [currentPage, setCurrentPage] = useState(1);
	const [pageSize, setPageSize] = useState(20);

	return (
		<>
			{error && <Text>{error}</Text>}
			<PaginationCtrl
				key="topCtrl"
				currentPage={currentPage}
				onGoToPage={setCurrentPage}
				pageSize={pageSize}
				totalCount={movies.length}
			/>
			<Text>
				{`Showing ${currentPage * pageSize - pageSize + 1}-${
					currentPage * pageSize
				} of ${movies.length} results`}
			</Text>
			<SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} gap="15px" p={1}>
				{isLoading &&
					skeletons.map((skeleton) => (
						<MovieCardContainer key={skeleton}>
							<MovieCardSkeleton />
						</MovieCardContainer>
					))}

				{movies
					.slice((currentPage - 1) * pageSize, currentPage * pageSize)
					.map((movie) => (
						<MovieCardContainer>
							<MovieCard key={movie.id} movie={movie} />
						</MovieCardContainer>
					))}
			</SimpleGrid>
			<Text>
				{`Showing ${currentPage * pageSize - pageSize + 1}-${
					currentPage * pageSize
				} of ${movies.length} results`}
			</Text>
			<PaginationCtrl
				key="bottomCtrl"
				currentPage={currentPage}
				onGoToPage={setCurrentPage}
				pageSize={pageSize}
				totalCount={movies.length}
			/>
		</>
	);
};

export default MovieGrid;
