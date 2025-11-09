import { describe, it, expect } from 'vitest';
import { render, screen } from '@tests/helpers/test-renderer';
import MovieUserScore from '../MovieUserScore';

describe('MovieUserScore Component', () => {
  describe('TMDB rating only (default behavior)', () => {
    it('displays TMDB rating correctly (0-10 scale)', () => {
      render(<MovieUserScore score={7.2} />);

      // Look for the rating text (1 decimal place)
      expect(screen.getByText('7.2')).toBeInTheDocument();
    });

    it('shows correct tooltip for TMDB rating', () => {
      render(<MovieUserScore score={8.5} />);

      // Check the title attribute
      const badge = screen.getByText('8.5');
      expect(badge).toHaveAttribute('title', 'TMDB Rating');
    });

    it('handles edge case scores correctly', () => {
      // Test score of 0
      const { rerender } = render(<MovieUserScore score={0} />);
      expect(screen.getByText('0.0')).toBeInTheDocument();

      // Test score of 10
      rerender(<MovieUserScore score={10} />);
      expect(screen.getByText('10.0')).toBeInTheDocument();
    });
  });

  describe('User rating only mode', () => {
    it('shows only user rating when userRatingOnly is true', () => {
      render(
        <MovieUserScore
          score={7.5}
          userRating={9}
          userRatingOnly={true}
        />
      );

      // Should show user rating
      expect(screen.getByText('★ 9/10')).toBeInTheDocument();
      // Should NOT show TMDB rating
      expect(screen.queryByText('7.5')).not.toBeInTheDocument();
    });

    it('shows correct tooltip for user rating only', () => {
      render(
        <MovieUserScore
          score={6.0}
          userRating={8}
          userRatingOnly={true}
        />
      );

      const badge = screen.getByText('★ 8/10');
      expect(badge).toHaveAttribute('title', 'Your Rating');
    });

    it('falls back to TMDB when userRatingOnly is true but no userRating provided', () => {
      render(<MovieUserScore score={6.7} userRatingOnly={true} />);

      // Should show TMDB rating since no user rating provided
      expect(screen.getByText('6.7')).toBeInTheDocument();
    });
  });

  describe('Both TMDB and user ratings', () => {
    it('displays both ratings when user rating is provided', () => {
      render(<MovieUserScore score={8.1} userRating={7} />);

      // Both should be visible
      expect(screen.getByText('8.1')).toBeInTheDocument();
      expect(screen.getByText('★ 7')).toBeInTheDocument();
    });

    it('shows correct tooltips for both ratings', () => {
      render(<MovieUserScore score={6.5} userRating={8} />);

      const tmdbBadge = screen.getByText('6.5');
      const userBadge = screen.getByText('★ 8');

      expect(tmdbBadge).toHaveAttribute('title', 'TMDB Rating');
      expect(userBadge).toHaveAttribute('title', 'Your Rating');
    });
  });

  describe('Accessibility', () => {
    it('provides meaningful titles for screen readers', () => {
      render(<MovieUserScore score={7.8} userRating={9} />);

      // Check that both badges have title attributes
      expect(screen.getByTitle('TMDB Rating')).toBeInTheDocument();
      expect(screen.getByTitle('Your Rating')).toBeInTheDocument();
    });
  });

  describe('Edge cases and error handling', () => {
    it('handles decimal user ratings', () => {
      // Even though interface expects number, test robustness
      render(<MovieUserScore score={7.0} userRating={8.5} />);

      expect(screen.getByText('★ 8.5')).toBeInTheDocument();
    });

    it('handles very low scores', () => {
      render(<MovieUserScore score={0.1} />);
      expect(screen.getByText('0.1')).toBeInTheDocument();
    });

    it('handles very high scores', () => {
      render(<MovieUserScore score={9.99} />);
      expect(screen.getByText('10.0')).toBeInTheDocument();
    });
  });
});
