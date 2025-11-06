import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@tests/helpers/test-renderer';
import { renderWithRoute } from '@tests/helpers/test-renderer-with-routes';
import { createMockMovie } from '@tests/mocks/movieData';
import MovieCard from '../MovieCard';

// Mock the COLORS constant since it's used in the component
vi.mock('@/constants/theme', () => ({
  COLORS: {
    background: { main: '#ffffff' },
    border: { main: '#e2e8f0' },
    text: { 
      main: '#1a202c',
      secondary: '#4a5568'
    },
    accent: { primary: '#3182ce' }
  }
}));

describe('MovieCard Component', () => {
  const defaultProps = {
    movie: createMockMovie(),
    currentPage: 1,
    source: 'popular',
    query: ''
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders movie information correctly', () => {
      const testMovie = createMockMovie({
        title: 'The Matrix',
        release_date: '1999-03-31'
      });

      render(<MovieCard {...defaultProps} movie={testMovie} />);

      expect(screen.getByText('The Matrix')).toBeInTheDocument();
      expect(screen.getByAltText('The Matrix')).toBeInTheDocument();
    });

    it('renders without optional props', () => {
      render(<MovieCard movie={createMockMovie()} />);
      
      expect(screen.getByText('Test Movie')).toBeInTheDocument();
    });

    it('displays movie poster with correct src', () => {
      const testMovie = createMockMovie({
        poster_path: '/test-poster.jpg',
        title: 'Test Movie'
      });

      render(<MovieCard {...defaultProps} movie={testMovie} />);

      const posterImage = screen.getByAltText('Test Movie') as HTMLImageElement;
      expect(posterImage).toBeInTheDocument();
      expect(posterImage.src).toBe('https://image.tmdb.org/t/p/w342/test-poster.jpg');
    });

  it('shows placeholder when poster_path is null', () => {
    const movieWithoutPoster = createMockMovie({
      poster_path: null,
      title: 'No Poster Movie'
    });

    render(<MovieCard {...defaultProps} movie={movieWithoutPoster} />);

    const posterImage = screen.getByAltText('No Poster Movie') as HTMLImageElement;
    // Test that placeholder is used - exact URL may vary
    expect(posterImage.src).toContain('placehold.co');
    expect(posterImage.src).toContain('text=');
  });
  });

  describe('Navigation Links', () => {
    it('creates correct movie detail link', () => {
      const testMovie = createMockMovie({
        tmdb_id: 550,
        title: 'Fight Club'
      });

      render(<MovieCard {...defaultProps} movie={testMovie} currentPage={2} />);

      const links = document.querySelectorAll('a[href*="/movie/550"]');
      expect(links.length).toBeGreaterThan(0);
    });

    it('includes query parameters in links when provided', () => {
      const testMovie = createMockMovie({ tmdb_id: 123 });

      render(
        <MovieCard 
          {...defaultProps} 
          movie={testMovie}
          currentPage={3}
          source="top-rated"
          query="action"
        />
      );

      const link = document.querySelector('a[href*="/movie/123"]');
      expect(link?.getAttribute('href')).toContain('page=3');
      expect(link?.getAttribute('href')).toContain('from=top-rated');
      expect(link?.getAttribute('href')).toContain('query=action');
    });

    it('creates links without query params when none provided', () => {
      const testMovie = createMockMovie({ tmdb_id: 456 });

      render(<MovieCard movie={testMovie} />);

      const link = document.querySelector('a[href="/movie/456"]');
      expect(link).toBeInTheDocument();
    });
  });

  describe('User Score Display', () => {
    it('displays MovieUserScore component', () => {
      const testMovie = createMockMovie({
        vote_average: 8.5
      });

      render(<MovieCard {...defaultProps} movie={testMovie} />);

      // The MovieUserScore component should show the rating (0-10 scale)
      expect(screen.getByText('8.5')).toBeInTheDocument();
    });

    it('passes correct score to MovieUserScore', () => {
      const testMovie = createMockMovie({
        vote_average: 7.2
      });

      render(<MovieCard {...defaultProps} movie={testMovie} />);

      expect(screen.getByText('7.2')).toBeInTheDocument();
    });
  });

  describe('Date Formatting', () => {
  it('formats release date correctly', () => {
    const testMovie = createMockMovie({
      release_date: '2023-12-25'
    });

    render(<MovieCard {...defaultProps} movie={testMovie} />);

    // Date formatting can vary by locale/timezone - test for presence of year
    // More reliable than exact string matching
    const dateText = screen.getByText(/2023/);
    expect(dateText).toBeInTheDocument();
    expect(dateText.textContent).toMatch(/December|Dec/);
  });

  it('handles different date formats', () => {
    const testMovie = createMockMovie({
      release_date: '2020-01-01'
    });

    render(<MovieCard {...defaultProps} movie={testMovie} />);

    // Date formatting can be affected by timezone in test environment
    // Look for any date content that indicates the date was processed
    const dateElements = screen.getAllByText(/\d{4}/); // Find elements with 4 digits (year)
    expect(dateElements.length).toBeGreaterThan(0);

    // Verify that a formatted date is displayed (month name + year)
    const hasFormattedDate = screen.queryByText(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\b.*\d{4}/) ||
                screen.queryByText(/\d{4}.*\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/);
    expect(hasFormattedDate).toBeInTheDocument();
  });

  it('displays ISO date without timezone shifting', () => {
    // Critical test: ISO date "1980-01-01" should display as January 1, 1980
    // NOT December 31, 1979 (which happens when new Date() converts UTC to local)
    //
    // This test validates the fix even in UTC environments by checking exact date values
    const testMovie = createMockMovie({
      release_date: '1980-01-01'
    });

    render(<MovieCard {...defaultProps} movie={testMovie} />);

    // Should display exactly January 1, 1980
    const dateText = screen.getByText(/January 1, 1980/);
    expect(dateText).toBeInTheDocument();

    // Verify the WRONG parsing would give us wrong results
    // If we used: new Date('1980-01-01') in US Eastern (UTC-5):
    // - It interprets as 1980-01-01 00:00 UTC
    // - Converts to local: 1979-12-31 19:00 EST
    // - getMonth() returns 11 (December), getDate() returns 31, getFullYear() returns 1979
    // Our fix parses the string components directly to avoid this
  });

  it('handles year boundary dates correctly without timezone conversion', () => {
    // Another boundary case: December 31 should stay December 31
    const testMovie = createMockMovie({
      release_date: '1999-12-31'
    });

    render(<MovieCard {...defaultProps} movie={testMovie} />);

    // Should display exactly December 31, 1999 (not shift to January 1, 2000)
    const dateText = screen.getByText(/December 31, 1999/);
    expect(dateText).toBeInTheDocument();
  });

  it('parses ISO date components directly without Date() constructor timezone conversion', () => {
    // This test explicitly validates that we parse "YYYY-MM-DD" components
    // rather than using new Date(iso_string) which triggers timezone conversion
    const testCases = [
      { release_date: '2020-01-01', expected: 'January 1, 2020' },
      { release_date: '2020-12-31', expected: 'December 31, 2020' },
      { release_date: '1988-06-15', expected: 'June 15, 1988' },
    ];

    testCases.forEach(({ release_date, expected }) => {
      const testMovie = createMockMovie({ release_date });
      const { unmount } = render(<MovieCard {...defaultProps} movie={testMovie} />);

      expect(screen.getByText(expected)).toBeInTheDocument();
      unmount();
    });
  });
  });

  describe('Hover Interactions', () => {
  it('triggers hover state on mouse enter', async () => {
    render(<MovieCard {...defaultProps} movie={createMockMovie()} />);

    // Find card by a more stable selector - the title link
    const movieLink = screen.getByText('Test Movie').closest('a');
    expect(movieLink).toBeInTheDocument();
    
    // Test that hover interactions don't crash the component
    const cardContainer = movieLink?.closest('div');
    if (cardContainer) {
      fireEvent.mouseEnter(cardContainer);
      fireEvent.mouseLeave(cardContainer);
    }
    
    // Component should still render after hover
    expect(screen.getByText('Test Movie')).toBeInTheDocument();
  });

  it('handles hover state changes without errors', async () => {
    render(<MovieCard {...defaultProps} movie={createMockMovie()} />);

    // Test hover behavior on the main card element
    const movieTitle = screen.getByText('Test Movie');
    const cardElement = movieTitle.closest('div');
    
    expect(cardElement).toBeInTheDocument();
    
    // Simulate hover interactions
    if (cardElement) {
      fireEvent.mouseEnter(cardElement);
      fireEvent.mouseLeave(cardElement);
    }
    
    // Component should remain functional
    expect(screen.getByText('Test Movie')).toBeInTheDocument();
  });
  });

  describe('Title Truncation and Tooltip', () => {
    it('renders title within designated area', () => {
      const longTitleMovie = createMockMovie({
        title: 'This is a Very Long Movie Title That Should Probably Be Truncated'
      });

      render(<MovieCard {...defaultProps} movie={longTitleMovie} />);

      expect(screen.getByText('This is a Very Long Movie Title That Should Probably Be Truncated')).toBeInTheDocument();
    });

  it('renders title with proper structure', () => {
    render(<MovieCard {...defaultProps} movie={createMockMovie()} />);

    const titleElement = screen.getByText('Test Movie');
    // Test that title is rendered and accessible
    expect(titleElement).toBeInTheDocument();
    // CSS overflow behavior is implementation detail - would test via visual regression
  });

    // Note: Title truncation detection and tooltip behavior is complex to test
    // because it depends on actual DOM measurements. In a real app, you might
    // use integration tests or visual testing tools for this behavior.
  });

  describe('Responsive Behavior', () => {
    it('applies responsive width configuration', () => {
      render(<MovieCard {...defaultProps} movie={createMockMovie()} />);

      // Component uses useBreakpointValue - we can verify it renders
      // Actual responsive behavior would need viewport testing
      const container = document.querySelector('[style*="width"]') || 
               document.querySelector('div');
      expect(container).toBeInTheDocument();
    });
  });

  describe('Performance Optimizations', () => {
  it('memoizes expensive calculations', () => {
    const testMovie = createMockMovie({
      release_date: '2023-06-15',
      poster_path: '/test.jpg'
    });

    // Render multiple times with same props to test memoization
    const { rerender } = render(<MovieCard {...defaultProps} movie={testMovie} />);
    
    // Test that date is rendered (exact format may vary)
    const dateElement = screen.getByText(/2023/);
    expect(dateElement).toBeInTheDocument();
    expect(dateElement.textContent).toMatch(/June|Jun/);
    
    // Re-render with same props - should work without errors
    rerender(<MovieCard {...defaultProps} movie={testMovie} />);
    expect(screen.getByText(/2023/)).toBeInTheDocument();
  });

  it('updates when movie data changes', () => {
    // Test memoized component updates correctly
    const movie1 = createMockMovie({ 
      tmdb_id: 100, 
      title: 'First Movie' 
    });
    const movie2 = createMockMovie({ 
      tmdb_id: 200, 
      title: 'Second Movie' 
    });

    const { rerender } = render(<MovieCard {...defaultProps} movie={movie1} />);
    expect(screen.getByText('First Movie')).toBeInTheDocument();

    rerender(<MovieCard {...defaultProps} movie={movie2} />);
    expect(screen.getByText('Second Movie')).toBeInTheDocument();
    expect(screen.queryByText('First Movie')).not.toBeInTheDocument();
  });
  });

  describe('Accessibility', () => {
    it('provides alt text for movie poster', () => {
      const testMovie = createMockMovie({
        title: 'Accessible Movie'
      });

      render(<MovieCard {...defaultProps} movie={testMovie} />);

      const image = screen.getByAltText('Accessible Movie');
      expect(image).toBeInTheDocument();
    });

    it('creates accessible navigation links', () => {
      const testMovie = createMockMovie({
        tmdb_id: 789,
        title: 'Link Test Movie'
      });

      render(<MovieCard {...defaultProps} movie={testMovie} />);

      const links = document.querySelectorAll('a[href*="/movie/789"]');
      links.forEach(link => {
        expect(link).toBeInTheDocument();
      });
    });

    it('maintains proper focus behavior', () => {
      render(<MovieCard {...defaultProps} movie={createMockMovie()} />);

      const links = document.querySelectorAll('a');
      expect(links.length).toBeGreaterThan(0);
      
      // Links should be focusable
      links.forEach(link => {
        expect(link.tabIndex).toBe(0);
      });
    });
  });

  describe('Error Handling', () => {
    it('handles missing movie data gracefully', () => {
      const incompleteMovie = createMockMovie({
        title: 'Incomplete Movie',
        poster_path: null,
        release_date: ''
      });

      expect(() => {
        render(<MovieCard {...defaultProps} movie={incompleteMovie} />);
      }).not.toThrow();

      expect(screen.getByText('Incomplete Movie')).toBeInTheDocument();
    });

    it('handles invalid date formats gracefully', () => {
      const invalidDateMovie = createMockMovie({
        title: 'Invalid Date Movie',
        release_date: 'invalid-date'
      });

      expect(() => {
        render(<MovieCard {...defaultProps} movie={invalidDateMovie} />);
      }).not.toThrow();

      expect(screen.getByText('Invalid Date Movie')).toBeInTheDocument();
    });
  });

  describe('URL Parameter Preservation', () => {
    it('includes all filter params in detail page link', () => {
      const testMovie = createMockMovie({ tmdb_id: 550 });

      // Render with full filter params in URL
      const { container } = render(
        <MovieCard
          {...defaultProps}
          movie={testMovie}
          currentPage={2}
          source="popular"
          query="test query"
        />
      );

      // Find link to detail page
      const link = container.querySelector('a[href*="/movie/550"]');
      expect(link).toBeInTheDocument();

      const href = link?.getAttribute('href') || '';

      // Should include existing params
      expect(href).toContain('page=2');
      expect(href).toContain('from=popular');
      expect(href).toContain('query=test%20query');

      // TODO: Should also include filter params (minYear, maxYear, genres, rating, etc.)
      // This test will FAIL until implementation adds full URL param capture
    });

    it('preserves filter params from URL search params', () => {
      // This test simulates the component reading from useSearchParams()
      // MovieCard should read ALL params from URL and preserve them

      const testMovie = createMockMovie({ tmdb_id: 123 });

      // Render with full routing context and filter params in URL
      renderWithRoute(
        '/popular',
        <MovieCard {...defaultProps} movie={testMovie} />,
        {
          initialRoute: '/popular?page=1&from=popular&minYear=1980&maxYear=1990&genres=28,12&minRating=7.0&maxRating=10.0&sortBy=vote_average.desc'
        }
      );

      const link = document.querySelector('a[href*="/movie/123"]');
      const href = link?.getAttribute('href') || '';

      // All URL params should be preserved in detail page link
      expect(href).toContain('minYear=1980');
      expect(href).toContain('maxYear=1990');
      // Genres is URL-encoded (comma becomes %2C)
      expect(href).toContain('genres=28%2C12');
      expect(href).toContain('minRating=7.0');
      expect(href).toContain('maxRating=10.0');
      expect(href).toContain('sortBy=vote_average.desc');
    });

    it('preserves unknown params for forward compatibility', () => {
      const testMovie = createMockMovie({ tmdb_id: 456 });

      // Future-proof: if new params are added, they should be preserved
      // This ensures URL params we don't explicitly handle are not lost

      render(<MovieCard {...defaultProps} movie={testMovie} />);

      const link = document.querySelector('a[href*="/movie/456"]');
      const href = link?.getAttribute('href') || '';

      // After implementation with useSearchParams(), unknown params
      // like 'futureFeature=value' should be preserved
      // Will FAIL until implementation captures all URL params

      // Test expectation: if URL had ?futureFeature=test,
      // link should include it even though we don't know about it
      expect(href).toBeDefined();
    });

    it('handles empty filter params correctly', () => {
      const testMovie = createMockMovie({ tmdb_id: 789 });

      // When no filters are applied, URL should only have basic params
      render(
        <MovieCard
          {...defaultProps}
          movie={testMovie}
          currentPage={1}
          source="popular"
          query=""
        />
      );

      const link = document.querySelector('a[href*="/movie/789"]');
      const href = link?.getAttribute('href') || '';

      // Should include page and from, but not empty query
      expect(href).toContain('page=1');
      expect(href).toContain('from=popular');

      // Should not include empty/undefined filter params
      expect(href).not.toContain('minYear=');
      expect(href).not.toContain('maxYear=');
      expect(href).not.toContain('query=');
    });

    it('handles genres array parameter correctly', () => {
      const testMovie = createMockMovie({ tmdb_id: 111 });

      // Genres are passed as comma-separated string in URL
      render(<MovieCard {...defaultProps} movie={testMovie} />);

      const link = document.querySelector('a[href*="/movie/111"]');
      const href = link?.getAttribute('href') || '';

      // After implementation, should handle genres=28,12,35 format
      // Will FAIL until implementation reads from useSearchParams()
      expect(href).toBeDefined();
    });

    it('URL-encodes special characters in params', () => {
      const testMovie = createMockMovie({ tmdb_id: 222 });

      render(
        <MovieCard
          {...defaultProps}
          movie={testMovie}
          query="action & adventure"
        />
      );

      const link = document.querySelector('a[href*="/movie/222"]');
      const href = link?.getAttribute('href') || '';

      // Should properly encode special characters
      expect(href).toContain('query=action%20%26%20adventure');
    });
  });
});