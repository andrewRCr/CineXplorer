/**
 * Tests for routeConfigHelper - Pagination Metadata Support
 *
 * This test suite verifies that route config fetchers correctly accept and pass
 * through tmdb_page_start parameter for smart buffer pagination.
 *
 * Test coverage:
 * - Fetchers accept tmdb_page_start as optional third parameter
 * - Parameter is included in API request params when provided
 * - Parameter is omitted when undefined (backward compatibility)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getFetcherAndSource } from '../routeConfigHelper';
import * as movieService from '@/services/movieService';

/**
 * Helper to create mock service with getPaginated method
 */
function createMockService() {
	return {
		getPaginated: vi.fn(() => ({
			request: Promise.resolve({
				data: {
					page: 1,
					total_pages: 10,
					total_results: 200,
					results: [],
				},
			}),
			cancel: vi.fn(),
		})),
	};
}

describe('routeConfigHelper - pagination metadata support', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	/**
	 * Test: Discover endpoint fetchers accept tmdb_page_start parameter
	 *
	 * Scenario: Popular, top-rated routes using discover endpoint
	 * Expected: Fetcher signature accepts optional third parameter
	 */
	describe('discover endpoint fetchers', () => {
		it('should accept tmdb_page_start parameter for popular route', () => {
			// Arrange
			const mockService = createMockService();
			vi.spyOn(movieService, 'fetchDiscoverMoviesService', 'get').mockReturnValue(
				mockService as unknown as typeof movieService.fetchDiscoverMoviesService
			);

			const config = getFetcherAndSource('/movies/popular');

			// Act: Call fetcher with tmdb_page_start
			config.fetcher(2, { with_genres: '28' }, 5);

			// Assert: Service receives parameter
			expect(mockService.getPaginated).toHaveBeenCalledWith(
				expect.objectContaining({
					page: 2,
					sort_by: 'popularity.desc',
					with_genres: '28',
					tmdb_page_start: 5,
				})
			);
		});

		it('should accept tmdb_page_start parameter for top-rated route', () => {
			// Arrange
			const mockService = createMockService();
			vi.spyOn(movieService, 'fetchTopRatedMoviesService', 'get').mockReturnValue(
				mockService as unknown as typeof movieService.fetchTopRatedMoviesService
			);

			const config = getFetcherAndSource('/movies/top-rated');

			// Act: Call fetcher with metadata
			config.fetcher(3, {}, 7);

			// Assert: Service receives parameter
			expect(mockService.getPaginated).toHaveBeenCalledWith(
				expect.objectContaining({
					page: 3,
					sort_by: 'vote_average.desc',
					tmdb_page_start: 7,
				})
			);
		});

		it('should omit tmdb_page_start when undefined', () => {
			// Arrange
			const mockService = createMockService();
			vi.spyOn(movieService, 'fetchDiscoverMoviesService', 'get').mockReturnValue(
				mockService as unknown as typeof movieService.fetchDiscoverMoviesService
			);

			const config = getFetcherAndSource('/movies/popular');

			// Act: Call fetcher without tmdb_page_start
			config.fetcher(1, {});

			// Assert: Parameter not in request
			expect(mockService.getPaginated).toHaveBeenCalledWith(
				expect.not.objectContaining({
					tmdb_page_start: expect.anything(),
				})
			);
		});
	});

	/**
	 * Test: Now Playing and Upcoming endpoints accept tmdb_page_start
	 *
	 * Scenario: Curated list endpoints
	 * Expected: Parameter passes through to service
	 */
	describe('curated list endpoints', () => {
		it('should accept tmdb_page_start parameter for now-playing route', () => {
			// Arrange
			const mockService = createMockService();
			vi.spyOn(movieService, 'fetchNowPlayingMoviesService', 'get').mockReturnValue(
				mockService as unknown as typeof movieService.fetchNowPlayingMoviesService
			);

			const config = getFetcherAndSource('/movies/now-playing');

			// Act
			config.fetcher(2, { vote_average_gte: 7.0 }, 4);

			// Assert
			expect(mockService.getPaginated).toHaveBeenCalledWith(
				expect.objectContaining({
					page: 2,
					vote_average_gte: 7.0,
					tmdb_page_start: 4,
				})
			);
		});

		it('should accept tmdb_page_start parameter for upcoming route', () => {
			// Arrange
			const mockUpcomingService = createMockService();
			vi.spyOn(movieService, 'fetchUpcomingMovies').mockReturnValue(
				mockUpcomingService as unknown as ReturnType<typeof movieService.fetchUpcomingMovies>
			);

			const config = getFetcherAndSource('/movies/upcoming');

			// Act
			config.fetcher(1, {}, 3);

			// Assert
			expect(mockUpcomingService.getPaginated).toHaveBeenCalledWith(
				expect.objectContaining({
					page: 1,
					tmdb_page_start: 3,
				})
			);
		});
	});

	/**
	 * Test: Search endpoint accepts tmdb_page_start
	 *
	 * Scenario: User has active search query
	 * Expected: Parameter included in search params
	 */
	describe('search endpoint', () => {
		it('should accept tmdb_page_start parameter for search route', () => {
			// Arrange
			const mockService = createMockService();
			vi.spyOn(movieService, 'fetchSearchMoviesService', 'get').mockReturnValue(
				mockService as unknown as typeof movieService.fetchSearchMoviesService
			);

			// Mock window.location.search for query param
			Object.defineProperty(window, 'location', {
				value: {
					search: '?query=avatar',
				},
				writable: true,
			});

			const config = getFetcherAndSource('/movies/search');

			// Act
			config.fetcher(2, { with_genres: '28' }, 6);

			// Assert
			expect(mockService.getPaginated).toHaveBeenCalledWith(
				expect.objectContaining({
					page: 2,
					query: 'avatar',
					with_genres: '28',
					tmdb_page_start: 6,
				})
			);
		});
	});

	/**
	 * Test: Default route (fallback) accepts tmdb_page_start
	 *
	 * Scenario: Unknown route falls back to discover
	 * Expected: Parameter passes through
	 */
	describe('default route (fallback)', () => {
		it('should accept tmdb_page_start parameter for default route', () => {
			// Arrange
			const mockService = createMockService();
			vi.spyOn(movieService, 'fetchDiscoverMoviesService', 'get').mockReturnValue(
				mockService as unknown as typeof movieService.fetchDiscoverMoviesService
			);

			const config = getFetcherAndSource('/movies/unknown');

			// Act
			config.fetcher(1, {}, 2);

			// Assert
			expect(mockService.getPaginated).toHaveBeenCalledWith(
				expect.objectContaining({
					page: 1,
					tmdb_page_start: 2,
				})
			);
		});
	});

	/**
	 * Test: Backward compatibility - works without parameter
	 *
	 * Scenario: Existing code doesn't pass tmdb_page_start
	 * Expected: Functions normally, parameter not in request
	 */
	describe('backward compatibility', () => {
		it('should work without tmdb_page_start parameter', () => {
			// Arrange
			const mockService = createMockService();
			vi.spyOn(movieService, 'fetchDiscoverMoviesService', 'get').mockReturnValue(
				mockService as unknown as typeof movieService.fetchDiscoverMoviesService
			);

			const config = getFetcherAndSource('/movies/popular');

			// Act: Call with old signature (page, filters)
			config.fetcher(1, { vote_average_gte: 8.0 });

			// Assert: Works normally, no tmdb_page_start in params
			expect(mockService.getPaginated).toHaveBeenCalledWith(
				expect.objectContaining({
					page: 1,
					sort_by: 'popularity.desc',
					vote_average_gte: 8.0,
				})
			);
			expect(mockService.getPaginated).toHaveBeenCalledWith(
				expect.not.objectContaining({
					tmdb_page_start: expect.anything(),
				})
			);
		});
	});
});
