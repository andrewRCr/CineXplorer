import { COLORS } from "@/constants/theme";
import { forwardRef } from "react";
import { SimpleGrid, Text, Button, Box, Skeleton } from "@chakra-ui/react";
import MovieCard from "./MovieCard";
import MovieCardContainer from "./MovieCardContainer";
import { PaginationCtrl } from "../layout/PaginationCtrl";
import useMoviesArray from "@/hooks/useMoviesArray";
import { useMovieCollectionContext } from "@/hooks/useMovieCollectionContext";
import { usePageChangeHandler } from "@/hooks/usePageChangeHandler";
import { useMoviesFetcher } from "@/hooks/useMoviesFetcher";
import { usePaginationDisplay } from "@/hooks/usePaginationDisplay";
import {
	type Movie,
	type PaginatedMoviesResponse,
} from "@/types/movie";

// Create a placeholder movie object to be used in the skeleton loading state.
// This ensures the Skeleton wrapper has a correctly-structured child to measure.
const placeholderMovie: Movie = {
	tmdb_id: 0,
	title: "Loading Movie Title",
	release_date: new Date().toISOString(),
	poster_path: "",
	vote_average: 0,
	overview: "Loading overview...",
	genres: [],
	runtime: 0,
};

export interface MovieGridRef {
	resetToPageOne: () => void;
}

// Props interface for when used without Outlet context
interface MovieCollectionGridProps {
	fetcher?: (page: number) => {
		request: Promise<{ data: PaginatedMoviesResponse }>;
		cancel: () => void;
	};
	source?: string;
	query?: string;
	initialCurrentPage?: number;
	onPageChange?: (page: number) => void; // New callback from parent
	enhancedFetcher?: (page: number) => {
		request: Promise<{ data: PaginatedMoviesResponse }>;
		cancel: () => void;
	};
}

const MovieCollectionGrid = forwardRef<MovieGridRef, MovieCollectionGridProps>(
	(props) => {
		// Use custom hooks to extract complex logic
		const { source, query, currentPage, onPageChange, finalFetcher } = 
			useMovieCollectionContext(props);

		const pageSize = 20;

		// Create fetcher for useMoviesArray using custom hook
		const fetcherForMoviesArray = useMoviesFetcher(finalFetcher, currentPage);

		const { total_pages, total_results, movies, error, setError, isLoading } =
			useMoviesArray(fetcherForMoviesArray);

		// Handle page changes using custom hook
		const { handlePageChange } = usePageChangeHandler(onPageChange);

		// Use display hook for pagination UI logic
		const { shouldShowEmptyState, shouldShowPagination, resultText } = 
			usePaginationDisplay(currentPage, total_pages, total_results, movies.length, isLoading, pageSize);


		return (
			<>
				{/* Existing content */}
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

				{/* Top Pagination and Results Count - Always render to prevent layout shift */}
				<Box
					display="flex"
					justifyContent="space-between"
					alignItems="center"
					mb={4}
					flexWrap="wrap"
					gap={2}
					minHeight="40px" // Prevent layout shift
					opacity={shouldShowPagination ? 1 : 0}
					pointerEvents={shouldShowPagination ? "auto" : "none"}
					transition="opacity 0.2s ease"
				>
					<Box minWidth="150px" display="flex" alignItems="center">
						<Text
							fontSize="sm"
							color={COLORS.text.secondary}
							fontWeight="medium"
							opacity={isLoading ? 0.6 : 1}
							transition="opacity 0.2s ease"
						>
							{resultText}
						</Text>
					</Box>
					<Box minWidth="200px" display="flex" justifyContent="flex-end">
						{shouldShowPagination && (
							<PaginationCtrl
								currentPage={currentPage}
								onGoToPage={handlePageChange}
								totalMovieCount={total_results}
								totalPages={total_pages}
							/>
						)}
					</Box>
				</Box>

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
					<Box
						minHeight="1200px" // Prevent layout shift by maintaining minimum height
						opacity={isLoading ? 0.7 : 1}
						transition="opacity 0.3s ease-in-out"
					>
						<SimpleGrid
							columns={{ base: 1, sm: 2, md: 3, lg: 4, xl: 5 }}
							gap="20px"
							mb={6}
						>
							{isLoading
								? // Show skeletons whenever loading (initial, pagination, filtering)
								  Array.from({ length: 20 }, (_, i) => (
										<Skeleton
											key={i}
											borderRadius="md"
											overflow="hidden"
											bg={COLORS.background.skeleton}
										>
											<MovieCardContainer>
												<MovieCard movie={placeholderMovie} />
											</MovieCardContainer>
										</Skeleton>
								  ))
								: // Otherwise, show the movies
				  movies.map((movie: Movie) => (
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
					</Box>
				)}

				{/* Bottom Pagination - Always render to prevent layout shift */}
				<Box
					display="flex"
					justifyContent="flex-end"
					mb={1}
					mt={1}
					borderTop={`1px solid ${COLORS.border.main}`}
					minHeight="50px" // Prevent layout shift
					paddingTop={2}
					opacity={shouldShowPagination ? 1 : 0}
					pointerEvents={shouldShowPagination ? "auto" : "none"}
					transition="opacity 0.2s ease"
				>
					<Box minWidth="200px" display="flex" justifyContent="flex-end">
						{shouldShowPagination && (
							<PaginationCtrl
								currentPage={currentPage}
								onGoToPage={handlePageChange}
								totalMovieCount={total_results}
								totalPages={total_pages}
							/>
						)}
					</Box>
				</Box>
			</>
		);
	}
);

MovieCollectionGrid.displayName = "MovieCollectionGrid";

export default MovieCollectionGrid;
