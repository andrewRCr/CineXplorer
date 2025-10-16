/**
 * Tests for useMovieActions hook
 *
 * This hook manages movie interactions (watchlist, watched, liked, rating, review)
 * and encapsulates CREATE vs UPDATE logic based on existing user_movie_data.
 *
 * Architecture: Three-layer pattern (service → hook → component)
 * Migration target: TanStack Query mutations (hook facade pattern)
 */

import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useMovieActions } from '../useMovieActions';
import * as userMovieDataService from '../../services/userMovieDataService';
import type { Movie } from '../../@types/movie.d';
import type { components } from '../../types/api';
import type { AxiosResponse } from 'axios';

type UserMovieDataDetailSchema = components['schemas']['UserMovieDataDetailSchema'];

// Type for API errors with status codes
interface ApiError extends Error {
	status?: number;
}

// Mock the userMovieDataService
vi.mock('../../services/userMovieDataService', () => ({
	createUserMovieData: vi.fn(),
	updateUserMovieData: vi.fn(),
	getUserMovieDataByTmdbId: vi.fn(),
}));

/**
 * Helper to create properly typed Axios response mocks
 * Matches the actual return type from httpService (AxiosResponse)
 */
function createAxiosResponse<T>(data: T): AxiosResponse<T> {
	return {
		data,
		status: 200,
		statusText: 'OK',
		headers: {},
		config: {
			headers: {} as never,
		},
	};
}

/**
 * Helper to create wrapped response for getPaginated pattern
 * Matches the actual return type from httpService.getPaginated()
 */
function createWrappedResponse<T>(data: T): { request: Promise<{ data: T }>; cancel: () => void } {
	return {
		request: Promise.resolve({ data }),
		cancel: () => {},
	};
}

