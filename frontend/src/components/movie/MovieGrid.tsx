import { COLORS } from "@/constants/theme";
import {
	useMemo,
	useState,
	useCallback,
	useEffect,
	forwardRef,
	useImperativeHandle,
} from "react";
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

export interface MovieGridRef {
	resetToPageOne: () => void;
}

const MovieGrid = forwardRef<MovieGridRef, MovieGridProps>(
	({ fetcher, source }, ref) => {
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

		const [currentPage, setCurrentPageState] = useState(getInitialPage());
		const pageSize = 20;

		// Expose resetToPageOne method via ref
		useImperativeHandle(
			ref,
			() => ({
				resetToPageOne: () => {
					console.log("Resetting to page 1");
					setCurrentPageState(1);
					if (typeof window !== "undefined") {
						const url = new URL(window.location.href);
						url.searchParams.delete("page");
						window.history.replaceState({}, "", url.toString());
					}
				},
			}),
			[]
		);

		const fetcherCallback = useMemo(() => {
			return () => fetcher(currentPage);
		}, [fetcher, currentPage]);
		const { total_pages, total_results, movies, error, setError, isLoading } =
			useMoviesArray(fetcherCallback);

		// Update URL when page changes
		const setCurrentPage = useCallback((page: number) => {
			// Validate page number (will be validated on next render when total_pages is available)
			const validPage = Math.max(1, page);
			setCurrentPageState(validPage);
			if (typeof window !== "undefined") {
				const url = new URL(window.location.href);
				if (validPage === 1) {
					url.searchParams.delete("page");
				} else {
					url.searchParams.set("page", validPage.toString());
				}
				window.history.replaceState({}, "", url.toString());
			}
		}, []);

		// Validate current page when total_pages changes
		useEffect(() => {
			if (
				total_pages !== undefined &&
				total_pages !== null &&
				!isNaN(total_pages)
			) {
				if (total_pages === 0) {
					// No pages available, redirect to page 1
					console.log(`No pages available, redirecting to page 1`);
					setCurrentPage(1);
				} else if (currentPage > total_pages) {
					console.log(
						`Current page ${currentPage} exceeds total pages ${total_pages}, redirecting to page ${total_pages}`
					);
					setCurrentPage(total_pages);
				}
			}
		}, [total_pages, currentPage, setCurrentPage]);

		// Debug logging
		console.log("MovieGrid Debug:", {
			currentPage,
			total_pages,
			total_results,
			moviesCount: movies.length,
			hasMovies: movies.length > 0,
			showPagination:
				total_pages > 1 && !isNaN(total_pages) && movies.length > 0,
		});

		// Handle empty pages after filtering
		const hasMovies = movies.length > 0;
		const shouldShowEmptyState = !isLoading && !hasMovies && !error;
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
				{hasMovies && (
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
							{`Showing ${currentPage * pageSize - pageSize + 1}-${Math.min(
								currentPage * pageSize,
								(currentPage - 1) * pageSize + movies.length
							)} of ${
								!isNaN(total_results) ? total_results.toLocaleString() : "0"
							} results`}
						</Text>
						{total_pages > 1 && !isNaN(total_pages) && (
							<PaginationCtrl
								currentPage={currentPage}
								onGoToPage={setCurrentPage}
								totalMovieCount={total_results}
								maxPagesToShow={currentPage + 5} // Only show up to 5 pages ahead
							/>
						)}
					</Box>
				)}

				{/* Movie Grid */}
				{shouldShowEmptyState ? (
					<Box textAlign="center" py={12}>
						<Text fontSize="lg" color={COLORS.text.secondary} mb={4}>
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
				)}

				{/* Bottom Pagination */}
				{total_pages > 1 && !isNaN(total_pages) && hasMovies && (
					<Box
						display="flex"
						justifyContent="center"
						mt={6}
						pt={4}
						borderTop={`1px solid ${COLORS.border.main}`}
					>
						<PaginationCtrl
							currentPage={currentPage}
							onGoToPage={setCurrentPage}
							totalMovieCount={total_results}
							maxPagesToShow={currentPage + 5} // Only show up to 5 pages ahead
						/>
					</Box>
				)}
			</>
		);
	}
);

MovieGrid.displayName = "MovieGrid";

export default MovieGrid;
