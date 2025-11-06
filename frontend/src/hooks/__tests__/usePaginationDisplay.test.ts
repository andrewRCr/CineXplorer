/**
 * Tests for usePaginationDisplay hook
 *
 * This hook manages pagination display logic, including result count formatting.
 * With smart buffer pagination, the actual result count per page can vary
 * (e.g., 11 results instead of 20 when filters are restrictive).
 *
 * Test coverage:
 * - Correct "showing X-Y" text with varying result counts
 * - Edge cases (first page, last page, empty results)
 * - Formula accuracy: endIndex = (currentPage - 1) * 20 + moviesCount
 */

import { renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePaginationDisplay } from '../usePaginationDisplay';

describe('usePaginationDisplay', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    /**
     * Test: Correct result count display with varying moviesCount
     *
     * Scenario: Smart buffer returns fewer results than pageSize (20)
     * Expected: Display shows actual count, not assumed pageSize
     */
    describe('result count calculation with varying moviesCount', () => {
        it('should show "1-11" when page 1 has 11 results (not "1-20")', () => {
            // Arrange: Page 1 with only 11 results due to filtering
            const currentPage = 1;
            const total_pages = 10;
            const total_results = 200;
            const moviesCount = 11; // Actual results returned

            // Act
            const { result } = renderHook(() =>
                usePaginationDisplay(currentPage, total_pages, total_results, moviesCount, false, 20)
            );

            // Assert: Should show actual count, not full page
            expect(result.current.resultText).toBe('Showing 1-11 of 200 results');
        });

        it('should show "1-12" when page 1 has 12 results', () => {
            // Arrange
            const currentPage = 1;
            const total_pages = 10;
            const total_results = 200;
            const moviesCount = 12;

            // Act
            const { result } = renderHook(() =>
                usePaginationDisplay(currentPage, total_pages, total_results, moviesCount, false, 20)
            );

            // Assert
            expect(result.current.resultText).toBe('Showing 1-12 of 200 results');
        });

        it('should show "1-20" when page 1 has full 20 results', () => {
            // Arrange
            const currentPage = 1;
            const total_pages = 10;
            const total_results = 200;
            const moviesCount = 20; // Full page

            // Act
            const { result } = renderHook(() =>
                usePaginationDisplay(currentPage, total_pages, total_results, moviesCount, false, 20)
            );

            // Assert
            expect(result.current.resultText).toBe('Showing 1-20 of 200 results');
        });

        it('should show "21-31" when page 2 has 11 results', () => {
            // Arrange: Page 2 with only 11 results
            const currentPage = 2;
            const total_pages = 10;
            const total_results = 200;
            const moviesCount = 11;

            // Act
            const { result } = renderHook(() =>
                usePaginationDisplay(currentPage, total_pages, total_results, moviesCount, false, 20)
            );

            // Assert: Formula: (2-1)*20 + 11 = 31
            expect(result.current.resultText).toBe('Showing 21-31 of 200 results');
        });

        it('should show "41-53" when page 3 has 13 results', () => {
            // Arrange: Page 3 with 13 results
            const currentPage = 3;
            const total_pages = 10;
            const total_results = 200;
            const moviesCount = 13;

            // Act
            const { result } = renderHook(() =>
                usePaginationDisplay(currentPage, total_pages, total_results, moviesCount, false, 20)
            );

            // Assert: Formula: (3-1)*20 + 13 = 53
            expect(result.current.resultText).toBe('Showing 41-53 of 200 results');
        });
    });

    /**
     * Test: Edge cases for pagination display
     */
    describe('edge cases', () => {
        it('should handle first page with single result (no pagination shown)', () => {
            // Arrange: Only 1 page total, so pagination not shown
            const currentPage = 1;
            const total_pages = 1; // Single page = no pagination controls
            const total_results = 1;
            const moviesCount = 1;

            // Act
            const { result } = renderHook(() =>
                usePaginationDisplay(currentPage, total_pages, total_results, moviesCount, false, 20)
            );

            // Assert: No pagination shown when total_pages <= 1
            expect(result.current.shouldShowPagination).toBe(false);
            expect(result.current.resultText).toBe('');
        });

        it('should handle empty results (no pagination shown)', () => {
            // Arrange
            const currentPage = 1;
            const total_pages = 0;
            const total_results = 0;
            const moviesCount = 0;

            // Act
            const { result } = renderHook(() =>
                usePaginationDisplay(currentPage, total_pages, total_results, moviesCount, false, 20)
            );

            // Assert: No pagination shown when no results
            expect(result.current.shouldShowPagination).toBe(false);
            expect(result.current.resultText).toBe('');
        });

        it('should handle last page with partial results', () => {
            // Arrange: Last page with only 7 results
            const currentPage = 10;
            const total_pages = 10;
            const total_results = 187; // 9 full pages + 7 results
            const moviesCount = 7;

            // Act
            const { result } = renderHook(() =>
                usePaginationDisplay(currentPage, total_pages, total_results, moviesCount, false, 20)
            );

            // Assert: Formula: (10-1)*20 + 7 = 187
            expect(result.current.resultText).toBe('Showing 181-187 of 187 results');
        });

        it('should show loading text when isLoading is true (with movies)', () => {
            // Arrange: Loading state with pagination visible (requires moviesCount > 0)
            const currentPage = 1;
            const total_pages = 10;
            const total_results = 200;
            const moviesCount = 15; // Has movies to trigger pagination visibility
            const isLoading = true;

            // Act
            const { result } = renderHook(() =>
                usePaginationDisplay(currentPage, total_pages, total_results, moviesCount, isLoading, 20)
            );

            // Assert
            expect(result.current.resultText).toBe('Loading results...');
        });
    });

    /**
     * Test: Formula accuracy verification
     *
     * Explicit verification of the formula: endIndex = (currentPage - 1) * pageSize + moviesCount
     */
    describe('formula accuracy', () => {
        it('should correctly calculate endIndex using formula: (currentPage - 1) * pageSize + moviesCount', () => {
            // Test multiple scenarios to verify formula
            const testCases = [
                // [currentPage, moviesCount, expectedStart, expectedEnd]
                [1, 15, 1, 15],   // Page 1: (1-1)*20 + 15 = 15
                [2, 18, 21, 38],  // Page 2: (2-1)*20 + 18 = 38
                [3, 9, 41, 49],   // Page 3: (3-1)*20 + 9 = 49
                [5, 20, 81, 100], // Page 5: (5-1)*20 + 20 = 100
            ];

            testCases.forEach(([page, count, expectedStart, expectedEnd]) => {
                const { result } = renderHook(() =>
                    usePaginationDisplay(page, 10, 200, count, false, 20)
                );

                expect(result.current.resultText).toBe(
                    `Showing ${expectedStart}-${expectedEnd} of 200 results`
                );
            });
        });

        it('should handle different page sizes correctly', () => {
            // Arrange: Custom page size of 50
            const currentPage = 2;
            const total_pages = 5;
            const total_results = 230;
            const moviesCount = 30; // Fewer than pageSize
            const pageSize = 50;

            // Act
            const { result } = renderHook(() =>
                usePaginationDisplay(currentPage, total_pages, total_results, moviesCount, false, pageSize)
            );

            // Assert: Formula: (2-1)*50 + 30 = 80
            expect(result.current.resultText).toBe('Showing 51-80 of 230 results');
        });
    });

    /**
     * Test: Pagination visibility logic
     *
     * Ensure visibility states work correctly with varying result counts
     */
    describe('pagination visibility', () => {
        it('should show pagination when results exist and multiple pages', () => {
            // Arrange
            const currentPage = 1;
            const total_pages = 5;
            const total_results = 100;
            const moviesCount = 11; // Partial page

            // Act
            const { result } = renderHook(() =>
                usePaginationDisplay(currentPage, total_pages, total_results, moviesCount, false, 20)
            );

            // Assert
            expect(result.current.shouldShowPagination).toBe(true);
            expect(result.current.paginationVisibility.opacity).toBe(1);
            expect(result.current.paginationVisibility.pointerEvents).toBe('auto');
        });

        it('should hide pagination when only one page exists', () => {
            // Arrange
            const currentPage = 1;
            const total_pages = 1; // Only one page
            const total_results = 11;
            const moviesCount = 11;

            // Act
            const { result } = renderHook(() =>
                usePaginationDisplay(currentPage, total_pages, total_results, moviesCount, false, 20)
            );

            // Assert
            expect(result.current.shouldShowPagination).toBe(false);
            expect(result.current.paginationVisibility.opacity).toBe(0);
            expect(result.current.paginationVisibility.pointerEvents).toBe('none');
        });

        it('should show empty state when no results', () => {
            // Arrange
            const currentPage = 1;
            const total_pages = 0;
            const total_results = 0;
            const moviesCount = 0;
            const isLoading = false;

            // Act
            const { result } = renderHook(() =>
                usePaginationDisplay(currentPage, total_pages, total_results, moviesCount, isLoading, 20)
            );

            // Assert
            expect(result.current.shouldShowEmptyState).toBe(true);
            expect(result.current.hasMovies).toBe(false);
        });
    });

    /**
     * Test: Total results formatting (10,000+ cap)
     */
    describe('total results formatting', () => {
        it('should format total_results with comma separator', () => {
            // Arrange
            const currentPage = 1;
            const total_pages = 500;
            const total_results = 9500; // Below 10k cap
            const moviesCount = 20;

            // Act
            const { result } = renderHook(() =>
                usePaginationDisplay(currentPage, total_pages, total_results, moviesCount, false, 20)
            );

            // Assert: Should include comma
            expect(result.current.resultText).toContain('9,500');
        });

        it('should cap display at "10,000+" when results exceed 10,000', () => {
            // Arrange
            const currentPage = 1;
            const total_pages = 1000;
            const total_results = 15000; // Exceeds cap
            const moviesCount = 20;

            // Act
            const { result } = renderHook(() =>
                usePaginationDisplay(currentPage, total_pages, total_results, moviesCount, false, 20)
            );

            // Assert
            expect(result.current.resultText).toBe('Showing 1-20 of 10,000+ results');
        });
    });
});
