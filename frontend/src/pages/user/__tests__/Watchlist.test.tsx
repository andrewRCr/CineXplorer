/**
 * Tests for Watchlist page component
 *
 * This page displays the user's watchlist movies using the userMovieService
 * (movie-first pattern with enrichment).
 *
 * Test Coverage:
 * - Data fetching on mount
 * - Movie list display with user data
 * - Empty state handling
 * - Loading states
 */

import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { Provider as ChakraProvider } from '../../../components/core/chakra/provider';
import Watchlist from '../Watchlist';
import * as userMovieService from '../../../services/userMovieService';
import type { MovieListItem, PaginatedMoviesResponse } from '@/@types/movie.d';

// Helper to wrap component with Router and ChakraProvider
function renderWithProviders(component: React.ReactElement) {
  return render(
    <ChakraProvider>
      <BrowserRouter>{component}</BrowserRouter>
    </ChakraProvider>
  );
}

// Mock the userMovieService
vi.mock('../../../services/userMovieService', () => ({
  getUserMovies: vi.fn(),
}));

describe('Watchlist Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test: Fetches watchlist data on mount
   *
   * Scenario: Page loads
   * Expected: Calls getUserMovies with watchlist: true parameter
   */
  it('should fetch watchlist data on mount', async () => {
    // Arrange: Mock empty response
    const mockResponse: PaginatedMoviesResponse = {
      page: 1,
      total_pages: 0,
      total_results: 0,
      results: [],
    };

    vi.mocked(userMovieService.getUserMovies).mockReturnValue({
      request: Promise.resolve({ data: mockResponse }),
      cancel: () => {},
    });

    // Act: Render component
    renderWithProviders(<Watchlist />);

    // Assert: Should call service with watchlist filter
    await waitFor(() => {
      expect(userMovieService.getUserMovies).toHaveBeenCalledWith({
        watchlist: true,
      });
    });
  });

  /**
   * Test: Displays movie list when data present
   *
   * Scenario: User has movies on watchlist
   * Expected: Renders movie titles in a list
   */
  it('should display movie list when data is present', async () => {
    // Arrange: Mock response with movies
    const mockMovies: MovieListItem[] = [
      {
        tmdb_id: 550,
        title: 'Fight Club',
        poster_path: '/fight-club.jpg',
        release_date: '1999-10-15',
        vote_average: 8.4,
        user_movie_data: {
          id: 1,
          tmdb_id: 550,
          title: 'Fight Club',
          user_watched: false,
          user_on_watchlist: true,
          user_liked: false,
          user_rating: null,
          user_review: null,
        },
      },
      {
        tmdb_id: 13,
        title: 'Forrest Gump',
        poster_path: '/forrest-gump.jpg',
        release_date: '1994-07-06',
        vote_average: 8.8,
        user_movie_data: {
          id: 2,
          tmdb_id: 13,
          title: 'Forrest Gump',
          user_watched: true,
          user_on_watchlist: true,
          user_liked: true,
          user_rating: 9,
          user_review: 'Amazing movie!',
        },
      },
    ];

    const mockResponse: PaginatedMoviesResponse = {
      page: 1,
      total_pages: 1,
      total_results: 2,
      results: mockMovies,
    };

    vi.mocked(userMovieService.getUserMovies).mockReturnValue({
      request: Promise.resolve({ data: mockResponse }),
      cancel: () => {},
    });

    // Act: Render component
    renderWithProviders(<Watchlist />);

    // Assert: Should display both movie titles
    await waitFor(() => {
      expect(screen.getByText('Fight Club')).toBeInTheDocument();
      expect(screen.getByText('Forrest Gump')).toBeInTheDocument();
    });
  });

  /**
   * Test: Shows empty state when no movies
   *
   * Scenario: User has empty watchlist
   * Expected: Displays "No movies on watchlist" message
   */
  it('should show empty state when no movies on watchlist', async () => {
    // Arrange: Mock empty response
    const mockResponse: PaginatedMoviesResponse = {
      page: 1,
      total_pages: 0,
      total_results: 0,
      results: [],
    };

    vi.mocked(userMovieService.getUserMovies).mockReturnValue({
      request: Promise.resolve({ data: mockResponse }),
      cancel: () => {},
    });

    // Act: Render component
    renderWithProviders(<Watchlist />);

    // Assert: Should show empty state message
    await waitFor(() => {
      expect(screen.getByText('No movies on watchlist')).toBeInTheDocument();
    });
  });

  /**
   * Test: Shows loading state while fetching
   *
   * Scenario: Data is being fetched
   * Expected: Displays loading indicator
   */
  it('should show loading state while fetching data', () => {
    // Arrange: Mock pending promise (never resolves during test)
    vi.mocked(userMovieService.getUserMovies).mockReturnValue({
      request: new Promise(() => {}), // Never resolves
      cancel: () => {},
    });

    // Act: Render component
    renderWithProviders(<Watchlist />);

    // Assert: Should show loading state
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
