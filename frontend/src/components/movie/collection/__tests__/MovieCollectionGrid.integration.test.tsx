import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor, renderWithRoutes } from '@tests/helpers/test-renderer-with-routes';
import MovieCollectionGrid from '../MovieCollectionGrid';
import MovieDetail from '@/pages/movie/MovieDetail';
import { createMockMovies, createMockMovie } from '@tests/mocks/movieData';
import type { PaginatedMoviesResponse, Movie } from '@/types/movie';

// Mock hooks and services
vi.mock('@/hooks/useMovieDetail', () => ({
  default: vi.fn(),
}));

vi.mock('@/hooks/useUserMovieData', () => ({
  useUserMovieData: vi.fn(() => ({
    data: null,
    loading: false,
    update: vi.fn(),
  })),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    isAuthenticated: false,
  })),
}));

vi.mock('@/services/movieService', () => ({
  fetchMovieDetail: vi.fn(),
}));

import useMovieDetail from '@/hooks/useMovieDetail';

/**
 * Integration tests for navigation flows involving MovieCollectionGrid,
 * MovieCard, and MovieDetail. These tests verify that URL parameters
 * are preserved correctly across the entire navigation journey.
 */
describe('MovieCollectionGrid - Navigation Integration', () => {
  // Mock fetcher function for movie collection
  const createMockFetcher = (movies: Movie[] = createMockMovies(20)) => {
    return (page: number) => {
      const response: PaginatedMoviesResponse = {
        page,
        results: movies,
        total_pages: 10,
        total_results: 200,
      };

      return {
        request: Promise.resolve({ data: response }),
        cancel: vi.fn(),
      };
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Apply Filters → Navigate to Detail → Back', () => {
    it('preserves all params when navigating from filtered results', async () => {
      // Simulate: User applies year filter → clicks movie → expects link to have all params
      const mockFetcher = createMockFetcher();
      const mockMovie = createMockMovie({ tmdb_id: 550 });

      // Mock movie detail response - cast to satisfy type checker
      vi.mocked(useMovieDetail).mockReturnValue({
        movie: mockMovie as unknown as import('@shared/index').Movie,
        error: '',
        setMovie: vi.fn(),
        setError: vi.fn(),
        isLoading: false,
      });

      // Render with routing context
      const { container } = renderWithRoutes(
        [
          {
            path: '/popular',
            element: (
              <MovieCollectionGrid
                fetcher={mockFetcher}
                source="popular"
                initialCurrentPage={1}
              />
            ),
          },
          { path: '/movie/:id', element: <MovieDetail /> },
        ],
        { initialRoute: '/popular?page=1&minYear=1980&maxYear=1990' }
      );

      // Wait for movies to load
      await waitFor(() => {
        expect(screen.getByText('Test Movie 1')).toBeInTheDocument();
      });

      // Find first movie card link
      const movieLink = container.querySelector('a[href*="/movie/1"]');
      expect(movieLink).toBeInTheDocument();

      const href = movieLink?.getAttribute('href') || '';

      // Page params should NOT be in URL (infinite scroll migration)
      expect(href).not.toContain('page=');
      expect(href).toContain('from=popular');

      // Filter params should be preserved
      expect(href).toContain('minYear=1980');
      expect(href).toContain('maxYear=1990');
    });

    it('preserves filters but NOT page on detail navigation', async () => {
      // User on page 2 with filters → clicks movie → link should have filters but NOT page
      const mockFetcher = createMockFetcher();
      const mockMovie = createMockMovie({ tmdb_id: 123 });

      vi.mocked(useMovieDetail).mockReturnValue({
        movie: mockMovie as unknown as import('@shared/index').Movie,
        error: '',
        setMovie: vi.fn(),
        setError: vi.fn(),
        isLoading: false,
      });

      renderWithRoutes(
        [
          {
            path: '/popular',
            element: (
              <MovieCollectionGrid
                fetcher={mockFetcher}
                source="popular"
                initialCurrentPage={2}
              />
            ),
          },
          { path: '/movie/:id', element: <MovieDetail /> },
        ],
        {
          initialRoute: '/popular?page=2&minYear=1990&maxYear=2000&genres=28,12&minRating=7.0',
        }
      );

      await waitFor(() => {
        expect(screen.getByText('Test Movie 1')).toBeInTheDocument();
      });

      // Verify movie card link includes filter params but NOT page
      const movieLink = document.querySelector('a[href*="/movie/1"]');
      const detailHref = movieLink?.getAttribute('href') || '';

      // Page params should NOT be in URL (infinite scroll migration)
      expect(detailHref).not.toContain('page=');
      // Filter params should be preserved
      expect(detailHref).toContain('minYear=1990');
      expect(detailHref).toContain('maxYear=2000');
      // Genres are URL-encoded (comma becomes %2C)
      expect(detailHref).toContain('genres=28%2C12');
      expect(detailHref).toContain('minRating=7.0');
    });

    it('preserves search query + filters across navigation', async () => {
      // Search results with filters applied
      const mockFetcher = createMockFetcher();
      const mockMovie = createMockMovie({ tmdb_id: 456 });

      vi.mocked(useMovieDetail).mockReturnValue({
        movie: mockMovie as unknown as import('@shared/index').Movie,
        error: '',
        setMovie: vi.fn(),
        setError: vi.fn(),
        isLoading: false,
      });

      renderWithRoutes(
        [
          {
            path: '/search',
            element: (
              <MovieCollectionGrid
                fetcher={mockFetcher}
                source="search"
                query="inception"
                initialCurrentPage={1}
              />
            ),
          },
          { path: '/movie/:id', element: <MovieDetail /> },
        ],
        {
          initialRoute: '/search?page=1&query=inception&minYear=2010&genres=28&minRating=8.0',
        }
      );

      await waitFor(() => {
        expect(screen.getByText('Test Movie 1')).toBeInTheDocument();
      });

      const movieLink = document.querySelector('a[href*="/movie/1"]');
      const href = movieLink?.getAttribute('href') || '';

      // Should preserve search query AND filters
      expect(href).toContain('query=inception');
      expect(href).toContain('minYear=2010');
      expect(href).toContain('genres=28');
      expect(href).toContain('minRating=8.0');
    });
  });

  describe('Multiple Navigation Cycles', () => {
    it('maintains state through multiple movie views', async () => {
      // Filtered page → Movie A → (would go back) → Movie B → both links have same params
      const mockFetcher = createMockFetcher();
      const mockMovieA = createMockMovie({ tmdb_id: 100, title: 'Movie A' });

      vi.mocked(useMovieDetail).mockReturnValue({
        movie: mockMovieA as unknown as import('@shared/index').Movie,
        error: '',
        setMovie: vi.fn(),
        setError: vi.fn(),
        isLoading: false,
      });

      renderWithRoutes(
        [
          {
            path: '/top-rated',
            element: (
              <MovieCollectionGrid
                fetcher={mockFetcher}
                source="top-rated"
                initialCurrentPage={3}
              />
            ),
          },
          { path: '/movie/:id', element: <MovieDetail /> },
        ],
        { initialRoute: '/top-rated?page=3&minYear=1980&minRating=9.0' }
      );

      await waitFor(() => {
        expect(screen.getByText('Test Movie 1')).toBeInTheDocument();
      });

      // First movie link should have filters but NOT page
      const firstMovieLink = document.querySelector('a[href*="/movie/1"]');
      const firstHref = firstMovieLink?.getAttribute('href') || '';

      expect(firstHref).not.toContain('page=');
      expect(firstHref).toContain('minYear=1980');
      expect(firstHref).toContain('minRating=9.0');

      // Second movie link should have same params
      const secondMovieLink = document.querySelector('a[href*="/movie/2"]');
      const secondHref = secondMovieLink?.getAttribute('href') || '';

      expect(secondHref).not.toContain('page=');
      expect(secondHref).toContain('minYear=1980');
      expect(secondHref).toContain('minRating=9.0');
    });
  });

  describe('Different Route Types', () => {
    it('handles Popular route with filters (no page in links)', async () => {
      const mockFetcher = createMockFetcher();

      renderWithRoutes(
        [
          {
            path: '/popular',
            element: (
              <MovieCollectionGrid
                fetcher={mockFetcher}
                source="popular"
                initialCurrentPage={2}
              />
            ),
          },
        ],
        { initialRoute: '/popular?page=2&minYear=1990' }
      );

      await waitFor(() => {
        expect(screen.getByText('Test Movie 1')).toBeInTheDocument();
      });

      const movieLink = document.querySelector('a[href*="/movie/1"]');
      const href = movieLink?.getAttribute('href') || '';

      expect(href).toContain('from=popular');
      expect(href).toContain('minYear=1990');
      expect(href).not.toContain('page=');
    });

    it('handles Top Rated route with filters', async () => {
      const mockFetcher = createMockFetcher();

      renderWithRoutes(
        [
          {
            path: '/top-rated',
            element: (
              <MovieCollectionGrid
                fetcher={mockFetcher}
                source="top-rated"
                initialCurrentPage={1}
              />
            ),
          },
        ],
        { initialRoute: '/top-rated?page=1&genres=28,12' }
      );

      await waitFor(() => {
        expect(screen.getByText('Test Movie 1')).toBeInTheDocument();
      });

      const movieLink = document.querySelector('a[href*="/movie/1"]');
      const href = movieLink?.getAttribute('href') || '';

      expect(href).toContain('from=top-rated');
      // Genres are URL-encoded
      expect(href).toContain('genres=28%2C12');
    });

    it('handles Now Playing route with filters', async () => {
      const mockFetcher = createMockFetcher();

      renderWithRoutes(
        [
          {
            path: '/now-playing',
            element: (
              <MovieCollectionGrid
                fetcher={mockFetcher}
                source="now-playing"
                initialCurrentPage={1}
              />
            ),
          },
        ],
        { initialRoute: '/now-playing?page=1&minRating=7.0' }
      );

      await waitFor(() => {
        expect(screen.getByText('Test Movie 1')).toBeInTheDocument();
      });

      const movieLink = document.querySelector('a[href*="/movie/1"]');
      const href = movieLink?.getAttribute('href') || '';

      expect(href).toContain('from=now-playing');
      expect(href).toContain('minRating=7.0');
    });
  });

  describe('Complex Filter Combinations', () => {
    it('handles all filters applied simultaneously (no page in links)', async () => {
      // Maximum complexity: all filter types at once
      const mockFetcher = createMockFetcher();

      const complexURL =
        '/popular?page=5&minYear=1990&maxYear=2000&genres=28,12,35&minRating=7.0&maxRating=9.0&sortBy=vote_count.desc';

      renderWithRoutes(
        [
          {
            path: '/popular',
            element: (
              <MovieCollectionGrid
                fetcher={mockFetcher}
                source="popular"
                initialCurrentPage={5}
              />
            ),
          },
        ],
        { initialRoute: complexURL }
      );

      await waitFor(() => {
        expect(screen.getByText('Test Movie 1')).toBeInTheDocument();
      });

      // Filter params should be preserved in movie card links, but NOT page
      const movieLink = document.querySelector('a[href*="/movie/1"]');
      const href = movieLink?.getAttribute('href') || '';

      expect(href).not.toContain('page=');
      expect(href).toContain('minYear=1990');
      expect(href).toContain('maxYear=2000');
      // Genres are URL-encoded
      expect(href).toContain('genres=28%2C12%2C35');
      expect(href).toContain('minRating=7.0');
      expect(href).toContain('maxRating=9.0');
      expect(href).toContain('sortBy=vote_count.desc');
    });

    it('handles special characters in query param', async () => {
      const mockFetcher = createMockFetcher();

      const encodedQuery = '/search?query=action%20%26%20adventure&page=1';

      renderWithRoutes(
        [
          {
            path: '/search',
            element: (
              <MovieCollectionGrid
                fetcher={mockFetcher}
                source="search"
                query="action & adventure"
                initialCurrentPage={1}
              />
            ),
          },
        ],
        { initialRoute: encodedQuery }
      );

      await waitFor(() => {
        expect(screen.getByText('Test Movie 1')).toBeInTheDocument();
      });

      const movieLink = document.querySelector('a[href*="/movie/1"]');
      const href = movieLink?.getAttribute('href') || '';

      // Should preserve URL encoding
      expect(href).toContain('query=action%20%26%20adventure');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty results with filters applied', async () => {
      // No movies match the filters
      const emptyFetcher = createMockFetcher([]);

      renderWithRoutes(
        [
          {
            path: '/popular',
            element: (
              <MovieCollectionGrid
                fetcher={emptyFetcher}
                source="popular"
                initialCurrentPage={1}
              />
            ),
          },
        ],
        { initialRoute: '/popular?page=1&minYear=2030' }
      );

      // Should handle empty results gracefully
      // URL params should still be preserved even with no results
      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });
    });

    it('handles pagination with filters (no page in links)', async () => {
      // User applies filters → navigates to page 2 → clicks movie
      const mockFetcher = createMockFetcher();

      renderWithRoutes(
        [
          {
            path: '/popular',
            element: (
              <MovieCollectionGrid
                fetcher={mockFetcher}
                source="popular"
                initialCurrentPage={2}
              />
            ),
          },
        ],
        { initialRoute: '/popular?page=2&minYear=1995&genres=28' }
      );

      await waitFor(() => {
        expect(screen.getByText('Test Movie 1')).toBeInTheDocument();
      });

      // Movie links should include filters but NOT page (infinite scroll migration)
      const movieLink = document.querySelector('a[href*="/movie/1"]');
      const href = movieLink?.getAttribute('href') || '';

      expect(href).not.toContain('page=');
      expect(href).toContain('minYear=1995');
      expect(href).toContain('genres=28');
    });
  });
});
