/**
 * Tests for useMovieFetchRouter hook
 *
 * This hook wraps movie fetchers with browse parameter mapping and pagination
 * metadata support. It always uses the provided base fetcher (discover, top-rated, etc.)
 *
 * Note: Search endpoint routing was removed - browse always uses base fetcher.
 * Query field in BrowseParams is reserved for potential future use.
 *
 * Test coverage:
 * - Accepts tmdb_page_start parameter in routed fetcher
 * - Passes tmdb_page_start to base fetcher (discover/top-rated/etc)
 * - Backward compatibility when parameter omitted
 * - Always uses base fetcher (even when query is present)
 */

import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useMovieFetchRouter } from "../useMovieFetchRouter";
import type { MovieListResponse } from "@/types/movie";
import type { BrowseParams } from "@/types/browseTypes";
import { createMockBrowseParams } from "@tests/mocks/browseParams";

/**
 * Helper to create mock paginated response
 * (Reusing pattern from usePaginatedMovies.test.ts)
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
        (
            _page: number,
            _filters?: Record<string, string | number | number[]>,
            _tmdb_page_start?: number,
        ) => ({
            request: Promise.resolve({ data: createMockPaginatedResponse() }),
            cancel: vi.fn(),
        }),
    );
    return mockFn;
}

// Use shared createMockBrowseParams fixture from @tests/mocks/browseParams

describe("useMovieFetchRouter - pagination metadata passing", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    /**
     * Test: Routed fetcher accepts tmdb_page_start parameter
     *
     * Scenario: Parent component calls routed fetcher with tmdb_page_start
     * Expected: Parameter is accepted without errors
     */
    describe("parameter acceptance", () => {
        it("should accept tmdb_page_start as optional third parameter", () => {
            // Arrange
            const mockBaseFetcher = createMockBaseFetcher();
            const mockBrowseParams = createMockBrowseParams();

            const { result } = renderHook(() =>
                useMovieFetchRouter({
                    fetcher: mockBaseFetcher,
                    browseParams: mockBrowseParams,
                }),
            );

            // Act: Call routed fetcher with tmdb_page_start
            result.current(1, 5);

            // Assert: Should not throw, function accepts parameter
            // Note: createEmptyFilters includes sortBy which gets passed through
            expect(mockBaseFetcher).toHaveBeenCalledWith(
                1,
                { sort_by: "popularity.desc" },
                5,
            );
        });

        it("should work without tmdb_page_start for backward compatibility", () => {
            // Arrange
            const mockBaseFetcher = createMockBaseFetcher();
            const mockBrowseParams = createMockBrowseParams();

            const { result } = renderHook(() =>
                useMovieFetchRouter({
                    fetcher: mockBaseFetcher,
                    browseParams: mockBrowseParams,
                }),
            );

            // Act: Call routed fetcher without tmdb_page_start
            result.current(1);

            // Assert: Should work with undefined parameter
            // Note: createEmptyFilters includes sortBy which gets passed through
            expect(mockBaseFetcher).toHaveBeenCalledWith(
                1,
                { sort_by: "popularity.desc" },
                undefined,
            );
        });
    });

    /**
     * Test: tmdb_page_start passes through to base fetcher
     *
     * Scenario: Using discover/top-rated/etc endpoints (no search query)
     * Expected: Parameter flows through to base fetcher
     */
    describe("base fetcher - tmdb_page_start passing", () => {
        it("should pass tmdb_page_start to base fetcher when provided", () => {
            // Arrange
            const mockBaseFetcher = createMockBaseFetcher();
            const mockBrowseParams: BrowseParams = {
                ...createMockBrowseParams(),
                genres: [28],
                minRating: "7.0",
                maxRating: "10.0",
            };

            const { result } = renderHook(() =>
                useMovieFetchRouter({
                    fetcher: mockBaseFetcher,
                    browseParams: mockBrowseParams,
                }),
            );

            // Act: Navigate to page 2 with metadata
            result.current(2, 5);

            // Assert: Base fetcher receives all parameters
            expect(mockBaseFetcher).toHaveBeenCalledWith(
                2,
                expect.objectContaining({
                    genres: "28",
                    vote_average_gte: "7.0",
                    vote_average_lte: "10.0",
                }),
                5,
            );
        });

        it("should pass undefined tmdb_page_start when omitted", () => {
            // Arrange
            const mockBaseFetcher = createMockBaseFetcher();
            const mockBrowseParams = createMockBrowseParams();

            const { result } = renderHook(() =>
                useMovieFetchRouter({
                    fetcher: mockBaseFetcher,
                    browseParams: mockBrowseParams,
                }),
            );

            // Act: First page request without metadata
            result.current(1);

            // Assert: Parameter is undefined (backward compatible)
            // Note: createEmptyFilters includes sortBy which gets passed through
            expect(mockBaseFetcher).toHaveBeenCalledWith(
                1,
                { sort_by: "popularity.desc" },
                undefined,
            );
        });
    });

    /**
     * Test: Always uses base fetcher (search routing removed)
     *
     * Scenario: Query field is present in browse params
     * Expected: Still uses base fetcher, not search endpoint
     *
     * Note: Search routing was intentionally removed. Query field
     * is reserved for potential future use but doesn't trigger
     * search endpoint switching in the current implementation.
     */
    describe("filter handling - always uses base fetcher", () => {
        it("should use base fetcher with multiple filters", () => {
            // Arrange
            const mockBaseFetcher = createMockBaseFetcher();
            const mockBrowseParams: BrowseParams = {
                ...createMockBrowseParams(),
                genres: [28],
                minYear: "2020",
            };

            const { result } = renderHook(() =>
                useMovieFetchRouter({
                    fetcher: mockBaseFetcher,
                    browseParams: mockBrowseParams,
                }),
            );

            // Act: Request with filters
            result.current(2, 7);

            // Assert: Base fetcher is called with filter params
            expect(mockBaseFetcher).toHaveBeenCalledWith(
                2,
                expect.objectContaining({
                    genres: "28",
                    release_date_gte: "2020-01-01",
                }),
                7,
            );
        });
    });

    /**
     * Test: Backward compatibility - existing behavior preserved
     *
     * Scenario: Code using old signature (page only)
     * Expected: Functions normally without errors
     */
    describe("backward compatibility", () => {
        it("should maintain existing behavior when tmdb_page_start not used", () => {
            // Arrange
            const mockBaseFetcher = createMockBaseFetcher();
            const mockBrowseParams: BrowseParams = {
                ...createMockBrowseParams(),
                genres: [28, 12],
            };

            const { result } = renderHook(() =>
                useMovieFetchRouter({
                    fetcher: mockBaseFetcher,
                    browseParams: mockBrowseParams,
                }),
            );

            // Act: Use old calling pattern (page only)
            result.current(3);

            // Assert: Works as before, just with undefined third param
            expect(mockBaseFetcher).toHaveBeenCalledWith(
                3,
                expect.objectContaining({
                    genres: "28,12",
                }),
                undefined,
            );
        });
    });
});
