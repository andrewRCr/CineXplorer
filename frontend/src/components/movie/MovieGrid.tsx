import { COLORS } from "@/constants/theme";
import {
	useMemo,
	forwardRef,
	useImperativeHandle,
} from "react";
import { SimpleGrid, Text, Button, Box, Skeleton } from "@chakra-ui/react";
import MovieCard from "./MovieCard";
import MovieCardContainer from "./MovieCardContainer";
import { PaginationCtrl } from "../layout/PaginationCtrl";
import useMoviesArray from "@/hooks/useMoviesArray";
import { useMovieGridPagination } from "@/hooks/useMovieGridPagination";
import { usePaginationDisplay } from "@/hooks/usePaginationDisplay";
import { type PaginatedMoviesResponse } from "@/types/movie";

interface MovieGridProps {
	fetcher: (page: number) => {
		request: Promise<{ data: PaginatedMoviesResponse }>;
		cancel: () => void;
	};
	source?: string;
	query?: string;
	initialCurrentPage?: number;
}

export interface MovieGridRef {
	resetToPageOne: () => void;
}

const MovieGrid = forwardRef<MovieGridRef, MovieGridProps>(
	({ fetcher, source, query, initialCurrentPage }, ref) => {
		const pageSize = 20;

		// Use pagination hook for complex URL and state management first
		const { currentPage, handlePageChange, resetToPageOne } = useMovieGridPagination(
			initialCurrentPage
		);

		// Create fetcher callback that uses the current page from pagination hook
		const fetcherCallback = useMemo(() => {
			return () => {
				return fetcher(currentPage);
			};
		}, [fetcher, currentPage]);
		
		const {
			total_pages,
			total_results,
			movies,
			error,
			setError,
			isLoading,
		} = useMoviesArray(fetcherCallback);

		// Use display hook for pagination UI logic
		const { shouldShowEmptyState, shouldShowPagination, resultText } =
			usePaginationDisplay(currentPage, total_pages, total_results, movies.length, isLoading, pageSize);

		// Expose resetToPageOne method via ref
		useImperativeHandle(
			ref,
			() => ({
				resetToPageOne,
			}),
			[resetToPageOne]
		);



		const skeletons = [1, 2, 3, 4, 5, 6, 7, 8];
		
		return (
			<>
				{error && (
					<Box textAlign="center" mb={4}>
						<Text color={COLORS.text.error} mb={2}>
							{error}
						</Text>
						<Button size="sm" onClick={() => setError("")}>
							Dismiss
						</Button>
					</Box>
				)}

				{/* Top Pagination and Results Count */}
				{shouldShowPagination && (
					<Box
						display="flex"
						justifyContent="space-between"
						alignItems="center"
						mb={4}
						flexWrap="wrap"
						gap={2}
					>
						<Text
							fontSize="sm"
							color={COLORS.text.secondary}
							fontWeight="medium"
						>
							{resultText}
						</Text>
						<PaginationCtrl
							currentPage={currentPage}
							onGoToPage={handlePageChange}
							totalMovieCount={total_results}
							totalPages={total_pages}
						/>
					</Box>
				)}

				{/* Movie Grid */}
				{shouldShowEmptyState ? (
					<Box textAlign="center" py={12}>
						<Text fontSize="lg" color={COLORS.text.secondary} mb={0}>
							No movies found matching your filters.
						</Text>
						<Text fontSize="sm" color={COLORS.text.secondary}>
							Try adjusting your search criteria or filters.
						</Text>
					</Box>
				) : (
					<SimpleGrid
						columns={{ base: 1, sm: 2, md: 3, lg: 4, xl: 5 }}
						gap="20px"
						mb={6}
					>
						{isLoading
							? skeletons.map((skeleton) => (
									<MovieCardContainer key={skeleton}>
										<Skeleton />
									</MovieCardContainer>
							  ))
							: movies.map((movie) => (
									<MovieCardContainer key={movie.tmdb_id}>
										<MovieCard
											movie={movie}
											currentPage={currentPage}
											source={source}
											query={query}
										/>
									</MovieCardContainer>
							  ))}
					</SimpleGrid>
				)}

				{/* Bottom Pagination */}
				{shouldShowPagination && (
					<Box
						display="flex"
						justifyContent="flex-end"
						mb={1}
						mt={1}
						borderTop={`1px solid ${COLORS.border.main}`}
					>
						<PaginationCtrl
							currentPage={currentPage}
							onGoToPage={handlePageChange}
							totalMovieCount={total_results}
							totalPages={total_pages}
						/>
					</Box>
				)}
			</>
		);
	}
);

MovieGrid.displayName = "MovieGrid";

export default MovieGrid;
