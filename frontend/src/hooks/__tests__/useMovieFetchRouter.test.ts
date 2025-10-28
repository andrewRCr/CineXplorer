/**
 * Tests for useMovieFetchRouter hook
 *
 * This hook routes movie fetch requests to the appropriate endpoint based on filter state,
 * including smart buffer pagination metadata tracking.
 *
 * Test coverage:
 * - Accepts tmdb_page_start parameter in routed fetcher
 * - Passes tmdb_page_start to base fetcher (discover/top-rated/etc)
 * - Passes tmdb_page_start to search endpoint
 * - Backward compatibility when parameter omitted
 */

import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useMovieFetchRouter } from '../useMovieFetchRouter';
import type { PaginatedMoviesResponse } from '@/types/movie';
import type { MovieFilters } from '@/components/movie/filters/AdvancedMovieFilters';
import * as movieService from '@/services/movieService';

/**
 * Helper to create mock paginated response
 * (Reusing pattern from usePaginatedMovies.test.ts)
 */
function createMockPaginatedResponse(
	overrides?: Partial<PaginatedMoviesResponse>
): PaginatedMoviesResponse {
	return {
		page: 1,
		total_pages: 10,
		total_results: 200,
		results: [
			{
				tmdb_id: 123,
				title: 'Test Movie 1',
				poster_path: '/test1.jpg',
				release_date: '2024-01-01',
				vote_average: 8.5,
				user_movie_data: null,
			},
		],
		...overrides,
	};
}

/**
 * Helper to create mock base fetcher function
 * Tracks calls for verification
 */
function createMockBaseFetcher() {
	const mockFn = vi.fn(
		(_page: number, _filters?: Record<string, string | number | number[]>, _tmdb_page_start?: number) => ({
			request: Promise.resolve({ data: createMockPaginatedResponse() }),
			cancel: vi.fn(),
		})
	);
	return mockFn;
}

/**
 * Helper to create empty MovieFilters object for tests
 */
function createEmptyFilters(): MovieFilters {
	return {
		query: '',
		genres: [],
		minYear: '',
		maxYear: '',
		minRating: '',
		maxRating: '',
		minRuntime: '',
		maxRuntime: '',
		sortBy: 'popularity.desc',
	};
}

