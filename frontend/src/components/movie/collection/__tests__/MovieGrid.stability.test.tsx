/**
 * Stability Tests for MovieGrid - Pagination Metadata
 *
 * These tests verify that MovieGrid correctly handles pagination metadata
 * without causing infinite re-render loops or excessive API calls.
 *
 * Bug discovered: useEffect updating state when metadata received caused
 * infinite loop where each API response triggered a new fetch.
 *
 * Test coverage:
 * - No infinite fetches when metadata received
 * - Metadata stored for next page navigation, not used immediately
 * - Proper reset behavior on filter/route changes
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@tests/helpers/test-renderer';
import MovieGrid from '../MovieGrid';
import type { PaginatedMoviesResponse } from '@/types/movie';

/**
 * Helper to create mock paginated response
 */
function createMockResponse(
  overrides?: Partial<PaginatedMoviesResponse>
): PaginatedMoviesResponse {
  return {
    page: 1,
    total_pages: 10,
    total_results: 200,
    results: [
      {
        tmdb_id: 123,
        title: 'Test Movie',
        poster_path: '/test.jpg',
        release_date: '2024-01-01',
        vote_average: 8.5,
        user_movie_data: null,
      },
    ],
    ...overrides,
  };
}

describe('MovieGrid - Stability Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test: Component should not trigger infinite fetches when metadata received
   *
   * Scenario: API returns next_tmdb_page_start metadata
   * Expected: Component stores metadata but does NOT immediately fetch again
   *
   * Bug behavior: Each API response triggered useEffect → state update → re-render → new fetch
   */
  it('should not trigger infinite fetches when metadata is received', async () => {
    // Arrange
    let fetchCount = 0;
    const mockFetcher = vi.fn((page: number, tmdb_page_start?: number) => {
      fetchCount++;
      return {
        request: Promise.resolve({
          data: createMockResponse({
            page,
            next_tmdb_page_start: (tmdb_page_start ?? page) + 1, // Return incremented metadata
          }),
        }),
        cancel: vi.fn(),
      };
    });

    // Act: Render component
    render(<MovieGrid fetcher={mockFetcher} source="popular" initialCurrentPage={1} />);

    // Wait for initial fetch to complete
    await waitFor(() => expect(fetchCount).toBeGreaterThan(0), { timeout: 2000 });

    const fetchesAfterInitial = fetchCount;

    // Assert: Should NOT continue fetching after initial load
    // Wait 500ms to ensure no additional fetches triggered
    await new Promise(resolve => setTimeout(resolve, 500));

    expect(fetchCount).toBe(fetchesAfterInitial);
    expect(fetchCount).toBeLessThan(3); // Should be 1-2 fetches max (initial + possible StrictMode double)

    // Verify fetcher was called correctly (no tmdb_page_start on first load)
    expect(mockFetcher).toHaveBeenCalledWith(1, undefined);
  });

  /**
   * Test: Metadata should only be used when page changes
   *
   * Scenario: User loads page 1, receives metadata, then navigates to page 2
   * Expected: Page 1 request has no metadata, page 2 uses stored metadata
   */
  it('should use stored metadata only when navigating to next page', async () => {
    // Arrange
    const mockFetcher = vi.fn((page: number, _tmdb_page_start?: number) => ({
      request: Promise.resolve({
        data: createMockResponse({
          page,
          next_tmdb_page_start: 5, // Simulate buffer consumed pages 1-4
        }),
      }),
      cancel: vi.fn(),
    }));

    // Act: Render on page 1
    const { rerender } = render(
      <MovieGrid fetcher={mockFetcher} source="popular" initialCurrentPage={1} />
    );

    await waitFor(() => expect(mockFetcher).toHaveBeenCalled());

    // Assert: First call should NOT include tmdb_page_start
    expect(mockFetcher).toHaveBeenNthCalledWith(1, 1, undefined);

    // Act: Navigate to page 2 (simulate by re-rendering with new page)
    rerender(<MovieGrid fetcher={mockFetcher} source="popular" initialCurrentPage={2} />);

    await waitFor(() => expect(mockFetcher).toHaveBeenCalledTimes(2));

    // Assert: Second call SHOULD include stored metadata
    expect(mockFetcher).toHaveBeenNthCalledWith(2, 2, 5);
  });

  /**
   * Test: Metadata should reset when fetcher changes (filter/route change)
   *
   * Scenario: User has stored metadata, then changes filters/route
   * Expected: Metadata resets to undefined for fresh filter context
   */
  it('should reset metadata when fetcher changes', async () => {
    // Arrange
    const mockFetcher1 = vi.fn((page: number) => ({
      request: Promise.resolve({
        data: createMockResponse({ page, next_tmdb_page_start: 10 }),
      }),
      cancel: vi.fn(),
    }));

    const mockFetcher2 = vi.fn((page: number) => ({
      request: Promise.resolve({
        data: createMockResponse({ page }),
      }),
      cancel: vi.fn(),
    }));

    // Act: Render with first fetcher
    const { rerender } = render(
      <MovieGrid fetcher={mockFetcher1} source="popular" initialCurrentPage={1} />
    );

    await waitFor(() => expect(mockFetcher1).toHaveBeenCalled());

    // Act: Change to different fetcher (simulates filter/route change)
    rerender(<MovieGrid fetcher={mockFetcher2} source="top-rated" initialCurrentPage={1} />);

    await waitFor(() => expect(mockFetcher2).toHaveBeenCalled());

    // Assert: New fetcher called without metadata (reset to undefined)
    expect(mockFetcher2).toHaveBeenCalledWith(1, undefined);
  });

  /**
   * Test: Component should be stable in React StrictMode
   *
   * Scenario: React StrictMode intentionally double-renders components
   * Expected: Component handles double-render without issues
   */
  it('should be stable in React StrictMode', async () => {
    // Arrange
    const mockFetcher = vi.fn((page: number) => ({
      request: Promise.resolve({
        data: createMockResponse({ page, next_tmdb_page_start: 2 }),
      }),
      cancel: vi.fn(),
    }));

    // Act: Render in StrictMode
    render(
      <React.StrictMode>
        <MovieGrid fetcher={mockFetcher} source="popular" initialCurrentPage={1} />
      </React.StrictMode>
    );

    // Wait for renders to complete
    await waitFor(() => expect(mockFetcher).toHaveBeenCalled(), { timeout: 2000 });

    // Assert: Should not timeout or crash
    // StrictMode may cause 2 fetches (intentional double-render), but not infinite
    expect(mockFetcher).toHaveBeenCalled();
    expect(mockFetcher.mock.calls.length).toBeLessThanOrEqual(2);
  });
});
