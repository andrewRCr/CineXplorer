import { useMemo, useState } from "react";
import { SimpleGrid, Text, Button } from "@chakra-ui/react";
import MovieCard from "./MovieCard";
import MovieCardSkeleton from "./MovieCardSkeleton";
import MovieCardContainer from "./MovieCardContainer";
import { PaginationCtrl } from "../layout/PaginationCtrl";
import useMoviesArray from "@/hooks/useMoviesArray";
import { type PaginatedMoviesResponse } from "../../services/movieService";

interface MovieGridProps {
	fetcher: (page: number) => {
		request: Promise<{ data: PaginatedMoviesResponse }>;
		cancel: () => void;
	};
}

const MovieGrid = ({ fetcher }: MovieGridProps) => {
	// pagination state
	const [currentPage, setCurrentPage] = useState(1);
	const pageSize = 20;

	const fetcherCallback = useMemo(() => {
		return () => {
			console.log("MovieGrid: fetcherCallback called for page", currentPage);
			return fetcher(currentPage);
		};
	}, [fetcher, currentPage]);

	const { total_pages, total_results, movies, error, setError, isLoading } =
		useMoviesArray(fetcherCallback);
	const skeletons = [1, 2, 3, 4, 5, 6, 7, 8];

	return (
		<>
			{error && (
				<Text>
					{error}
					<Button size="sm" ml={2} onClick={() => setError("")}>
						Dismiss
					</Button>
				</Text>
			)}
			<PaginationCtrl
				key="topCtrl"
				currentPage={currentPage}
				onGoToPage={setCurrentPage}
				maxPage={total_pages}
				// pageSize={pageSize}
				totalMovieCount={total_results}
			/>
			<Text>
				{`Showing ${currentPage * pageSize - pageSize + 1}-${
					currentPage * pageSize
				} of ${total_results} results`}
			</Text>
			<SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} gap="15px" p={1}>
				{isLoading &&
					skeletons.map((skeleton) => (
						<MovieCardContainer key={skeleton}>
							<MovieCardSkeleton />
						</MovieCardContainer>
					))}

				{movies
					// .slice((currentPage - 1) * pageSize, currentPage * pageSize)
					.map((movie) => (
						<MovieCardContainer>
							<MovieCard key={movie.tmdb_id} movie={movie} />
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
				maxPage={total_pages}
				// pageSize={pageSize}
				totalMovieCount={total_results}
			/>
		</>
	);
};

export default MovieGrid;