describe('useMovieActions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	/**
	 * Test: toggleWatchlist creates UserMovieData when movie.user_movie_data is null (POST)
	 *
	 * Scenario: User clicks watchlist button on a movie they haven't interacted with before
	 * Expected: POST to /api/user-movie-data with movie_id and user_on_watchlist: true
	 */
	describe('toggleWatchlist - CREATE flow', () => {
		it('should create UserMovieData when movie has no existing user_movie_data', async () => {
			// Arrange: Movie without user data
			const movieWithoutData: Movie = {
				tmdb_id: 123,
				title: 'Test Movie',
				poster_path: '/test.jpg',
				release_date: '2024-01-01',
				vote_average: 8.5,
				user_movie_data: null,
			};

			const mockCreatedData: UserMovieDataDetailSchema = {
				id: 1,
				tmdb_id: 123,
				title: 'Test Movie',
				user_watched: false,
				user_on_watchlist: true,
				user_liked: false,
				user_rating: null,
				user_review: null,
			};

			// Mock the actual return type from httpService.create() - raw Axios response
			vi.mocked(userMovieDataService.createUserMovieData).mockResolvedValue(
				createAxiosResponse(mockCreatedData)
			);

			// Act
			const { result } = renderHook(() => useMovieActions({ movie: movieWithoutData }));

			await act(async () => {
				await result.current.toggleWatchlist();
			});

			// Assert: Should call CREATE endpoint with correct payload
			await waitFor(() => {
				expect(userMovieDataService.createUserMovieData).toHaveBeenCalledWith({
					movie_id: 123, // Backend expects TMDB ID as movie_id
					user_on_watchlist: true,
					user_watched: false,
					user_liked: false,
					user_rating: null,
					user_review: null,
				});
			});

			expect(userMovieDataService.updateUserMovieData).not.toHaveBeenCalled();
		});
	});

	/**
	 * Test: toggleWatchlist updates existing UserMovieData when present (PATCH)
	 *
	 * Scenario: User clicks watchlist button on a movie they've previously interacted with
	 * Expected: PATCH to /api/user-movie-data/{id} with toggled user_on_watchlist value
	 */
	describe('toggleWatchlist - UPDATE flow', () => {
		it('should update UserMovieData when movie has existing user_movie_data', async () => {
			// Arrange: Movie with existing user data (watchlist: false)
			const movieWithData: Movie = {
				tmdb_id: 456,
				title: 'Test Movie 2',
				poster_path: '/test2.jpg',
				release_date: '2024-02-01',
				vote_average: 7.8,
				user_movie_data: {
					id: 2,
					tmdb_id: 456,
					title: 'Test Movie 2',
					user_watched: true,
					user_on_watchlist: false, // Currently NOT on watchlist
					user_liked: true,
					user_rating: 8,
					user_review: 'Great movie!',
				},
			};

			const mockUpdatedData: UserMovieDataDetailSchema = {
				...movieWithData.user_movie_data!,
				user_on_watchlist: true, // Toggled to true
			};

			// Mock the actual return type from httpService.update() - raw Axios response
			vi.mocked(userMovieDataService.updateUserMovieData).mockResolvedValue(
				createAxiosResponse(mockUpdatedData)
			);

			// Act
			const { result } = renderHook(() => useMovieActions({ movie: movieWithData }));

			await act(async () => {
				await result.current.toggleWatchlist();
			});

			// Assert: Should call UPDATE endpoint with toggled value
			await waitFor(() => {
				expect(userMovieDataService.updateUserMovieData).toHaveBeenCalledWith(2, {
					user_on_watchlist: true, // Toggled from false to true
				});
			});

			expect(userMovieDataService.createUserMovieData).not.toHaveBeenCalled();
		});

		it('should toggle watchlist from true to false', async () => {
			// Arrange: Movie already on watchlist
			const movieWithData: Movie = {
				tmdb_id: 789,
				title: 'Test Movie 3',
				poster_path: '/test3.jpg',
				release_date: '2024-03-01',
				vote_average: 9.0,
				user_movie_data: {
					id: 3,
					tmdb_id: 789,
					title: 'Test Movie 3',
					user_watched: false,
					user_on_watchlist: true, // Currently ON watchlist
					user_liked: false,
					user_rating: null,
					user_review: null,
				},
			};

			const mockUpdatedData: UserMovieDataDetailSchema = {
				...movieWithData.user_movie_data!,
				user_on_watchlist: false, // Toggled to false
			};

			// Mock the actual return type from httpService.update() - raw Axios response
			vi.mocked(userMovieDataService.updateUserMovieData).mockResolvedValue(
				createAxiosResponse(mockUpdatedData)
			);

			// Act
			const { result } = renderHook(() => useMovieActions({ movie: movieWithData }));

			await act(async () => {
				await result.current.toggleWatchlist();
			});

			// Assert: Should toggle from true to false
			await waitFor(() => {
				expect(userMovieDataService.updateUserMovieData).toHaveBeenCalledWith(3, {
					user_on_watchlist: false, // Toggled from true to false
				});
			});
		});
	});

	/**
	 * Test: Hook returns isUpdating state during API call
	 *
	 * Scenario: Track loading state while API request is in flight
	 * Expected: isUpdating is true during call, false after completion
	 */
	describe('isUpdating state', () => {
		it('should set isUpdating to true during API call and false after completion', async () => {
			// Arrange
			const movie: Movie = {
				tmdb_id: 111,
				title: 'Test Movie',
				poster_path: '/test.jpg',
				release_date: '2024-01-01',
				vote_average: 8.0,
				user_movie_data: null,
			};

			const mockData: UserMovieDataDetailSchema = {
				id: 1,
				tmdb_id: 111,
				title: 'Test Movie',
				user_watched: false,
				user_on_watchlist: true,
				user_liked: false,
				user_rating: null,
				user_review: null,
			};

			let resolveCreate: (value: AxiosResponse<UserMovieDataDetailSchema>) => void;
			const createPromise = new Promise<AxiosResponse<UserMovieDataDetailSchema>>((resolve) => {
				resolveCreate = resolve;
			});

			vi.mocked(userMovieDataService.createUserMovieData).mockReturnValue(createPromise);

			// Act
			const { result } = renderHook(() => useMovieActions({ movie }));

			// Assert: Initially not updating
			expect(result.current.isUpdating).toBe(false);

			// Start the async operation
			act(() => {
				result.current.toggleWatchlist();
			});

			// Assert: Should be updating during API call
			await waitFor(() => {
				expect(result.current.isUpdating).toBe(true);
			});

			// Complete the async operation
			await act(async () => {
				resolveCreate!(createAxiosResponse(mockData));
				await createPromise;
			});

			// Assert: Should not be updating after completion
			await waitFor(() => {
				expect(result.current.isUpdating).toBe(false);
			});
		});
	});

	/**
	 * Test: Hook returns error state on failure
	 *
	 * Scenario: API call fails (network error, validation error, etc.)
	 * Expected: error state contains error message, isUpdating returns to false
	 */
	describe('error handling', () => {
		it('should set error state when API call fails', async () => {
			// Arrange
			const movie: Movie = {
				tmdb_id: 222,
				title: 'Test Movie',
				poster_path: '/test.jpg',
				release_date: '2024-01-01',
				vote_average: 7.5,
				user_movie_data: null,
			};

			const errorMessage = 'Network error: Failed to create user movie data';
			vi.mocked(userMovieDataService.createUserMovieData).mockRejectedValue(
				new Error(errorMessage)
			);

			// Act
			const { result } = renderHook(() => useMovieActions({ movie }));

			await act(async () => {
				await result.current.toggleWatchlist();
			});

			// Assert: Should have error state
			await waitFor(() => {
				expect(result.current.error).toBe(errorMessage);
				expect(result.current.isUpdating).toBe(false);
			});
		});

		it('should clear previous error on successful retry', async () => {
			// Arrange
			const movie: Movie = {
				tmdb_id: 333,
				title: 'Test Movie',
				poster_path: '/test.jpg',
				release_date: '2024-01-01',
				vote_average: 8.0,
				user_movie_data: null,
			};

			const mockData: UserMovieDataDetailSchema = {
				id: 1,
				tmdb_id: 333,
				title: 'Test Movie',
				user_watched: false,
				user_on_watchlist: true,
				user_liked: false,
				user_rating: null,
				user_review: null,
			};

			// First call fails, second succeeds
			vi.mocked(userMovieDataService.createUserMovieData)
				.mockRejectedValueOnce(new Error('First attempt failed'))
				.mockResolvedValueOnce(createAxiosResponse(mockData));

			const { result } = renderHook(() => useMovieActions({ movie }));

			// Act: First attempt (fails)
			await act(async () => {
				await result.current.toggleWatchlist();
			});

			// Assert: Should have error
			await waitFor(() => {
				expect(result.current.error).toBe('First attempt failed');
			});

			// Act: Second attempt (succeeds)
			await act(async () => {
				await result.current.toggleWatchlist();
			});

			// Assert: Error should be cleared
			await waitFor(() => {
				expect(result.current.error).toBeNull();
			});
		});
	});

	/**
	 * Test: Hook handles 400 "already exists" edge case (race condition fallback)
	 *
	 * Scenario: Two tabs/requests create UserMovieData simultaneously
	 * Backend returns 400 "already exists" on second request
	 * Expected: Fetch current data, retry with UPDATE instead of CREATE
	 */
	describe('race condition handling', () => {
		it('should handle 400 "already exists" error by fetching and updating', async () => {
			// Arrange
			const movie: Movie = {
				tmdb_id: 444,
				title: 'Test Movie',
				poster_path: '/test.jpg',
				release_date: '2024-01-01',
				vote_average: 8.5,
				user_movie_data: null, // Component thinks there's no data
			};

			// Simulate race condition: CREATE fails with 400
			const alreadyExistsError: ApiError = Object.assign(
				new Error('User movie data already exists for this movie'),
				{ status: 400 }
			);

			vi.mocked(userMovieDataService.createUserMovieData).mockRejectedValue(
				alreadyExistsError
			);

			// Mock fetching existing data (returns wrapped response)
			const existingData: UserMovieDataDetailSchema = {
				id: 5,
				tmdb_id: 444,
				title: 'Test Movie',
				user_watched: false,
				user_on_watchlist: false, // Exists but not on watchlist
				user_liked: false,
				user_rating: null,
				user_review: null,
			};

			vi.mocked(userMovieDataService.getUserMovieDataByTmdbId).mockReturnValue(
				createWrappedResponse(existingData)
			);

			// Mock successful update
			const updatedData: UserMovieDataDetailSchema = {
				...existingData,
				user_on_watchlist: true,
			};

			vi.mocked(userMovieDataService.updateUserMovieData).mockResolvedValue(
				createAxiosResponse(updatedData)
			);

			// Act
			const { result } = renderHook(() => useMovieActions({ movie }));

			await act(async () => {
				await result.current.toggleWatchlist();
			});

			// Assert: Should fallback to fetch + update
			await waitFor(() => {
				expect(userMovieDataService.createUserMovieData).toHaveBeenCalledTimes(1);
				expect(userMovieDataService.getUserMovieDataByTmdbId).toHaveBeenCalledWith({
					tmdb_id: 444,
				});
				expect(userMovieDataService.updateUserMovieData).toHaveBeenCalledWith(5, {
					user_on_watchlist: true,
				});
			});

			// Should not have error (handled gracefully)
			expect(result.current.error).toBeNull();
		});

		it('should propagate error if fallback fetch also fails', async () => {
			// Arrange
			const movie: Movie = {
				tmdb_id: 555,
				title: 'Test Movie',
				poster_path: '/test.jpg',
				release_date: '2024-01-01',
				vote_average: 8.0,
				user_movie_data: null,
			};

			// CREATE fails with 400
			const alreadyExistsError: ApiError = Object.assign(
				new Error('User movie data already exists for this movie'),
				{ status: 400 }
			);

			vi.mocked(userMovieDataService.createUserMovieData).mockRejectedValue(
				alreadyExistsError
			);

			// Fetch also fails - return wrapped response with rejected promise
			const fetchError = new Error('Failed to fetch user movie data');
			vi.mocked(userMovieDataService.getUserMovieDataByTmdbId).mockReturnValue({
				request: Promise.reject(fetchError),
				cancel: () => {},
			});

			// Act
			const { result } = renderHook(() => useMovieActions({ movie }));

			await act(async () => {
				await result.current.toggleWatchlist();
			});

			// Assert: Should have error from fallback
			await waitFor(() => {
				expect(result.current.error).toBe('Failed to fetch user movie data');
			});
		});
	});
});
