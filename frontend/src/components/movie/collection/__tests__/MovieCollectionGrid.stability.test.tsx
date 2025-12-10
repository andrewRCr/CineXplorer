/**
 * Stability Tests for MovieCollectionGrid - Pagination Metadata
 *
 * These tests verify that MovieCollectionGrid correctly handles pagination metadata
 * without causing infinite re-render loops or excessive API calls.
 *
 * Same bug as MovieGrid: useEffect updating state when metadata received caused
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
import MovieCollectionGrid from '../MovieCollectionGrid';
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

describe('MovieCollectionGrid - Stability Tests', () => {
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
    render(<MovieCollectionGrid fetcher={mockFetcher} source="popular" initialCurrentPage={1} />);

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

    // Mock onPageChange callback
    const mockOnPageChange = vi.fn();

    // Act: Render on page 1
    const { rerender } = render(
      <MovieCollectionGrid
        fetcher={mockFetcher}
        source="popular"
        initialCurrentPage={1}
        onPageChange={mockOnPageChange}
      />
    );

    await waitFor(() => expect(mockFetcher).toHaveBeenCalled());

    // Assert: First call should NOT include tmdb_page_start
    expect(mockFetcher).toHaveBeenNthCalledWith(1, 1, undefined);

    // Act: Navigate to page 2 (simulate by re-rendering with new page)
    rerender(
      <MovieCollectionGrid
        fetcher={mockFetcher}
        source="popular"
        initialCurrentPage={2}
        onPageChange={mockOnPageChange}
      />
    );

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
      <MovieCollectionGrid fetcher={mockFetcher1} source="popular" initialCurrentPage={1} />
    );

    await waitFor(() => expect(mockFetcher1).toHaveBeenCalled());

    // Act: Change to different fetcher (simulates filter/route change)
    rerender(<MovieCollectionGrid fetcher={mockFetcher2} source="top-rated" initialCurrentPage={1} />);

    await waitFor(() => expect(mockFetcher2).toHaveBeenCalled());

    // Assert: New fetcher called without metadata (reset to undefined)
    expect(mockFetcher2).toHaveBeenCalledWith(1, undefined);
  });

  /**
   * Test: Backward navigation to page 1 should clear metadata
   *
   * Scenario: User navigates page 1 → page 2 → page 1
   * Expected: Page 1 (on return) should NOT include stale tmdb_page_start
   *
   * Bug behavior: After page 2 sets metadata to 5, returning to page 1 still
   * sends tmdb_page_start=5, causing backend to fetch from TMDB page 5 instead of 1.
   * Result: Completely different movies shown on page 1 the second time.
   */
  it('should clear metadata when navigating backward to page 1', async () => {
    // Arrange
    const mockFetcher = vi.fn((page: number, _tmdb_page_start?: number) => ({
      request: Promise.resolve({
        data: createMockResponse({
          page,
          // Page 1 returns metadata 3, page 2 returns metadata 5
          next_tmdb_page_start: page === 1 ? 3 : 5,
        }),
      }),
      cancel: vi.fn(),
    }));

    // Act: Render on page 1
    const { rerender } = render(
      <MovieCollectionGrid
        fetcher={mockFetcher}
        source="popular"
        initialCurrentPage={1}
      />
    );

    await waitFor(() => expect(mockFetcher).toHaveBeenCalled());

    // Assert: First page 1 call should NOT include tmdb_page_start
    expect(mockFetcher).toHaveBeenNthCalledWith(1, 1, undefined);

    // Act: Navigate to page 2
    rerender(
      <MovieCollectionGrid
        fetcher={mockFetcher}
        source="popular"
        initialCurrentPage={2}
      />
    );

    await waitFor(() => expect(mockFetcher).toHaveBeenCalledTimes(2));

    // Assert: Page 2 should use stored metadata from page 1
    expect(mockFetcher).toHaveBeenNthCalledWith(2, 2, 3);

    // Act: Navigate BACK to page 1 (the bug scenario)
    rerender(
      <MovieCollectionGrid
        fetcher={mockFetcher}
        source="popular"
        initialCurrentPage={1}
      />
    );

    await waitFor(() => expect(mockFetcher).toHaveBeenCalledTimes(3));

    // Assert: Returning to page 1 should clear metadata (NOT send stale value 5)
    // BUG: Current implementation sends (1, 5) instead of (1, undefined)
    expect(mockFetcher).toHaveBeenNthCalledWith(3, 1, undefined);
  });

  /**
   * Test: Any backward navigation should clear metadata
   *
   * Scenario: User navigates page 1 → page 2 → page 3 → page 2
   * Expected: Going back from page 3 to page 2 should clear metadata
   *
   * Note: This ensures consistency for any backward navigation, not just to page 1
   */
  it('should clear metadata on any backward navigation', async () => {
    // Arrange
    const mockFetcher = vi.fn((page: number, _tmdb_page_start?: number) => ({
      request: Promise.resolve({
        data: createMockResponse({
          page,
          // Each page returns incremented metadata
          next_tmdb_page_start: page * 2 + 1,
        }),
      }),
      cancel: vi.fn(),
    }));

    // Act: Render on page 1
    const { rerender } = render(
      <MovieCollectionGrid
        fetcher={mockFetcher}
        source="popular"
        initialCurrentPage={1}
      />
    );

    await waitFor(() => expect(mockFetcher).toHaveBeenCalled());

    // Navigate to page 2
    rerender(
      <MovieCollectionGrid
        fetcher={mockFetcher}
        source="popular"
        initialCurrentPage={2}
      />
    );
    await waitFor(() => expect(mockFetcher).toHaveBeenCalledTimes(2));

    // Navigate to page 3
    rerender(
      <MovieCollectionGrid
        fetcher={mockFetcher}
        source="popular"
        initialCurrentPage={3}
      />
    );
    await waitFor(() => expect(mockFetcher).toHaveBeenCalledTimes(3));

    // Act: Navigate BACK to page 2
    rerender(
      <MovieCollectionGrid
        fetcher={mockFetcher}
        source="popular"
        initialCurrentPage={2}
      />
    );
    await waitFor(() => expect(mockFetcher).toHaveBeenCalledTimes(4));

    // Assert: Going back to page 2 should clear metadata
    expect(mockFetcher).toHaveBeenNthCalledWith(4, 2, undefined);
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
        <MovieCollectionGrid fetcher={mockFetcher} source="popular" initialCurrentPage={1} />
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

/**
 * URL Metadata Persistence Tests
 *
 * These tests verify that tmdb_page_start metadata is:
 * 1. Read from URL on initial mount (back navigation from MovieDetail)
 * 2. Passed to API for accurate pagination continuation
 * 3. Updated from API response for subsequent navigation
 *
 * Context: Smart buffer pagination tracks which TMDB pages have been consumed.
 * When users navigate away (to MovieDetail) and back, this metadata must persist
 * in the URL to ensure the same movies appear in the same positions.
 */
describe('MovieCollectionGrid - URL Metadata Persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test: Component reads tmdb_page_start from URL on mount
   *
   * Scenario: User returns from MovieDetail with tmdb_page_start in URL
   * Expected: Initial API call includes tmdb_page_start from URL
   */
  it('should read tmdb_page_start from URL on initial mount', async () => {
    // Arrange: Mock fetcher that tracks tmdb_page_start parameter
    const mockFetcher = vi.fn((page: number, tmdb_page_start?: number) => ({
      request: Promise.resolve({
        data: createMockResponse({
          page,
          next_tmdb_page_start: (tmdb_page_start ?? page) + 4,
        }),
      }),
      cancel: vi.fn(),
    }));

    // Act: Render with URL containing tmdb_page_start=5
    // This simulates returning from MovieDetail to page 2 where buffer had consumed TMDB pages 1-4
    const { renderWithRoute } = await import('@tests/helpers/test-renderer-with-routes');

    renderWithRoute(
      '/browse/popular',
      <MovieCollectionGrid
        fetcher={mockFetcher}
        source="popular"
        initialCurrentPage={2}
      />,
      { initialRoute: '/browse/popular?page=2&tmdb_page_start=5' }
    );

    await waitFor(() => expect(mockFetcher).toHaveBeenCalled());

    // Assert: First call should include tmdb_page_start=5 from URL
    expect(mockFetcher).toHaveBeenCalledWith(2, 5);
  });

  /**
   * Test: Component works without tmdb_page_start in URL (backward compatibility)
   *
   * Scenario: User navigates to page without metadata (fresh visit or old link)
   * Expected: API call has undefined tmdb_page_start (existing behavior)
   */
  it('should pass undefined when tmdb_page_start not in URL', async () => {
    // Arrange
    const mockFetcher = vi.fn((page: number, _tmdb_page_start?: number) => ({
      request: Promise.resolve({
        data: createMockResponse({
          page,
          next_tmdb_page_start: page + 1,
        }),
      }),
      cancel: vi.fn(),
    }));

    // Act: Render without tmdb_page_start in URL
    const { renderWithRoute } = await import('@tests/helpers/test-renderer-with-routes');

    renderWithRoute(
      '/browse/popular',
      <MovieCollectionGrid
        fetcher={mockFetcher}
        source="popular"
        initialCurrentPage={1}
      />,
      { initialRoute: '/browse/popular?page=1' }
    );

    await waitFor(() => expect(mockFetcher).toHaveBeenCalled());

    // Assert: First call should have undefined tmdb_page_start
    expect(mockFetcher).toHaveBeenCalledWith(1, undefined);
  });

  /**
   * Test: URL metadata used on mount, response metadata on pagination
   *
   * Scenario: User returns to page 2 (URL has tmdb_page_start=5), then navigates to page 3
   * Expected:
   *   - Page 2 mount: uses URL's tmdb_page_start=5
   *   - Page 3 navigation: uses response's next_tmdb_page_start=9
   *
   * This ensures the transition from URL state to response state works correctly.
   */
  it('should use URL metadata on mount, then switch to response metadata', async () => {
    // Arrange: Fetcher returns next_tmdb_page_start based on what it receives
    const mockFetcher = vi.fn((page: number, tmdb_page_start?: number) => ({
      request: Promise.resolve({
        data: createMockResponse({
          page,
          // Simulate buffer: consume 4 pages per API page
          next_tmdb_page_start: (tmdb_page_start ?? 1) + 4,
        }),
      }),
      cancel: vi.fn(),
    }));

    // Act: Render at page 2 with URL metadata
    const { renderWithRoute } = await import('@tests/helpers/test-renderer-with-routes');

    const { rerender } = renderWithRoute(
      '/browse/popular',
      <MovieCollectionGrid
        fetcher={mockFetcher}
        source="popular"
        initialCurrentPage={2}
      />,
      { initialRoute: '/browse/popular?page=2&tmdb_page_start=5' }
    );

    await waitFor(() => expect(mockFetcher).toHaveBeenCalled());

    // Assert: Initial mount uses URL metadata
    expect(mockFetcher).toHaveBeenNthCalledWith(1, 2, 5);

    // Act: Navigate to page 3 (simulate via rerender)
    rerender(
      <MovieCollectionGrid
        fetcher={mockFetcher}
        source="popular"
        initialCurrentPage={3}
      />
    );

    await waitFor(() => expect(mockFetcher).toHaveBeenCalledTimes(2));

    // Assert: Page 3 uses response metadata (5 + 4 = 9)
    expect(mockFetcher).toHaveBeenNthCalledWith(2, 3, 9);
  });

  /**
   * Test: Page 1 always starts fresh regardless of URL metadata
   *
   * Scenario: URL has stale tmdb_page_start but page=1
   * Expected: Page 1 should NOT use URL metadata (could be stale from previous session)
   *
   * Rationale: Page 1 is always the "start" - using metadata could show wrong movies
   */
  it('should ignore URL tmdb_page_start when on page 1', async () => {
    // Arrange
    const mockFetcher = vi.fn((page: number, _tmdb_page_start?: number) => ({
      request: Promise.resolve({
        data: createMockResponse({
          page,
          next_tmdb_page_start: 3,
        }),
      }),
      cancel: vi.fn(),
    }));

    // Act: Render page 1 with stale tmdb_page_start in URL
    const { renderWithRoute } = await import('@tests/helpers/test-renderer-with-routes');

    renderWithRoute(
      '/browse/popular',
      <MovieCollectionGrid
        fetcher={mockFetcher}
        source="popular"
        initialCurrentPage={1}
      />,
      { initialRoute: '/browse/popular?page=1&tmdb_page_start=10' }
    );

    await waitFor(() => expect(mockFetcher).toHaveBeenCalled());

    // Assert: Page 1 should always use undefined (fresh start)
    expect(mockFetcher).toHaveBeenCalledWith(1, undefined);
  });
});
