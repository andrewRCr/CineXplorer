/**
 * Tests for usePaginatedMovies hook
 *
 * This hook extracts and structures paginated movie data from API responses,
 * including smart buffer pagination metadata tracking.
 *
 * Test coverage:
 * - Stores next_tmdb_page_start metadata from API responses
 * - Includes tmdb_page_start parameter in subsequent requests
 * - Resets metadata when filters change
 * - Backward compatibility when metadata absent
 */

import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { usePaginatedMovies } from "../usePaginatedMovies";
import type { MovieListResponse } from "@/types/movie";

/**
 * Helper to create mock fetch function matching the FetchArrayFn type
 * Returns a function that provides { request, cancel } interface
 */
function createMockFetcher(mockResponse: MovieListResponse) {
    return () => ({
        request: Promise.resolve({ data: mockResponse }),
        cancel: vi.fn(),
    });
}

/**
 * Helper to create mock paginated response with metadata
 */
function createMockPaginatedResponse(
    overrides?: Partial<MovieListResponse>,
): MovieListResponse {
    return {
        page: 1,
        total_pages: 10,
        total_results: 200,
        results: [
            {
                tmdb_id: 123,
                title: "Test Movie 1",
                poster_path: "/test1.jpg",
                release_date: "2024-01-01",
                vote_average: 8.5,
                user_movie_data: null,
            },
            {
                tmdb_id: 456,
                title: "Test Movie 2",
                poster_path: "/test2.jpg",
                release_date: "2024-02-01",
                vote_average: 7.8,
                user_movie_data: null,
            },
        ],
        ...overrides,
    };
}