describe('useMovieFetchRouter - pagination metadata passing', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	/**
	 * Test: Routed fetcher accepts tmdb_page_start parameter
	 *
	 * Scenario: Parent component calls routed fetcher with tmdb_page_start
	 * Expected: Parameter is accepted without errors
	 */
	describe('parameter acceptance', () => {
		it('should accept tmdb_page_start as optional third parameter', () => {
			// Arrange
			const mockBaseFetcher = createMockBaseFetcher();
			const mockFilters = createEmptyFilters();

			const { result } = renderHook(() =>
				useMovieFetchRouter({
					fetcher: mockBaseFetcher,
					filters: mockFilters,
					filterStyle: 'expanded',
				})
			);

			// Act: Call routed fetcher with tmdb_page_start
			result.current(1, 5);

			// Assert: Should not throw, function accepts parameter
			// Note: createEmptyFilters includes sortBy which gets passed through
			expect(mockBaseFetcher).toHaveBeenCalledWith(1, { sort_by: 'popularity.desc' }, 5);
		});

		it('should work without tmdb_page_start for backward compatibility', () => {
			// Arrange
			const mockBaseFetcher = createMockBaseFetcher();
			const mockFilters = createEmptyFilters();

			const { result } = renderHook(() =>
				useMovieFetchRouter({
					fetcher: mockBaseFetcher,
					filters: mockFilters,
					filterStyle: 'expanded',
				})
			);

			// Act: Call routed fetcher without tmdb_page_start
			result.current(1);

			// Assert: Should work with undefined parameter
			// Note: createEmptyFilters includes sortBy which gets passed through
			expect(mockBaseFetcher).toHaveBeenCalledWith(1, { sort_by: 'popularity.desc' }, undefined);
		});
	});

	/**
	 * Test: tmdb_page_start passes through to base fetcher
	 *
	 * Scenario: Using discover/top-rated/etc endpoints (no search query)
	 * Expected: Parameter flows through to base fetcher
	 */
	describe('base fetcher - tmdb_page_start passing', () => {
		it('should pass tmdb_page_start to base fetcher when provided', () => {
			// Arrange
			const mockBaseFetcher = createMockBaseFetcher();
			const mockFilters: MovieFilters = {
				...createEmptyFilters(),
				genres: [28],
				minRating: '7.0',
				maxRating: '10.0',
			};

			const { result } = renderHook(() =>
				useMovieFetchRouter({
					fetcher: mockBaseFetcher,
					filters: mockFilters,
					filterStyle: 'expanded',
				})
			);

			// Act: Navigate to page 2 with metadata
			result.current(2, 5);

			// Assert: Base fetcher receives all parameters
			expect(mockBaseFetcher).toHaveBeenCalledWith(
				2,
				expect.objectContaining({
					genres: '28',
					vote_average_gte: '7.0',
					vote_average_lte: '10.0',
				}),
				5
			);
		});

		it('should pass undefined tmdb_page_start when omitted', () => {
			// Arrange
			const mockBaseFetcher = createMockBaseFetcher();
			const mockFilters = createEmptyFilters();

			const { result } = renderHook(() =>
				useMovieFetchRouter({
					fetcher: mockBaseFetcher,
					filters: mockFilters,
					filterStyle: 'expanded',
				})
			);

			// Act: First page request without metadata
			result.current(1);

			// Assert: Parameter is undefined (backward compatible)
			// Note: createEmptyFilters includes sortBy which gets passed through
			expect(mockBaseFetcher).toHaveBeenCalledWith(1, { sort_by: 'popularity.desc' }, undefined);
		});
	});

	/**
	 * Test: tmdb_page_start passes through to search endpoint
	 *
	 * Scenario: User has active search query
	 * Expected: Parameter included in search endpoint params
	 */
	describe('search endpoint - tmdb_page_start passing', () => {
		it('should include tmdb_page_start in search params when provided', () => {
			// Arrange: Mock search service
			const mockSearchService = {
				getPaginated: vi.fn(() => ({
					request: Promise.resolve({ data: createMockPaginatedResponse() }),
					cancel: vi.fn(),
				})),
			};

			vi.spyOn(movieService, 'fetchSearchMoviesService', 'get').mockReturnValue(
				mockSearchService as unknown as typeof movieService.fetchSearchMoviesService
			);

			const mockBaseFetcher = createMockBaseFetcher();
			const mockFilters: MovieFilters = {
				...createEmptyFilters(),
				query: 'avatar',
				genres: [28],
			};

			const { result } = renderHook(() =>
				useMovieFetchRouter({
					fetcher: mockBaseFetcher,
					filters: mockFilters,
					filterStyle: 'expanded',
				})
			);

			// Act: Search with pagination metadata
			result.current(2, 7);

			// Assert: Search service receives tmdb_page_start
			expect(mockSearchService.getPaginated).toHaveBeenCalledWith(
				expect.objectContaining({
					page: 2,
					query: 'avatar',
					genres: '28',
					tmdb_page_start: 7,
				})
			);
		});

		it('should omit tmdb_page_start from search params when undefined', () => {
			// Arrange: Mock search service
			const mockSearchService = {
				getPaginated: vi.fn(() => ({
					request: Promise.resolve({ data: createMockPaginatedResponse() }),
					cancel: vi.fn(),
				})),
			};

			vi.spyOn(movieService, 'fetchSearchMoviesService', 'get').mockReturnValue(
				mockSearchService as unknown as typeof movieService.fetchSearchMoviesService
			);

			const mockBaseFetcher = createMockBaseFetcher();
			const mockFilters: MovieFilters = {
				...createEmptyFilters(),
				query: 'avatar',
			};

			const { result } = renderHook(() =>
				useMovieFetchRouter({
					fetcher: mockBaseFetcher,
					filters: mockFilters,
					filterStyle: 'expanded',
				})
			);

			// Act: First search request without metadata
			result.current(1);

			// Assert: tmdb_page_start not in params object
			expect(mockSearchService.getPaginated).toHaveBeenCalledWith(
				expect.not.objectContaining({
					tmdb_page_start: expect.anything(),
				})
			);
		});
	});

	/**
	 * Test: Backward compatibility - existing behavior preserved
	 *
	 * Scenario: Code using old signature (page only)
	 * Expected: Functions normally without errors
	 */
	describe('backward compatibility', () => {
		it('should maintain existing behavior when tmdb_page_start not used', () => {
			// Arrange
			const mockBaseFetcher = createMockBaseFetcher();
			const mockFilters: MovieFilters = {
				...createEmptyFilters(),
				genres: [28, 12],
			};

			const { result } = renderHook(() =>
				useMovieFetchRouter({
					fetcher: mockBaseFetcher,
					filters: mockFilters,
					filterStyle: 'expanded',
				})
			);

			// Act: Use old calling pattern (page only)
			result.current(3);

			// Assert: Works as before, just with undefined third param
			expect(mockBaseFetcher).toHaveBeenCalledWith(
				3,
				expect.objectContaining({
					genres: '28,12',
				}),
				undefined
			);
		});
	});
});
