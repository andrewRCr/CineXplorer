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
import { type PaginatedMoviesResponse } from "../../services/movieService";

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
				console.log("MovieGrid: Initial setup already done, skipping");
				return;
			}

			console.log("MovieGrid: Initial page setup effect", {
				initialCurrentPage,
				locationSearch: location.search,
			});

			let initialPage = 1; // Default

			// Priority 1: Use initialCurrentPage prop if provided
			if (initialCurrentPage && initialCurrentPage > 0) {
				initialPage = initialCurrentPage;
				console.log("MovieGrid: Using initialCurrentPage prop:", initialPage);
			}
			// Priority 2: Parse from URL if no prop provided
			else if (typeof window !== "undefined") {
				const params = new URLSearchParams(location.search);
				const pageParam = params.get("page");
				const urlPage = pageParam ? parseInt(pageParam, 10) : 1;
				initialPage = isNaN(urlPage) || urlPage < 1 ? 1 : urlPage;
				console.log("MovieGrid: Using URL page parameter:", initialPage);
			}

			console.log("MovieGrid: Setting initial page to:", initialPage);
			setCurrentPageState(initialPage);

			// Initialize lastNavigatedUrlRef
			const initialUrl = constructUrl(
				initialPage,
				location.pathname,
				location.search
			);
			lastNavigatedUrlRef.current = initialUrl;
			console.log("MovieGrid: Initialized lastNavigatedUrlRef to:", initialUrl);

			// Mark initial setup as complete
			initialSetupDoneRef.current = true;
		}, [initialCurrentPage, location.pathname, location.search, constructUrl]);

		console.log("MovieGrid: Received props", {
			source,
			query,
			initialCurrentPage,
		});

		// Track if current page was set from props to avoid URL updates
		const [pageSetFromProps, setPageSetFromProps] = useState(false);

		// Track if we're currently processing a reset to prevent URL update conflicts
		const [isProcessingReset, setIsProcessingReset] = useState(false);

		const fetcherCallback = useMemo(() => {
			console.log(
				"MovieGrid: Creating new fetcherCallback for page",
				currentPage
			);
			return () => {
				console.log(
					"MovieGrid: fetcherCallback called, calling fetcher with page",
					currentPage
				);
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
					console.log("Resetting to page 1");
					setCurrentPageState(1);
					// Also update the URL to remove page parameter
					if (typeof window !== "undefined") {
						const url = new URL(window.location.href);
						url.searchParams.delete("page");
						window.history.replaceState({}, "", url.toString());
						console.log("MovieGrid: URL updated to remove page parameter");
					}
				},
			}),
			[]
		);

		// Update currentPage when initialCurrentPage prop changes
		useEffect(() => {
			console.log("MovieGrid: Prop update useEffect", {
				initialCurrentPage,
				currentPage,
				pageSetFromProps,
				total_pages,
				hasRealData: total_pages > 1 && total_results > 0,
			});
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
						console.log(
							`Initial page ${initialCurrentPage} exceeds total pages ${total_pages}, using page ${total_pages}`
						);
						validPage = total_pages;
					} else if (initialCurrentPage < 1) {
						console.log(
							`Initial page ${initialCurrentPage} is invalid, using page 1`
						);
						validPage = 1;
					}
				} else if (!hasRealData) {
					// We don't have real data yet, allow any reasonable page number
					// TMDB typically supports thousands of pages
					console.log(
						`No real data yet (total_pages: ${total_pages}, total_results: ${total_results}), allowing initial page ${initialCurrentPage}`
					);
				}

				console.log("MovieGrid: Updating currentPage from prop", {
					from: currentPage,
					to: validPage,
				});
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
				console.log("MovieGrid: handlePageChange called with page", page, {
					currentPage,
					isProcessingReset,
					lastNavigatedUrl: lastNavigatedUrlRef.current,
				});

				// Ensure we don't have any lingering reset parameters
				const currentParams = new URLSearchParams(window.location.search);
				if (currentParams.has("reset")) {
					console.log(
						"MovieGrid: Removing lingering reset parameter from pagination"
					);
					currentParams.delete("reset");
				}

				// Validate page number (will be validated on next render when total_pages is available)
				const validPage = Math.max(1, page);
				console.log("MovieGrid: Setting current page to", validPage);
				setCurrentPageState(validPage);

				// Add immediate logging to verify state change
				setTimeout(() => {
					console.log("MovieGrid: State should now be updated to", validPage);
				}, 0);
			},
			[currentPage, isProcessingReset]
		);

		// Safety mechanism: Force reset navigation flag if it gets stuck
		useEffect(() => {
			const resetTimer = setTimeout(() => {
				if (isNavigatingRef.current) {
					console.log("MovieGrid: Force resetting stuck navigation flag");
					isNavigatingRef.current = false;
				}
			}, 2000); // Reset after 2 seconds if stuck

			return () => clearTimeout(resetTimer);
		}, [currentPage]); // Run whenever currentPage changes

		// Update URL when currentPage changes
		useEffect(() => {
			console.log("MovieGrid: URL update useEffect TRIGGERED", {
				currentPage,
				isNavigating: isNavigatingRef.current,
				lastNavigatedUrl: lastNavigatedUrlRef.current,
				initialSetupDone: initialSetupDoneRef.current,
				isProcessingReset,
			});

			// Skip if initial setup is not complete yet
			if (!initialSetupDoneRef.current) {
				console.log(
					"MovieGrid: Skipping URL update - initial setup not complete"
				);
				return;
			}

			// Skip if we're currently processing a reset
			if (isProcessingReset) {
				console.log("MovieGrid: Skipping URL update - processing reset", {
					currentPage,
				});
				return;
			}

			// Skip if we're already navigating to prevent infinite loops
			if (isNavigatingRef.current) {
				console.log("MovieGrid: Skipping URL update - already navigating");
				return;
			}

			console.log("MovieGrid: URL update useEffect", {
				currentPage,
			});

			const newUrl = constructUrl(
				currentPage,
				location.pathname,
				location.search
			);

			console.log("MovieGrid: Constructed URL", newUrl, {
				currentPage,
				pathname: location.pathname,
				search: location.search,
				lastNavigatedUrl: lastNavigatedUrlRef.current,
			});

			// Only navigate if the URL actually changed from what we last navigated to
			if (lastNavigatedUrlRef.current !== newUrl) {
				console.log("MovieGrid: Navigating to", newUrl);
				isNavigatingRef.current = true;
				lastNavigatedUrlRef.current = newUrl;
				// Use push navigation for pagination to create proper history entries
				navigate(newUrl);
				// Reset the flag after navigation completes
				setTimeout(() => {
					console.log("MovieGrid: Resetting isNavigating flag");
					isNavigatingRef.current = false;
				}, 100); // Increased timeout to ensure navigation completes
			} else {
				console.log(
					"MovieGrid: URL already matches last navigated URL, skipping navigation"
				);
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
			console.log("MovieGrid: Location changed, resetting navigation flags");
			isNavigatingRef.current = false;

			if (typeof window !== "undefined") {
				const params = new URLSearchParams(location.search);
				const pageParam = params.get("page");
				const resetParam = params.get("reset");
				const urlPage = pageParam ? parseInt(pageParam, 10) : 1;
				const validPage = isNaN(urlPage) ? 1 : Math.max(1, urlPage);

				console.log("MovieGrid: Location changed", {
					pathname: location.pathname,
					search: location.search,
					urlPage,
					hasResetParam: !!resetParam,
				});

				// Handle sidebar reset navigation
				if (resetParam) {
					console.log("MovieGrid: Detected reset parameter, forcing page 1");
					setIsProcessingReset(true);

					// Remove BOTH reset and page parameters to get a completely clean URL
					params.delete("reset");
					params.delete("page"); // Also remove any existing page parameter
					const cleanSearch = params.toString();
					const cleanUrl = `${location.pathname}${
						cleanSearch ? `?${cleanSearch}` : ""
					}`;

					console.log("MovieGrid: Reset processing details", {
						resetParam,
						cleanSearch,
						cleanUrl,
						currentPageBeforeReset: currentPage,
						currentUrl:
							typeof window !== "undefined" ? window.location.href : "unknown",
					});

					// Update state to page 1 FIRST
					setCurrentPageState(1);

					// Clean up the URL using React Router's navigate with replace
					console.log("MovieGrid: Cleaning up reset URL to:", cleanUrl);
					try {
						navigate(cleanUrl, { replace: true });
					} catch (error) {
						console.error(
							"MovieGrid: Error cleaning up URL with navigate:",
							error
						);
						// Fallback to history API
						window.history.replaceState({}, "", cleanUrl);
					}

					// Double-check cleanup after a short delay
					setTimeout(() => {
						try {
							const currentSearch = window.location.search;
							const currentParams = new URLSearchParams(currentSearch);
							if (currentParams.has("reset")) {
								console.log(
									"MovieGrid: Reset parameter still present, forcing cleanup"
								);
								currentParams.delete("reset");
								currentParams.delete("page");
								const finalCleanUrl = `${window.location.pathname}${
									currentParams.toString() ? `?${currentParams.toString()}` : ""
								}`;
								navigate(finalCleanUrl, { replace: true });
								console.log("MovieGrid: Forced cleanup to:", finalCleanUrl);
							}
						} catch (error) {
							console.error("MovieGrid: Error in double-check cleanup:", error);
						}
					}, 50);

					// Verify the URL was actually cleaned
					setTimeout(() => {
						console.log("MovieGrid: URL after cleanup:", window.location.href);
					}, 0);

					// Update the last navigated URL to the clean URL to prevent URL update effect
					lastNavigatedUrlRef.current = cleanUrl;

					// Reset the processing flag after a longer delay to ensure everything is settled
					setTimeout(() => {
						setIsProcessingReset(false);
						console.log("MovieGrid: Reset parameter cleanup complete", {
							finalUrl: window.location.href,
							isProcessingReset: false,
							lastNavigatedUrl: lastNavigatedUrlRef.current,
						});

						// Force a re-evaluation of the URL update effect by triggering a state change
						setTimeout(() => {
							console.log(
								"MovieGrid: Reset complete, URL update effect should now work"
							);
							// The URL update effect will run when currentPage changes or when dependencies change
						}, 50);
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
				console.log("MovieGrid: Updating page from URL change", validPage);
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
			console.log("MovieGrid: Total pages validation", {
				total_pages,
				total_results,
				currentPage,
				hasRealData,
				pageSetFromProps,
			});

			if (
				total_pages !== undefined &&
				total_pages !== null &&
				!isNaN(total_pages) &&
				hasRealData && // Only validate when we have real data from TMDB
				!pageSetFromProps // Don't validate if page was set from props
			) {
				if (total_pages === 0) {
					// No pages available, redirect to page 1
					console.log(`No pages available, redirecting to page 1`);
					setCurrentPageState(1);
				} else if (currentPage > total_pages) {
					// Only redirect if we're way beyond the reported total_pages
					// Allow some buffer for TMDB API inconsistencies
					const buffer = 50; // Allow 50 pages beyond reported total_pages
					if (currentPage > total_pages + buffer) {
						console.log(
							`Current page ${currentPage} significantly exceeds total pages ${total_pages} + buffer ${buffer}, redirecting to page ${total_pages}`
						);
						setCurrentPageState(total_pages);
					} else {
						console.log(
							`Current page ${currentPage} exceeds total pages ${total_pages} but within buffer, allowing navigation`
						);
					}
				}
			} else if (!hasRealData) {
				console.log(
					"MovieGrid: Skipping total_pages validation - no real data yet"
				);
			}
		}, [total_pages, currentPage, pageSetFromProps, total_results]);

		// Handle case where API returns different page than requested (e.g., TMDB pagination limits)
		useEffect(() => {
			if (page !== undefined && page !== null && !isNaN(page) && !isLoading) {
				console.log(
					`🔍 API RESPONSE ANALYSIS: page=${page}, currentPage=${currentPage}, isLoading=${isLoading}, pageSetFromProps=${pageSetFromProps}`
				);

				// Check if TMDB returned a different page than requested
				if (page !== currentPage) {
					console.log(
						`⚠️ PAGE MISMATCH: Requested page ${currentPage}, API returned page ${page}`
					);

					// Only redirect pages that are truly beyond TMDB's documented limits
					// TMDB docs say max 500 pages, so only redirect if requesting > 500
					if (page === 1 && currentPage > 500) {
						console.log(
							`🚨 REDIRECT: TMDB returned page 1 for requested page ${currentPage} - beyond documented limit of 500`
						);
						// Redirect to TMDB's documented maximum
						const maxPage = 500;
						console.log(
							`Redirecting from page ${currentPage} to TMDB max page ${maxPage}`
						);
						setCurrentPageState(maxPage);
					}
					// For other page mismatches within TMDB's documented limits (1-500), update to match API response
					// This handles cases where TMDB returns a different page (e.g., last available page)
					else if (currentPage <= 500) {
						console.log(
							`✅ UPDATING: Requested page ${currentPage} (API returned page ${page}) - updating to match API response`
						);
						setCurrentPageState(page);
					} else {
						console.log(
							`⚠️ HIGH PAGE: Requested page ${currentPage} > 500, API returned page ${page} - may be at TMDB limit`
						);
					}
				} else {
					console.log(
						`✅ PAGE MATCH: Requested page ${currentPage}, API returned page ${page} - perfect match`
					);
				}
			} else {
				console.log(
					`⏭️ SKIPPING ANALYSIS: page=${page}, currentPage=${currentPage}, isLoading=${isLoading}, pageSetFromProps=${pageSetFromProps}`
				);
			}
		}, [page, currentPage, isLoading, pageSetFromProps]);

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
							: movies.map((movie) => (
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