describe("usePaginatedMovies", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    /**
     * Test: Hook stores next_tmdb_page_start from API response metadata
     *
     * Scenario: API returns pagination metadata with next_tmdb_page_start field
     * Expected: Hook exposes metadata for subsequent pagination requests
     */
    describe("pagination metadata - storing next_tmdb_page_start", () => {
        it("should store next_tmdb_page_start when present in API response", async () => {
            // Arrange: Response includes next_tmdb_page_start metadata
            const mockResponse = createMockPaginatedResponse({
                page: 1,
                next_tmdb_page_start: 5, // Buffer consumed TMDB pages 1-4
            });

            const mockFetcher = createMockFetcher(mockResponse);

            // Act
            const { result } = renderHook(() =>
                usePaginatedMovies(mockFetcher),
            );

            // Assert: Hook should expose next_tmdb_page_start
            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.next_tmdb_page_start).toBe(5);
            expect(result.current.page).toBe(1);
            expect(result.current.movies).toHaveLength(2);
        });

        it("should handle next_tmdb_page_start as null when no buffering occurred", async () => {
            // Arrange: Response with null metadata (no buffering needed)
            const mockResponse = createMockPaginatedResponse({
                page: 1,
                next_tmdb_page_start: null, // Simple 1:1 page mapping
            });

            const mockFetcher = createMockFetcher(mockResponse);

            // Act
            const { result } = renderHook(() =>
                usePaginatedMovies(mockFetcher),
            );

            // Assert: Hook should expose null metadata
            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.next_tmdb_page_start).toBeNull();
        });

        it("should handle next_tmdb_page_start as undefined when field absent (backward compatibility)", async () => {
            // Arrange: Response without next_tmdb_page_start field (old API format)
            const mockResponse = createMockPaginatedResponse({
                page: 1,
                // next_tmdb_page_start field omitted entirely
            });

            const mockFetcher = createMockFetcher(mockResponse);

            // Act
            const { result } = renderHook(() =>
                usePaginatedMovies(mockFetcher),
            );

            // Assert: Hook should handle missing field gracefully
            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.next_tmdb_page_start).toBeUndefined();
        });
    });

    /**
     * Test: Hook includes tmdb_page_start in subsequent requests
     *
     * Scenario: User navigates to next page after receiving metadata
     * Expected: Fetcher receives tmdb_page_start parameter for continuation
     *
     * Note: This test validates the hook EXPOSES the metadata.
     * The actual inclusion in API requests is handled by the parent component
     * (useMovieFetchRouter or similar) which consumes this hook's return value.
     */
    describe("pagination metadata - using tmdb_page_start for continuation", () => {
        it("should expose next_tmdb_page_start for parent component to use in next request", async () => {
            // Arrange: First page response with metadata
            const firstPageResponse = createMockPaginatedResponse({
                page: 1,
                next_tmdb_page_start: 5,
            });

            // Second page response (simulates parent passing tmdb_page_start=5)
            const secondPageResponse = createMockPaginatedResponse({
                page: 2,
                next_tmdb_page_start: 9, // Consumed pages 5-8
                results: [
                    {
                        tmdb_id: 789,
                        title: "Test Movie 3",
                        poster_path: "/test3.jpg",
                        release_date: "2024-03-01",
                        vote_average: 9.0,
                        user_movie_data: null,
                    },
                ],
            });

            // Act: First render
            const { result, rerender } = renderHook(
                ({ fetcher }) => usePaginatedMovies(fetcher),
                {
                    initialProps: {
                        fetcher: createMockFetcher(firstPageResponse),
                    },
                },
            );

            // Assert: First page metadata available
            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });
            expect(result.current.next_tmdb_page_start).toBe(5);

            // Act: Simulate parent component creating new fetcher with tmdb_page_start=5
            // (Parent component would use result.current.next_tmdb_page_start)
            rerender({ fetcher: createMockFetcher(secondPageResponse) });

            // Assert: Second page data and updated metadata
            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });
            expect(result.current.page).toBe(2);
            expect(result.current.next_tmdb_page_start).toBe(9);
            expect(result.current.movies).toHaveLength(1);
            expect(result.current.movies[0]?.tmdb_id).toBe(789);
        });
    });

    /**
     * Test: Metadata resets when filters change
     *
     * Scenario: User applies new filters (different search context)
     * Expected: Pagination metadata resets, starts fresh pagination
     *
     * Note: Filter changes are handled by parent components (useMovieFetchRouter).
     * When filters change, parent creates new fetcher → hook receives new response
     * → metadata updates automatically from new response.
     */
    describe("pagination metadata - filter change reset", () => {
        it("should reset metadata when receiving response from new filter context", async () => {
            // Arrange: Initial response with buffering metadata
            const initialResponse = createMockPaginatedResponse({
                page: 2,
                next_tmdb_page_start: 9, // Mid-pagination state
            });

            // New filter response (page 1, fresh context)
            const newFilterResponse = createMockPaginatedResponse({
                page: 1,
                next_tmdb_page_start: 3, // Different buffer pattern
                results: [
                    {
                        tmdb_id: 999,
                        title: "Filtered Movie",
                        poster_path: "/filtered.jpg",
                        release_date: "2024-04-01",
                        vote_average: 8.0,
                        user_movie_data: null,
                    },
                ],
            });

            // Act: First render with mid-pagination state
            const { result, rerender } = renderHook(
                ({ fetcher }) => usePaginatedMovies(fetcher),
                {
                    initialProps: {
                        fetcher: createMockFetcher(initialResponse),
                    },
                },
            );

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });
            expect(result.current.next_tmdb_page_start).toBe(9);

            // Act: Filters change → parent provides new fetcher with fresh response
            rerender({ fetcher: createMockFetcher(newFilterResponse) });

            // Assert: Metadata resets to new context
            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });
            expect(result.current.page).toBe(1);
            expect(result.current.next_tmdb_page_start).toBe(3);
            expect(result.current.movies[0]?.tmdb_id).toBe(999);
        });
    });

    /**
     * Test: Backward compatibility - works without metadata
     *
     * Scenario: API doesn't include next_tmdb_page_start (old behavior)
     * Expected: Hook functions normally, metadata is undefined
     */
    describe("backward compatibility", () => {
        it("should work correctly when API response lacks pagination metadata", async () => {
            // Arrange: Response without any metadata fields
            const mockResponse = createMockPaginatedResponse({
                page: 2,
                // No next_tmdb_page_start field
            });

            const mockFetcher = createMockFetcher(mockResponse);

            // Act
            const { result } = renderHook(() =>
                usePaginatedMovies(mockFetcher),
            );

            // Assert: Hook still provides all standard functionality
            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.page).toBe(2);
            expect(result.current.total_pages).toBe(10);
            expect(result.current.total_results).toBe(200);
            expect(result.current.movies).toHaveLength(2);
            expect(result.current.next_tmdb_page_start).toBeUndefined();
        });
    });

    /**
     * Test: Loading and error states (existing behavior)
     *
     * Ensure new metadata fields don't break existing loading/error handling
     */
    describe("loading and error states", () => {
        it("should handle loading state correctly", async () => {
            // Arrange: Delayed response
            let resolveResponse: (value: { data: MovieListResponse }) => void;
            const mockFetcher = () => ({
                request: new Promise<{ data: MovieListResponse }>((resolve) => {
                    resolveResponse = resolve;
                }),
                cancel: vi.fn(),
            });

            // Act
            const { result } = renderHook(() =>
                usePaginatedMovies(mockFetcher),
            );

            // Assert: Initially loading
            expect(result.current.isLoading).toBe(true);
            expect(result.current.movies).toEqual([]);

            // Resolve response
            await waitFor(() => {
                resolveResponse!({ data: createMockPaginatedResponse() });
            });

            // Assert: Loading complete
            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });
            expect(result.current.movies).toHaveLength(2);
        });

        it("should expose next_tmdb_page_start as undefined during loading", async () => {
            // Arrange: Delayed response
            let resolveResponse: (value: { data: MovieListResponse }) => void;
            const mockFetcher = () => ({
                request: new Promise<{ data: MovieListResponse }>((resolve) => {
                    resolveResponse = resolve;
                }),
                cancel: vi.fn(),
            });

            // Act
            const { result } = renderHook(() =>
                usePaginatedMovies(mockFetcher),
            );

            // Assert: Metadata undefined while loading
            expect(result.current.next_tmdb_page_start).toBeUndefined();

            // Resolve with metadata
            await waitFor(() => {
                resolveResponse!({
                    data: createMockPaginatedResponse({
                        next_tmdb_page_start: 5,
                    }),
                });
            });

            // Assert: Metadata available after load
            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });
            expect(result.current.next_tmdb_page_start).toBe(5);
        });
    });
});
