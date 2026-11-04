/**
 * Tests for routeConfigHelper - Search Query Consistency
 *
 * This test suite verifies that the search route correctly uses the query
 * parameter from the provided search string, NOT from window.location.
 *
 * Background: A bug was discovered where backward navigation to search results
 * could show different results due to a race condition between window.location
 * and React Router's location object. The fix is to pass the search string
 * explicitly to getFetcherAndSource.
 *
 * Test coverage:
 * - Search query extracted from provided search parameter
 * - Query consistent across multiple fetcher calls
 * - Empty query handled correctly
 * - Query with special characters handled correctly
 * - filters.query does not override search string query
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getFetcherAndSource } from "../routeConfigResolver";
import * as movieService from "@/services/movieService";

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

describe("routeConfigHelper - search query consistency", () => {
    let mockSearchService: ReturnType<typeof createMockService>;
    let originalLocation: Location;

    beforeEach(() => {
        vi.clearAllMocks();
        mockSearchService = createMockService();
        vi.spyOn(
            movieService,
            "fetchSearchMoviesService",
            "get",
        ).mockReturnValue(
            mockSearchService as unknown as typeof movieService.fetchSearchMoviesService,
        );

        // Store original location for restoration
        originalLocation = window.location;
    });

    afterEach(() => {
        // Restore original location
        Object.defineProperty(window, "location", {
            value: originalLocation,
            writable: true,
        });
    });

    describe("query extraction from search parameter", () => {
        /**
         * Test: Query is extracted from the search parameter, not window.location
         *
         * This is the core test for the backward navigation bug fix.
         * The function should use the provided search string, enabling
         * React Router to control the location state.
         */
        it("should extract query from provided search parameter", () => {
            // Arrange: Set window.location to DIFFERENT value than search param
            // This simulates the race condition where window.location differs
            Object.defineProperty(window, "location", {
                value: { search: "?query=stale_value" },
                writable: true,
            });

            // Act: Call with explicit search parameter
            const config = getFetcherAndSource("/search", "?query=batman");
            config.fetcher(1, {});

            // Assert: Should use 'batman' from search param, NOT 'stale_value'
            expect(mockSearchService.getPaginated).toHaveBeenCalledWith(
                expect.objectContaining({
                    query: "batman",
                }),
            );
        });

        it("should handle query with special characters", () => {
            const config = getFetcherAndSource(
                "/search",
                "?query=the%20dark%20knight",
            );
            config.fetcher(1, {});

            expect(mockSearchService.getPaginated).toHaveBeenCalledWith(
                expect.objectContaining({
                    query: "the dark knight",
                }),
            );
        });

        it("should handle empty query gracefully", () => {
            const config = getFetcherAndSource("/search", "?query=");
            config.fetcher(1, {});

            expect(mockSearchService.getPaginated).toHaveBeenCalledWith(
                expect.objectContaining({
                    query: "",
                }),
            );
        });

        it("should handle missing query parameter", () => {
            const config = getFetcherAndSource("/search", "?page=1");
            config.fetcher(1, {});

            expect(mockSearchService.getPaginated).toHaveBeenCalledWith(
                expect.objectContaining({
                    query: "",
                }),
            );
        });

        it("should handle empty search string", () => {
            const config = getFetcherAndSource("/search", "");
            config.fetcher(1, {});

            expect(mockSearchService.getPaginated).toHaveBeenCalledWith(
                expect.objectContaining({
                    query: "",
                }),
            );
        });
    });

    describe("query consistency across fetcher calls", () => {
        /**
         * Test: Multiple calls to the same fetcher use consistent query
         *
         * The query captured at getFetcherAndSource time should be used
         * for all subsequent fetcher calls (pagination, etc.)
         */
        it("should use consistent query across multiple fetcher calls", () => {
            const config = getFetcherAndSource("/search", "?query=avatar");

            // Simulate pagination - multiple calls
            config.fetcher(1, {});
            config.fetcher(2, {});
            config.fetcher(3, {});

            // All calls should have same query
            expect(mockSearchService.getPaginated).toHaveBeenCalledTimes(3);
            expect(mockSearchService.getPaginated).toHaveBeenNthCalledWith(
                1,
                expect.objectContaining({ query: "avatar", page: 1 }),
            );
            expect(mockSearchService.getPaginated).toHaveBeenNthCalledWith(
                2,
                expect.objectContaining({ query: "avatar", page: 2 }),
            );
            expect(mockSearchService.getPaginated).toHaveBeenNthCalledWith(
                3,
                expect.objectContaining({ query: "avatar", page: 3 }),
            );
        });

        it("should not be affected by window.location changes after creation", () => {
            // Create config with initial search
            const config = getFetcherAndSource("/search", "?query=inception");

            // Simulate window.location changing (e.g., user types in address bar)
            Object.defineProperty(window, "location", {
                value: { search: "?query=different_movie" },
                writable: true,
            });

            // Fetcher should still use original query
            config.fetcher(1, {});

            expect(mockSearchService.getPaginated).toHaveBeenCalledWith(
                expect.objectContaining({
                    query: "inception", // NOT 'different_movie'
                }),
            );
        });
    });

    describe("filter.query interaction", () => {
        /**
         * Test: filters.query should not override search string query
         *
         * When both search string query AND filters.query exist, the search
         * string query should take precedence (it's the source of truth from URL).
         */
        it("should prefer search string query over filters.query", () => {
            const config = getFetcherAndSource("/search", "?query=batman");

            // Call with filters that also include query
            config.fetcher(1, { query: "superman" });

            // Search string query should win
            expect(mockSearchService.getPaginated).toHaveBeenCalledWith(
                expect.objectContaining({
                    query: "batman", // NOT 'superman'
                }),
            );
        });
    });

    describe("title generation", () => {
        it("should include query in title secondary text", () => {
            const config = getFetcherAndSource("/search", "?query=batman");

            expect(config.title).toEqual({
                main: "Search Results",
                secondary: ' for "batman"',
            });
        });

        it("should omit secondary text when query is empty", () => {
            const config = getFetcherAndSource("/search", "");

            expect(config.title).toEqual({
                main: "Search Results",
                secondary: undefined,
            });
        });
    });

    describe("backward compatibility", () => {
        /**
         * Test: Function works when search parameter is not provided
         *
         * During transition, callers may not pass search parameter.
         * Function should fall back to window.location for compatibility.
         *
         * NOTE: This test documents transitional behavior. Once all callers
         * are updated, this fallback can be removed.
         */
        it("should fall back to window.location when search not provided", () => {
            // Arrange
            Object.defineProperty(window, "location", {
                value: { search: "?query=fallback_test" },
                writable: true,
            });

            // Act: Call without search parameter (old API)
            const config = getFetcherAndSource("/search");
            config.fetcher(1, {});

            // Assert: Should use window.location as fallback
            expect(mockSearchService.getPaginated).toHaveBeenCalledWith(
                expect.objectContaining({
                    query: "fallback_test",
                }),
            );
        });
    });
});
