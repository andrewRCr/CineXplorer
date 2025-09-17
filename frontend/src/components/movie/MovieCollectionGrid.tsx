import { COLORS } from "@/constants/theme";
import { useCallback, forwardRef, useMemo } from "react";
import { SimpleGrid, Text, Button, Box, Skeleton } from "@chakra-ui/react";
import { useOutletContext } from "react-router-dom";
import MovieCard from "./MovieCard";
import MovieCardContainer from "./MovieCardContainer";
import { PaginationCtrl } from "../layout/PaginationCtrl";
import useMoviesArray from "@/hooks/useMoviesArray";
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

// Define the context type that matches what MovieCollectionLayout passes
interface MovieCollectionContext {
	fetcher: (page: number) => {
		request: Promise<{ data: PaginatedMoviesResponse }>;
		cancel: () => void;
	};
	source?: string;
	query?: string;
	initialCurrentPage?: number;
	onPageChange: (page: number) => void; // New callback from parent
	enhancedFetcher: (page: number) => {
		request: Promise<{ data: PaginatedMoviesResponse }>;
		cancel: () => void;
	};
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
		// Get context from parent layout, or use props as fallback
		const context = useOutletContext<MovieCollectionContext>();
		const {
			fetcher: contextFetcher,
			source: contextSource,
			query: contextQuery,
			initialCurrentPage: contextInitialPage,
			onPageChange: contextOnPageChange,
			enhancedFetcher: contextEnhancedFetcher,
		} = context || {};

		// Use props if provided, otherwise use context
		const fetcher = props.fetcher || contextFetcher;
		const source = props.source || contextSource;
		const query = props.query || contextQuery;
		const currentPage = props.initialCurrentPage || contextInitialPage || 1; // Directly use the prop
		const onPageChange = props.onPageChange || contextOnPageChange;
		const enhancedFetcherFromProps =
			props.enhancedFetcher || contextEnhancedFetcher;

		const pageSize = 20;

		// Use the enhanced fetcher from context or props
		const finalFetcher = enhancedFetcherFromProps || fetcher;

		// Create fetcher for useMoviesArray, now dependent on the currentPage prop
		const fetcherForMoviesArray = useMemo(() => {
			if (!finalFetcher) {
				return () => ({
					request: Promise.resolve({
						data: { page: 1, results: [], total_pages: 1, total_results: 0 },
					}),
					cancel: () => {},
				});
			}
			return () => finalFetcher(currentPage);
		}, [finalFetcher, currentPage]);

		const { total_pages, total_results, movies, error, setError, isLoading } =
			useMoviesArray(fetcherForMoviesArray);

		// Handle page changes from user interaction by calling the parent callback
		const handlePageChange = useCallback(
			(page: number) => {
				if (onPageChange) {
					console.log(
						"MovieGrid: handlePageChange called, passing to parent with page",
						page
					);
					onPageChange(page);
				} else {
					console.warn("MovieGrid: onPageChange handler is not provided.");
				}
			},
			[onPageChange]
		);

		// Handle empty pages after filtering
		const hasMovies = movies.length > 0;
		const shouldShowEmptyState = !isLoading && !hasMovies && !error;

		// Determine if we should show pagination controls
		// Show them only when we have movies AND valid pagination data
		// Hide during transitions when data is stale
		const shouldShowPagination =
			hasMovies &&
			total_pages > 1 &&
			!isNaN(total_pages) &&
			total_pages !== undefined &&
			total_pages !== null &&
			total_pages > 0;

		// Debug logging
		console.log("MovieGrid Debug:", {
			currentPage,
			total_pages,
			total_results,
			moviesCount: movies.length,
			hasMovies: movies.length > 0,
			isLoading,
			shouldShowPagination,
			showPagination:
				total_pages > 1 && !isNaN(total_pages) && movies.length > 0,
		});

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
							{shouldShowPagination
								? isLoading
									? "Loading results..."
									: `Showing ${
											currentPage * pageSize - pageSize + 1
									  }-${Math.min(
											currentPage * pageSize,
											(currentPage - 1) * pageSize + movies.length
									  )} of ${
											!isNaN(total_results)
												? total_results > 10000
													? "10,000+"
													: total_results.toLocaleString()
												: "0"
									  } results`
								: ""}
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
