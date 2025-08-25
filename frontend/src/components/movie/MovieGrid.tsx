import { COLORS } from "@/constants/theme";
import { useMemo, useState } from "react";
import { SimpleGrid, Text, Button, Box } from "@chakra-ui/react";
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
	source?: string;
}

const MovieGrid = ({ fetcher, source }: MovieGridProps) => {
	// Read page from URL query param on initial render
	const getInitialPage = () => {
		if (typeof window !== "undefined") {
			const params = new URLSearchParams(window.location.search);
			const pageParam = params.get("page");
			const pageNum = pageParam ? parseInt(pageParam, 10) : 1;
			return isNaN(pageNum) ? 1 : pageNum;
		}
		return 1;
	};
	const [currentPage, setCurrentPage] = useState(getInitialPage());
	const pageSize = 20;
	const fetcherCallback = useMemo(() => {
		return () => fetcher(currentPage);
	}, [fetcher, currentPage]);
	const { total_pages, total_results, movies, error, setError, isLoading } =
		useMoviesArray(fetcherCallback);
	const skeletons = [1, 2, 3, 4, 5, 6, 7, 8];
	return (
		<>
			{error && (
				<Text textAlign="center" color={COLORS.text.error}>
					{error}
					<Button size="sm" ml={2} onClick={() => setError("")}>
						Dismiss
					</Button>
				</Text>
			)}
			<Box w="100%" textAlign="center" mb={2}>
				<PaginationCtrl
					key="topCtrl"
					currentPage={currentPage}
					onGoToPage={setCurrentPage}
					maxPage={total_pages}
					totalMovieCount={total_results}
				/>
			</Box>
			<Text textAlign="center" mb="2" color={COLORS.text.secondary}>
				{`Showing ${currentPage * pageSize - pageSize + 1}-${Math.min(
					currentPage * pageSize,
					total_results
				)} of ${total_results} results`}
			</Text>
			<SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} gap="15px" p={1}>
				{isLoading
					? skeletons.map((skeleton) => (
							<MovieCardContainer key={skeleton}>
								<MovieCardSkeleton />
							</MovieCardContainer>
					  ))
					: movies.map((movie) => (
							<MovieCardContainer key={movie.tmdb_id}>
								<MovieCard
									key={movie.tmdb_id}
									movie={movie}
									currentPage={currentPage}
									source={source}
								/>
							</MovieCardContainer>
					  ))}
			</SimpleGrid>
			<Text textAlign="center" mt="2" color={COLORS.text.secondary}>
				{`Showing ${currentPage * pageSize - pageSize + 1}-${Math.min(
					currentPage * pageSize,
					total_results
				)} of ${total_results} results`}
			</Text>
			<Box w="100%" textAlign="center" mt={2}>
				<PaginationCtrl
					key="bottomCtrl"
					currentPage={currentPage}
					onGoToPage={setCurrentPage}
					maxPage={total_pages}
					totalMovieCount={total_results}
				/>
			</Box>
		</>
	);
};

export default MovieGrid;
