import { COLORS } from "@/constants/theme";
import {
	useMemo,
	useState,
	useCallback,
	useEffect,
	forwardRef,
	useImperativeHandle,
	useRef,
} from "react";
import { SimpleGrid, Text, Button, Box, Skeleton } from "@chakra-ui/react";
import { useNavigate, useLocation } from "react-router-dom";
import MovieCard from "./MovieCard";
import MovieCardContainer from "./MovieCardContainer";
import { PaginationCtrl } from "../layout/PaginationCtrl";
import useMoviesArray from "@/hooks/useMoviesArray";
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
		const navigate = useNavigate();
		const location = useLocation();

		const [currentPage, setCurrentPageState] = useState(1); // Start with page 1, will be updated by effects
		const pageSize = 20;

		// Track if we're currently navigating to prevent infinite loops
		const isNavigatingRef = useRef(false);

		// Memoize URL construction to avoid dependency issues
		const constructUrl = useCallback(
			(page: number, pathname: string, search: string) => {
				const searchParams = new URLSearchParams(search);
				if (page === 1) {
					searchParams.delete("page");
				} else {
					searchParams.set("page", page.toString());
				}
				const newSearch = searchParams.toString();
				return `${pathname}${newSearch ? `?${newSearch}` : ""}`;
			},
			[]
		);

		// Track the last URL we navigated to
		const lastNavigatedUrlRef = useRef<string | null>(null);

		// Track if initial page setup has been completed
		const initialSetupDoneRef = useRef(false);

		// Initialize current page from props or URL
		useEffect(() => {
			// Prevent re-running this effect after initial setup
			if (initialSetupDoneRef.current) {
				return;
			}


			let initialPage = 1; // Default

			// Priority 1: Use initialCurrentPage prop if provided
			if (initialCurrentPage && initialCurrentPage > 0) {
				initialPage = initialCurrentPage;
			}
			// Priority 2: Parse from URL if no prop provided
			else if (typeof window !== "undefined") {
				const params = new URLSearchParams(location.search);
				const pageParam = params.get("page");
				const urlPage = pageParam ? parseInt(pageParam, 10) : 1;
				initialPage = isNaN(urlPage) || urlPage < 1 ? 1 : urlPage;
			}

			setCurrentPageState(initialPage);

			// Initialize lastNavigatedUrlRef
			const initialUrl = constructUrl(
				initialPage,
				location.pathname,
				location.search
			);
			lastNavigatedUrlRef.current = initialUrl;

			// Mark initial setup as complete
			initialSetupDoneRef.current = true;
		}, [initialCurrentPage, location.pathname, location.search, constructUrl]);


		// Track if current page was set from props to avoid URL updates
		const [pageSetFromProps, setPageSetFromProps] = useState(false);

		// Track if we're currently processing a reset to prevent URL update conflicts
		const [isProcessingReset, setIsProcessingReset] = useState(false);

	const fetcherCallback = useMemo(() => {
		return () => {
			return fetcher(currentPage);
		};
	}, [fetcher, currentPage]);
		const {
			page,
			total_pages,
			total_results,
			movies,
			error,
			setError,
			isLoading,
		} = useMoviesArray(fetcherCallback);

		// Expose resetToPageOne method via ref
		useImperativeHandle(
			ref,
			() => ({
			resetToPageOne: () => {
				setCurrentPageState(1);
				// Also update the URL to remove page parameter
				if (typeof window !== "undefined") {
					const url = new URL(window.location.href);
					url.searchParams.delete("page");
					window.history.replaceState({}, "", url.toString());
				}
			},
			}),
			[]
		);

		// Update currentPage when initialCurrentPage prop changes
		useEffect(() => {
			if (initialCurrentPage && initialCurrentPage !== currentPage) {
				// Only validate against total_pages if we have real data from TMDB
				// Don't validate against placeholder/default values
				let validPage = initialCurrentPage;
				const hasRealData = total_pages > 1 && total_results > 0;

				if (
					hasRealData &&
					total_pages !== undefined &&
					total_pages !== null &&
					!isNaN(total_pages) &&
					total_pages > 0
				) {
				if (initialCurrentPage > total_pages) {
					validPage = total_pages;
				} else if (initialCurrentPage < 1) {
					validPage = 1;
				}
			} else if (!hasRealData) {
				// We don't have real data yet, allow any reasonable page number
				// TMDB typically supports thousands of pages
			}

				setPageSetFromProps(true);
				setCurrentPageState(validPage);
				// Reset the flag after a short delay to allow URL updates for user interactions
				setTimeout(() => setPageSetFromProps(false), 0);
			}
		}, [
			initialCurrentPage,
			currentPage,
			pageSetFromProps,
			total_pages,
			total_results,
		]);

		// Handle page changes from user interaction
	const handlePageChange = useCallback(
		(page: number) => {
			// Ensure we don't have any lingering reset parameters
			const currentParams = new URLSearchParams(window.location.search);
			if (currentParams.has("reset")) {
				currentParams.delete("reset");
			}

			// Validate page number (will be validated on next render when total_pages is available)
			const validPage = Math.max(1, page);
			setCurrentPageState(validPage);
			},
			[currentPage, isProcessingReset]
		);

		// Safety mechanism: Force reset navigation flag if it gets stuck
		useEffect(() => {
			const resetTimer = setTimeout(() => {
			if (isNavigatingRef.current) {
				isNavigatingRef.current = false;
			}
			}, 2000); // Reset after 2 seconds if stuck

			return () => clearTimeout(resetTimer);
		}, [currentPage]); // Run whenever currentPage changes

		// Update URL when currentPage changes
		useEffect(() => {

		// Skip if initial setup is not complete yet
		if (!initialSetupDoneRef.current) {
			return;
		}

		// Skip if we're currently processing a reset
		if (isProcessingReset) {
			return;
		}

		// Skip if we're already navigating to prevent infinite loops
		if (isNavigatingRef.current) {
			return;
		}


			const newUrl = constructUrl(
				currentPage,
				location.pathname,
				location.search
			);


		// Only navigate if the URL actually changed from what we last navigated to
		if (lastNavigatedUrlRef.current !== newUrl) {
			isNavigatingRef.current = true;
			lastNavigatedUrlRef.current = newUrl;
			// Use push navigation for pagination to create proper history entries
			navigate(newUrl);
			// Reset the flag after navigation completes
			setTimeout(() => {
				isNavigatingRef.current = false;
			}, 100); // Increased timeout to ensure navigation completes
		}
		}, [
			currentPage,
			navigate,
			constructUrl,
			location.pathname,
			location.search,
			initialCurrentPage,
			isProcessingReset, // Add this dependency to prevent URL updates during reset
		]);

		// Handle browser navigation via React Router
		useEffect(() => {
		// Reset navigation flag when location changes
		isNavigatingRef.current = false;

			if (typeof window !== "undefined") {
				const params = new URLSearchParams(location.search);
				const pageParam = params.get("page");
				const resetParam = params.get("reset");
				const urlPage = pageParam ? parseInt(pageParam, 10) : 1;
				const validPage = isNaN(urlPage) ? 1 : Math.max(1, urlPage);


			// Handle sidebar reset navigation
			if (resetParam) {
				setIsProcessingReset(true);

					// Remove BOTH reset and page parameters to get a completely clean URL
					params.delete("reset");
					params.delete("page"); // Also remove any existing page parameter
					const cleanSearch = params.toString();
					const cleanUrl = `${location.pathname}${
						cleanSearch ? `?${cleanSearch}` : ""
					}`;


					// Update state to page 1 FIRST
					setCurrentPageState(1);

				// Clean up the URL using React Router's navigate with replace
					try {
						navigate(cleanUrl, { replace: true });
			} catch (error) {
				// Fallback to history API
				window.history.replaceState({}, "", cleanUrl);
			}

					// Double-check cleanup after a short delay
					setTimeout(() => {
						try {
							const currentSearch = window.location.search;
							const currentParams = new URLSearchParams(currentSearch);
					if (currentParams.has("reset")) {
						currentParams.delete("reset");
						currentParams.delete("page");
						const finalCleanUrl = `${window.location.pathname}${
							currentParams.toString() ? `?${currentParams.toString()}` : ""
						}`;
						navigate(finalCleanUrl, { replace: true });
					}
			} catch (error) {
				// Error in cleanup - silently handle
			}
					}, 50);


					// Update the last navigated URL to the clean URL to prevent URL update effect
					lastNavigatedUrlRef.current = cleanUrl;

			// Reset the processing flag after a longer delay to ensure everything is settled
			setTimeout(() => {
				setIsProcessingReset(false);
			}, 300);

					return;
				}

				// Update the last navigated URL to prevent unnecessary navigation
				// For location changes, construct URL with the current location's search params
				const currentUrl = constructUrl(
					validPage,
					location.pathname,
					location.search
				);
				lastNavigatedUrlRef.current = currentUrl;

			// Always update from URL changes to ensure synchronization
			// This handles browser back/forward navigation
			setCurrentPageState(validPage);
			}
		}, [
			location.pathname,
			location.search,
			constructUrl,
			currentPage,
			navigate,
		]);

		// Validate current page when total_pages changes
		useEffect(() => {
			const hasRealData = total_pages > 1 && total_results > 0;

			if (
				total_pages !== undefined &&
				total_pages !== null &&
				!isNaN(total_pages) &&
				hasRealData && // Only validate when we have real data from TMDB
				!pageSetFromProps // Don't validate if page was set from props
			) {
			if (total_pages === 0) {
				// No pages available, redirect to page 1
				setCurrentPageState(1);
				} else if (currentPage > total_pages) {
					// Only redirect if we're way beyond the reported total_pages
					// Allow some buffer for TMDB API inconsistencies
					const buffer = 50; // Allow 50 pages beyond reported total_pages
				if (currentPage > total_pages + buffer) {
					setCurrentPageState(total_pages);
				}
				}
		}
		}, [total_pages, currentPage, pageSetFromProps, total_results]);

		// Handle case where API returns different page than requested (e.g., TMDB pagination limits)
		useEffect(() => {
		if (page !== undefined && page !== null && !isNaN(page) && !isLoading) {

			// Check if TMDB returned a different page than requested
			if (page !== currentPage) {

				// Only redirect pages that are truly beyond TMDB's documented limits
				// TMDB docs say max 500 pages, so only redirect if requesting > 500
				if (page === 1 && currentPage > 500) {
					// Redirect to TMDB's documented maximum
					const maxPage = 500;
					setCurrentPageState(maxPage);
					}
				// For other page mismatches within TMDB's documented limits (1-500), update to match API response
				// This handles cases where TMDB returns a different page (e.g., last available page)
				else if (currentPage <= 500) {
					setCurrentPageState(page);
				}
			}
		}
		}, [page, currentPage, isLoading, pageSetFromProps]);


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
								!isNaN(total_results)
									? total_results > 10000
										? "10,000+"
										: total_results.toLocaleString()
									: "0"
							} results`}
						</Text>
						{total_pages > 1 && !isNaN(total_pages) && (
							<PaginationCtrl
								currentPage={currentPage}
								onGoToPage={handlePageChange}
								totalMovieCount={total_results}
								totalPages={total_pages}
							/>
						)}
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
			: movies.map((movie: PaginatedMoviesResponse['results'][number]) => (
									<MovieCardContainer key={movie.tmdb_id}>
										<MovieCard
											key={movie.tmdb_id}
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
				{total_pages > 1 && !isNaN(total_pages) && hasMovies && (
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
