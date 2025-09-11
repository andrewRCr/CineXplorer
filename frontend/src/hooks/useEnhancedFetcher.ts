import { useCallback } from "react";
import type { PaginatedMoviesResponse, Movie } from "@/services/movieService";
import type { MovieFilters as MovieFiltersType } from "@/components/movie/filters/AdvancedMovieFilters";
import type { MinimalMovieFilters } from "@/components/movie/filters/LetterboxdStyleFilters";
import {
	mapFiltersToApiParams,
	filterMoviesByYear,
	calculatePaginationMetadata,
} from "@/utilities/movieFilterUtils";

interface UseEnhancedFetcherOptions {
	fetcher: (
		page: number,
		filters?: Record<string, string | number | number[]>
	) => {
		request: Promise<{ data: PaginatedMoviesResponse }>;
		cancel: () => void;
	};
	filters: MovieFiltersType;
	minimalFilters: MinimalMovieFilters;
	filterStyle: "expanded" | "minimal";
}

/**
 * Custom hook that provides an enhanced fetcher with client-side filtering and pagination
 */
export function useEnhancedFetcher({
	fetcher,
	filters,
	minimalFilters,
	filterStyle,
}: UseEnhancedFetcherOptions) {
	const enhancedFetcher = useCallback(
		(page: number) => {
			console.log("useEnhancedFetcher: Called with page", page);
			const { filterParams, yearFilterCriteria } = mapFiltersToApiParams(
				filters,
				minimalFilters,
				filterStyle
			);

			// Create enhanced filter params with larger page size for buffer
			const enhancedFilterParams = {
				...filterParams,
				// Request more results than needed to create a filling buffer
				// TMDB default is 20, we'll request 30 for a 10-movie buffer
			};

			const originalFetcher = fetcher(page, enhancedFilterParams);

			// Wrap the fetcher to add client-side year filtering and dynamic filling
			const wrappedRequest = originalFetcher.request.then(async (response) => {
				let finalResults: Movie[] = [];

				// Get all results from the API response
				const allResults = response.data.results || [];

				// Apply client-side year filtering
				const filteredResults = filterMoviesByYear(
					allResults,
					yearFilterCriteria
				);

				// Simple filling logic - only use current page buffer, but respect year filtering
				const targetPageSize = 20;
				const minNaturalResults = 10; // Minimum natural results before filling

				// If we have year filtering active, prioritize accuracy over filling
				const hasYearFilter =
					yearFilterCriteria &&
					(yearFilterCriteria.type !== "range" ||
						yearFilterCriteria.value !== "past-present");

				if (filteredResults.length >= targetPageSize) {
					// We have enough natural results, no filling needed
					finalResults = filteredResults.slice(0, targetPageSize);
				} else if (filteredResults.length >= minNaturalResults) {
					// We have some natural results but need to fill to reach target
					finalResults = [...filteredResults];
					const remainingSlots = targetPageSize - filteredResults.length;

					// Fill only from current page buffer (movies that didn't match other filters)
					const currentPageBuffer = allResults.filter(
						(movie) =>
							!filteredResults.some((fr) => fr.tmdb_id === movie.tmdb_id)
					);

					// Use buffer movies to fill remaining slots
					const fillersToUse = currentPageBuffer.slice(0, remainingSlots);
					finalResults = [...finalResults, ...fillersToUse];
				} else {
					// We don't have enough natural results - show what we have
					finalResults = filteredResults;
				}

				// Calculate pagination metadata
				const originalTotalResults = response.data.total_results;
				const currentPageResultCount = finalResults.length;

				// Handle edge cases where TMDB returns no data or invalid totals
				if (
					currentPageResultCount === 0 &&
					(!originalTotalResults || isNaN(originalTotalResults))
				) {
					// TMDB returned no results and no valid total - this page doesn't exist
					console.log(`Page ${page} doesn't exist - TMDB returned no results`);

					response.data = {
						...response.data,
						results: [],
						total_results: 0,
						total_pages: 0,
						page: page,
					};
					return response;
				}

				const { estimatedFilteredTotal, totalPages } =
					calculatePaginationMetadata(
						originalTotalResults,
						currentPageResultCount,
						page,
						Boolean(hasYearFilter)
					);

				// For unfiltered results, respect TMDB's actual total_pages limit
				// TMDB has pagination limits (typically 500 or 1000 pages)
				let actualTotalPages = hasYearFilter
					? totalPages // Use our calculation for filtered results
					: Math.min(totalPages, response.data.total_pages || totalPages); // Respect TMDB's limit for unfiltered

				// Apply capping for unfiltered results when TMDB reports unreasonably high total_pages
				if (!hasYearFilter && response.data.total_pages > 2000) {
					// TMDB is reporting very high total_pages, which suggests they have pagination limits
					// Use a reasonable cap based on the current page we're successfully accessing
					let reasonableCap;
					if (page <= 500) {
						// If we're successfully on page 500 or less, TMDB likely supports up to ~1000 pages
						reasonableCap = 1000;
					} else {
						// If we're on a higher page, use a cap that's higher than current page
						reasonableCap = Math.max(page + 200, 1000);
					}
					actualTotalPages = Math.min(actualTotalPages, reasonableCap);
					console.log(
						`TMDB reported high total_pages (${response.data.total_pages}) - capping at ${actualTotalPages} based on current page ${page}`
					);
				}

				// If TMDB returned a different page than requested, it means we requested a page beyond their limit
				// In this case, use TMDB's actual total_pages and the page they returned
				if (response.data.page !== page) {
					console.log(
						`TMDB returned page ${response.data.page} instead of requested page ${page} - using TMDB's limits`
					);
					console.log(`TMDB response details:`, {
						returnedPage: response.data.page,
						totalPages: response.data.total_pages,
						totalResults: response.data.total_results,
						requestedPage: page,
					});

					// If TMDB returned page 1 but we requested a high page number, they're likely enforcing pagination limits
					// TMDB typically limits to around 500-1000 pages
					let tmdbLimit = response.data.total_pages;
					if (response.data.page === 1 && page > 100) {
						// TMDB returned page 1 for a high page request - use a reasonable limit
						tmdbLimit = Math.min(response.data.total_pages || 500, 500);
						console.log(
							`Detected TMDB pagination limit - using ${tmdbLimit} pages instead of ${response.data.total_pages}`
						);
					} else if (page > 100) {
						// TMDB returned a different page for a high page request - still use a reasonable limit
						tmdbLimit = Math.min(response.data.total_pages || 500, 500);
						console.log(
							`High page request (${page}) returned different page - using ${tmdbLimit} pages instead of ${response.data.total_pages}`
						);
					}

					actualTotalPages = tmdbLimit;
				} else {
					console.log(
						`✅ TMDB returned requested page: requested ${page}, got ${response.data.page}`
					);
				}

				response.data = {
					...response.data,
					results: finalResults,
					total_results: estimatedFilteredTotal, // Show full estimated total in results text
					total_pages: actualTotalPages,
					page: response.data.page, // Use TMDB's actual returned page
				};

				return response;
			});

			return {
				request: wrappedRequest,
				cancel: originalFetcher.cancel,
			};
		},
		[fetcher, filters, minimalFilters, filterStyle]
	);

	return enhancedFetcher;
}
