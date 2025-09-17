import { useCallback, useRef } from "react";
import type { Movie } from "@shared/index";
import type { PaginatedMoviesResponse } from "@/services/movieService";
import type { MovieFilters as MovieFiltersType } from "@/components/movie/filters/AdvancedMovieFilters";
import {
	mapFiltersToApiParams,
	filterMoviesByYear,
	filterMoviesByRating,
	filterMoviesByRuntime,
	calculatePaginationMetadata,
} from "@/utilities/movieFilterUtils";
import { fetchSearchMoviesService } from "@/services/movieService";

interface UseEnhancedFetcherOptions {
	fetcher: (
		page: number,
		filters?: Record<string, string | number | number[]>
	) => {
		request: Promise<{ data: PaginatedMoviesResponse }>;
		cancel: () => void;
	};
	filters: MovieFiltersType;
	filterStyle: "expanded" | "minimal";
}

/**
 * Custom hook that provides an enhanced fetcher with client-side filtering and pagination
 */
export function useEnhancedFetcher({
	fetcher,
	filters,
	filterStyle,
}: UseEnhancedFetcherOptions): (page: number) => {
	request: Promise<{ data: PaginatedMoviesResponse }>;
	cancel: () => void;
} {
	// Use refs to store the latest filter values without causing re-renders
	const filtersRef = useRef(filters);
	const filterStyleRef = useRef(filterStyle);
	const baseFetcherRef = useRef(fetcher);

	// Update refs when values change
	filtersRef.current = filters;
	filterStyleRef.current = filterStyle;
	baseFetcherRef.current = fetcher;

	const enhancedFetcher = useCallback(
		(page: number) => {
			// Get current values from refs
			const currentFilters = filtersRef.current;
			const currentFilterStyle = filterStyleRef.current;
			const currentBaseFetcher = baseFetcherRef.current;

			// Check if there's a search query - if so, use search endpoint instead of base fetcher
			const hasSearchQuery =
				(currentFilterStyle === "minimal" && currentFilters.query?.trim()) ||
				(currentFilterStyle === "expanded" && currentFilters.query?.trim());

			let searchFetcher;
			let searchFilters;

			if (hasSearchQuery) {
				// Use search service for text queries
				const query = currentFilters.query;
				searchFetcher = (
					page: number,
					additionalFilters?: Record<string, string | number | number[]>
				) => {
					const searchParams = {
						page,
						query,
						...additionalFilters,
					};
					return fetchSearchMoviesService.getPaginated<PaginatedMoviesResponse>(
						searchParams
					);
				};

				// For search, we still want to apply other filters like genre/year after the search
				const { filterParams, yearFilterCriteria, ratingFilterCriteria, runtimeFilterCriteria } = mapFiltersToApiParams(
					currentFilters,
					currentFilterStyle
				);

				// Remove the query from filterParams since it's already handled by search endpoint
				const otherFilters = Object.fromEntries(
					Object.entries(filterParams).filter(([key]) => key !== "query")
				);
				searchFilters = { filterParams: otherFilters, yearFilterCriteria, ratingFilterCriteria, runtimeFilterCriteria };
			} else {
				// Use the original fetcher for non-search requests
				const { filterParams, yearFilterCriteria, ratingFilterCriteria, runtimeFilterCriteria } = mapFiltersToApiParams(
					currentFilters,
					currentFilterStyle
				);

				searchFetcher = currentBaseFetcher;
				searchFilters = { filterParams, yearFilterCriteria, ratingFilterCriteria, runtimeFilterCriteria };
			}

			const { filterParams, yearFilterCriteria, ratingFilterCriteria, runtimeFilterCriteria } = searchFilters;

			// Create enhanced filter params with larger page size for buffer
			const enhancedFilterParams = {
				...filterParams,
				// Request more results than needed to create a filling buffer
				// TMDB default is 20, we'll request 30 for a 10-movie buffer
			};

			const originalFetcher = searchFetcher(page, enhancedFilterParams);

			// Wrap the fetcher to add client-side year filtering and dynamic filling
			const wrappedRequest = originalFetcher.request.then(async (response) => {
				let finalResults: Movie[] = [];

				// Get all results from the API response
				const allResults = response.data.results || [];

				// Apply client-side filtering (year, rating, and runtime)
				let filteredResults = filterMoviesByYear(
					allResults,
					yearFilterCriteria
				);
				
				filteredResults = filterMoviesByRating(
					filteredResults,
					ratingFilterCriteria
				);
				
				filteredResults = filterMoviesByRuntime(
					filteredResults,
					runtimeFilterCriteria
				);

				// Simple filling logic - only use current page buffer, but respect year filtering
				const targetPageSize = 20;
				const minNaturalResults = 10; // Minimum natural results before filling

				// If we have year or rating filtering active, prioritize accuracy over filling
				const hasYearFilter =
					yearFilterCriteria &&
					(yearFilterCriteria.type !== "range" ||
						yearFilterCriteria.value !== "past-present");
					
				const hasRatingFilter = Boolean(ratingFilterCriteria);
				const hasRuntimeFilter = Boolean(runtimeFilterCriteria);
				const hasActiveFilters = hasYearFilter || hasRatingFilter || hasRuntimeFilter;

				if (filteredResults.length >= targetPageSize) {
					// We have enough natural results, no filling needed
					finalResults = filteredResults.slice(0, targetPageSize);
				} else if (filteredResults.length >= minNaturalResults) {
					// We have some natural results but need to fill to reach target
					finalResults = [...filteredResults];
					const remainingSlots = targetPageSize - filteredResults.length;

					// Fill only from current page buffer (movies that didn't match other filters)
					let currentPageBuffer = allResults.filter(
						(movie: Movie) =>
							!filteredResults.some((fr) => fr.tmdb_id === movie.tmdb_id)
					);

					// Apply the same client-side filtering to buffer movies to prevent leakage
					currentPageBuffer = filterMoviesByYear(
						currentPageBuffer,
						yearFilterCriteria
					);
					
					currentPageBuffer = filterMoviesByRating(
						currentPageBuffer,
						ratingFilterCriteria
					);
					
					currentPageBuffer = filterMoviesByRuntime(
						currentPageBuffer,
						runtimeFilterCriteria
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
						Boolean(hasYearFilter),
						Boolean(hasRatingFilter || hasRuntimeFilter)
					);

				// For unfiltered results, respect TMDB's actual total_pages limit
				// TMDB has pagination limits (typically 500 or 1000 pages)
				let actualTotalPages = hasActiveFilters
					? totalPages // Use our calculation for filtered results
					: Math.min(totalPages, response.data.total_pages || totalPages); // Respect TMDB's limit for unfiltered

				// Apply capping for unfiltered results when TMDB reports unreasonably high total_pages
				if (!hasActiveFilters && response.data.total_pages > 2000) {
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
				}

				// If TMDB returned a different page than requested, it means we requested a page beyond their limit
				// In this case, use TMDB's actual total_pages and the page they returned
			if (response.data.page !== page) {

					// If TMDB returned page 1 but we requested a high page number, they're likely enforcing pagination limits
					// TMDB typically limits to around 500-1000 pages
					let tmdbLimit = response.data.total_pages;
				if (response.data.page === 1 && page > 100) {
					// TMDB returned page 1 for a high page request - use a reasonable limit
					tmdbLimit = Math.min(response.data.total_pages || 500, 500);
				} else if (page > 100) {
					// TMDB returned a different page for a high page request - still use a reasonable limit
					tmdbLimit = Math.min(response.data.total_pages || 500, 500);
				}

					actualTotalPages = tmdbLimit;
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
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[filters, filterStyle] // Recreate fetcher when filters change
	);

	return enhancedFetcher;
}
