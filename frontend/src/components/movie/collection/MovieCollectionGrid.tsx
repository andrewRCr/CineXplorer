import { forwardRef, useImperativeHandle, useMemo, useRef, useEffect } from "react";
import { Text, Button, Box, Skeleton } from "@chakra-ui/react";
import MovieCard from "../MovieCard";
import MovieCardContainer from "../MovieCardContainer";
import { PaginationCtrl } from "../../layout/PaginationCtrl";
import { usePaginatedMovies } from "@/hooks/usePaginatedMovies";
import { useMovieCollectionContext } from "@/hooks/useMovieCollectionContext";
import { usePageChangeHandler } from "@/hooks/usePageChangeHandler";
import { usePaginationDisplay } from "@/hooks/usePaginationDisplay";
import { type Movie, type PaginatedMoviesResponse } from "@/types/movie";

// Create a placeholder movie object to be used in the skeleton loading state.
// This ensures the Skeleton wrapper has a correctly-structured child to measure.
const placeholderMovie: Movie = {
	tmdb_id: 0,
	title: "Loading Movie Title",
	release_date: new Date().toISOString(),
	poster_path: "",
	vote_average: 0,
	overview: "Loading overview...", // Placeholder value for loading state
	genres: [],
	runtime: 0,
};

export interface MovieGridRef {
	resetToPageOne: () => void;
}

// Props interface for when used without Outlet context
interface MovieCollectionGridProps {
	fetcher?: (page: number, tmdb_page_start?: number) => {
		request: Promise<{ data: PaginatedMoviesResponse }>;
		cancel: () => void;
	};
	source?: string;
	query?: string;
	initialCurrentPage?: number;
	onPageChange?: (page: number) => void; // New callback from parent
	enhancedFetcher?: (page: number, tmdb_page_start?: number) => {
		request: Promise<{ data: PaginatedMoviesResponse }>;
		cancel: () => void;
	};
}

const MovieCollectionGrid = forwardRef<MovieGridRef, MovieCollectionGridProps>(
	(props, ref) => {
		// Use custom hooks to extract complex logic
		const { source, query, currentPage, onPageChange, finalFetcher } =
			useMovieCollectionContext(props);

		const pageSize = 20;

		// Track smart buffer pagination metadata using ref to avoid triggering re-renders
		const nextTmdbPageStartRef = useRef<number | undefined>(undefined);
		const prevFetcherRef = useRef(finalFetcher);
		const prevNextTmdbPageStartRef = useRef<number | undefined>(undefined);

		// Reset metadata synchronously when fetcher changes (filter/route change)
		if (prevFetcherRef.current !== finalFetcher) {
			console.log('[MovieCollectionGrid] Buffer reset triggered - fetcher changed');
			nextTmdbPageStartRef.current = undefined;
			prevNextTmdbPageStartRef.current = undefined;
			prevFetcherRef.current = finalFetcher;
		}

		/**
		 * Adapter: Convert page-based fetcher to parameterless fetcher for usePaginatedMovies.
		 *
		 * usePaginatedMovies expects: () => { request, cancel }
		 * finalFetcher provides: (page: number, tmdb_page_start?: number) => { request, cancel }
		 *
		 * This adapter closes over currentPage and nextTmdbPageStartRef to satisfy the expected signature.
		 * Memoized to prevent unnecessary re-fetches when other state changes.
		 */
		const fetcherForMoviesArray = useMemo(() => {
			if (!finalFetcher) {
				return () => ({
					request: Promise.resolve({
						data: { page: 1, results: [], total_pages: 1, total_results: 0 },
					}),
					cancel: () => {},
				});
			}
			return () => {
				console.log('[MovieCollectionGrid] Fetcher executing with:', {
					page: currentPage,
					tmdb_page_start: nextTmdbPageStartRef.current
				});
				return finalFetcher(currentPage, nextTmdbPageStartRef.current);
			};
		}, [finalFetcher, currentPage]);

		const { total_pages, total_results, movies, error, setError, isLoading, next_tmdb_page_start } =
			usePaginatedMovies(fetcherForMoviesArray);

		// Update metadata ref when API returns new value (doesn't trigger re-render)
		// Only update if the value actually changed to avoid re-applying stale values
		useEffect(() => {
			const newValue = next_tmdb_page_start ?? undefined;
			if (prevNextTmdbPageStartRef.current !== newValue) {
				console.log('[MovieCollectionGrid] Updating buffer metadata:', {
					prev: prevNextTmdbPageStartRef.current,
					new: newValue,
					currentRefValue: nextTmdbPageStartRef.current
				});
				nextTmdbPageStartRef.current = newValue;
				prevNextTmdbPageStartRef.current = newValue;
			} else {
				console.log('[MovieCollectionGrid] Skipping stale buffer update:', newValue);
			}
		}, [next_tmdb_page_start]);

		// Handle page changes using custom hook
		const { handlePageChange } = usePageChangeHandler(onPageChange);

		// Expose methods through ref
		useImperativeHandle(ref, () => ({
			resetToPageOne: () => {
				handlePageChange(1);
			}
		}), [handlePageChange]);

		// Use display hook for pagination UI logic
		const { shouldShowEmptyState, shouldShowPagination, resultText } =
			usePaginationDisplay(
				currentPage,
				total_pages,
				total_results,
				movies.length,
				isLoading,
				pageSize
			);

		return (
			<>
				{/* Existing content */}
				{error && (
					<Box textAlign="center" mb={4}>
						<Text color="text.error" mb={2}>
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
							fontFamily={"inter"}
							color="text.secondary"
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
						<Text fontSize="lg" color="text.secondary" mb={0}>
							No movies found matching your filters.
						</Text>
						<Text fontSize="sm" color="text.secondary">
							Try adjusting your search criteria or filters.
						</Text>
					</Box>
				) : (
					<Box
						minHeight="1200px" // Prevent layout shift by maintaining minimum height
						opacity={isLoading ? 0.7 : 1}
						transition="opacity 0.3s ease-in-out"
					>
						<Box
							display="grid"
							gridTemplateColumns="repeat(auto-fit, 194px)"
							gap="16px"
							mb={6}
							justifyContent="start"
						>
							{isLoading
								? // Show skeletons whenever loading (initial, pagination, filtering)
								  Array.from({ length: 20 }, (_, i) => (
										<Skeleton
											key={i}
											borderRadius="md"
											overflow="hidden"
											bg="background.skeleton"
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
						</Box>
					</Box>
				)}

				{/* Bottom Pagination - Always render to prevent layout shift */}
				<Box
					display="flex"
					justifyContent="flex-end"
					mb={1}
					mt={1}
					borderTop="1px solid"
					borderTopColor="red.300"
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
