import { type ReactElement } from 'react';
import { describe, it, expect } from 'vitest';
import { isInaccessible, render as renderWithoutProviders, within } from '@testing-library/react';
import { ChakraProvider, createSystem } from '@chakra-ui/react';
import { render, screen } from '@tests/helpers/test-renderer';
import { defaultSystem as projectSystem } from '@/theme';
import MovieUserScore from '../MovieUserScore';

// The shared renderer uses Chakra's own system, which lacks the project badge recipe, and jsdom skips styles
// inside CSS @layer blocks. Variant checks therefore render under a layer-free copy of the project system.
const badgeStyleSystem = createSystem(projectSystem._config, { disableLayers: true });

const renderWithBadgeStyles = (ui: ReactElement) =>
  renderWithoutProviders(<ChakraProvider value={badgeStyleSystem}>{ui}</ChakraProvider>);

const variantBackgrounds = {
  neutral: 'var(--chakra-colors-badge)',
  success: 'var(--chakra-colors-success)',
  warning: 'var(--chakra-colors-warning)',
  error: 'var(--chakra-colors-destructive)',
} as const;

const expectBadgeVariant = (badge: HTMLElement, variant: keyof typeof variantBackgrounds) => {
  expect(badge).toHaveStyle({ background: variantBackgrounds[variant] });
};

describe('MovieUserScore Component', () => {
  describe('TMDB rating only (default behavior)', () => {
    it('displays TMDB rating correctly (0-10 scale)', () => {
      render(<MovieUserScore score={7.2} voteCount={1500} />);

      // Look for the rating text (1 decimal place)
      expect(screen.getByText('7.2')).toBeInTheDocument();
    });

    it('shows correct tooltip for TMDB rating', () => {
      render(<MovieUserScore score={8.5} voteCount={1500} />);

      // Check the title attribute
      const badge = screen.getByText('8.5');
      expect(badge).toHaveAttribute('title', 'TMDB Rating');
    });

    it('displays the maximum score to one decimal', () => {
      render(<MovieUserScore score={10} voteCount={1500} />);
      expect(screen.getByText('10.0')).toBeInTheDocument();
    });
  });

  describe('TMDB score with 10 or more votes', () => {
    const thresholdCases = (['compact', 'detailed'] as const).flatMap((presentation) => [
      { presentation, score: 7.5, label: '7.5', variant: 'success' as const },
      { presentation, score: 7.4, label: '7.4', variant: 'warning' as const },
      { presentation, score: 5.0, label: '5.0', variant: 'warning' as const },
      { presentation, score: 4.9, label: '4.9', variant: 'error' as const },
    ]);

    it.each(thresholdCases)(
      'shows $label as $variant in the $presentation presentation',
      ({ presentation, score, label, variant }) => {
        renderWithBadgeStyles(<MovieUserScore score={score} voteCount={1500} presentation={presentation} />);

        const badge = screen.getByText(label);
        expectBadgeVariant(badge, variant);
        expect(badge).toHaveAttribute('title', 'TMDB Rating');
      }
    );

    it.each(['compact', 'detailed'] as const)('scores normally at exactly 10 votes (%s)', (presentation) => {
      renderWithBadgeStyles(<MovieUserScore score={8.1} voteCount={10} presentation={presentation} />);

      expectBadgeVariant(screen.getByText('8.1'), 'success');
    });
  });

  describe('TMDB score with no votes', () => {
    const zeroVoteCases = [
      { label: 'vote count 0', score: 7.2, voteCount: 0 },
      { label: 'vote count null', score: 7.2, voteCount: null },
      { label: 'vote count undefined', score: 7.2, voteCount: undefined },
      { label: 'average null', score: null, voteCount: 1500 },
      { label: 'average undefined', score: undefined, voteCount: 1500 },
    ];

    it.each(zeroVoteCases)('shows a neutral "—" in the compact presentation ($label)', ({ score, voteCount }) => {
      renderWithBadgeStyles(<MovieUserScore score={score} voteCount={voteCount} />);

      const badge = screen.getByText('—');
      expectBadgeVariant(badge, 'neutral');
      expect(badge).toHaveAttribute('title', 'No TMDB votes yet');
    });

    it.each(zeroVoteCases)(
      'shows a neutral "Not yet rated" in the detailed presentation ($label)',
      ({ score, voteCount }) => {
        renderWithBadgeStyles(<MovieUserScore score={score} voteCount={voteCount} presentation="detailed" />);

        const badge = screen.getByText('Not yet rated');
        expectBadgeVariant(badge, 'neutral');
        expect(badge).toHaveAttribute('title', 'No TMDB votes yet');
      }
    );

    it('never renders "0.0" for TMDB\'s zero-vote average', () => {
      const { rerender } = renderWithBadgeStyles(<MovieUserScore score={0} voteCount={0} />);
      expect(screen.queryByText('0.0')).not.toBeInTheDocument();

      rerender(
        <ChakraProvider value={badgeStyleSystem}>
          <MovieUserScore score={0} voteCount={0} presentation="detailed" />
        </ChakraProvider>
      );
      expect(screen.queryByText('0.0')).not.toBeInTheDocument();
    });
  });

  describe('TMDB score with 1–9 votes', () => {
    it('shows a neutral "—" in the compact presentation', () => {
      renderWithBadgeStyles(<MovieUserScore score={6.8} voteCount={4} />);

      const badge = screen.getByText('—');
      expectBadgeVariant(badge, 'neutral');
      expect(badge).toHaveAttribute('title', 'Fewer than 10 TMDB votes');
      expect(screen.queryByText('6.8')).not.toBeInTheDocument();
    });

    it('shows the average with its vote count in the detailed presentation', () => {
      renderWithBadgeStyles(<MovieUserScore score={6.8} voteCount={4} presentation="detailed" />);

      const badge = screen.getByText('6.8 · 4 votes');
      expectBadgeVariant(badge, 'neutral');
      expect(badge).toHaveAttribute('title', 'TMDB Rating');
    });

    it('uses the singular for a single vote', () => {
      renderWithBadgeStyles(<MovieUserScore score={9} voteCount={1} presentation="detailed" />);

      expectBadgeVariant(screen.getByText('9.0 · 1 vote'), 'neutral');
    });

    it('keeps 9 votes below the threshold in both presentations', () => {
      const { unmount } = renderWithBadgeStyles(<MovieUserScore score={8.1} voteCount={9} />);
      expectBadgeVariant(screen.getByText('—'), 'neutral');
      unmount();

      renderWithBadgeStyles(<MovieUserScore score={8.1} voteCount={9} presentation="detailed" />);
      expectBadgeVariant(screen.getByText('8.1 · 9 votes'), 'neutral');
    });
  });

  describe('User rating beside a below-threshold TMDB score', () => {
    it('keeps the user badge unchanged while the TMDB badge shows the placeholder', () => {
      renderWithBadgeStyles(<MovieUserScore score={6.8} voteCount={4} userRating={9} />);

      const tmdbBadge = screen.getByText('—');
      expectBadgeVariant(tmdbBadge, 'neutral');
      expect(tmdbBadge).toHaveAttribute('title', 'Fewer than 10 TMDB votes');

      const userBadge = screen.getByText('★ 9');
      expectBadgeVariant(userBadge, 'success');
      expect(userBadge).toHaveAttribute('title', 'Your Rating');
    });

    it('applies the detailed presentation to the TMDB badge beside a user rating', () => {
      renderWithBadgeStyles(<MovieUserScore score={0} voteCount={0} userRating={4} presentation="detailed" />);

      expectBadgeVariant(screen.getByText('Not yet rated'), 'neutral');
      expectBadgeVariant(screen.getByText('★ 4'), 'error');
    });

    it('still hides the TMDB badge in user-rating-only mode', () => {
      renderWithBadgeStyles(<MovieUserScore score={6.8} voteCount={4} userRating={7} userRatingOnly={true} />);

      const userBadge = screen.getByText('★ 7/10');
      expectBadgeVariant(userBadge, 'warning');
      expect(userBadge).toHaveAttribute('title', 'Your Rating');
      expect(screen.queryByText('—')).not.toBeInTheDocument();
    });
  });

  describe('User rating only mode', () => {
    it('shows only user rating when userRatingOnly is true', () => {
      render(
        <MovieUserScore
          score={7.5}
          voteCount={1500}
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
          voteCount={1500}
          userRating={8}
          userRatingOnly={true}
        />
      );

      const badge = screen.getByText('★ 8/10');
      expect(badge).toHaveAttribute('title', 'Your Rating');
    });

    it('falls back to TMDB when userRatingOnly is true but no userRating provided', () => {
      render(<MovieUserScore score={6.7} voteCount={1500} userRatingOnly={true} />);

      // Should show TMDB rating since no user rating provided
      expect(screen.getByText('6.7')).toBeInTheDocument();
    });
  });

  describe('Both TMDB and user ratings', () => {
    it('displays both ratings when user rating is provided', () => {
      render(<MovieUserScore score={8.1} voteCount={1500} userRating={7} />);

      // Both should be visible
      expect(screen.getByText('8.1')).toBeInTheDocument();
      expect(screen.getByText('★ 7')).toBeInTheDocument();
    });

    it('shows correct tooltips for both ratings', () => {
      render(<MovieUserScore score={6.5} voteCount={1500} userRating={8} />);

      const tmdbBadge = screen.getByText('6.5');
      const userBadge = screen.getByText('★ 8');

      expect(tmdbBadge).toHaveAttribute('title', 'TMDB Rating');
      expect(userBadge).toHaveAttribute('title', 'Your Rating');
    });
  });

  describe('Accessibility', () => {
    const tmdbStates = [
      { presentation: 'compact' as const, score: 7.8, voteCount: 10, label: '7.8', explanation: 'TMDB Rating' },
      { presentation: 'detailed' as const, score: 7.8, voteCount: 10, label: '7.8', explanation: 'TMDB Rating' },
      { presentation: 'compact' as const, score: 0, voteCount: 0, label: '—', explanation: 'No TMDB votes yet' },
      { presentation: 'detailed' as const, score: 0, voteCount: 0, label: 'Not yet rated', explanation: 'No TMDB votes yet' },
      { presentation: 'compact' as const, score: 6.8, voteCount: 4, label: '—', explanation: 'Fewer than 10 TMDB votes' },
      { presentation: 'detailed' as const, score: 6.8, voteCount: 4, label: '6.8 · 4 votes', explanation: 'TMDB Rating' },
    ];

    const tmdbCases = tmdbStates.flatMap((state) => [
      { ...state, mode: 'alone', userRating: undefined },
      { ...state, mode: 'beside a user rating', userRating: 9 },
    ]);

    it.each(tmdbCases)(
      'exposes "$explanation" for "$label" in the $presentation presentation $mode',
      ({ presentation, score, voteCount, label, explanation, userRating }) => {
        renderWithBadgeStyles(
          <MovieUserScore score={score} voteCount={voteCount} presentation={presentation} userRating={userRating} />
        );

        const badge = screen.getByTitle(explanation);
        const explanationText = within(badge).getByText(`${explanation}:`);
        expect(isInaccessible(explanationText)).toBe(false);
        expect(explanationText).toHaveStyle({ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden' });
        expect(badge).toHaveTextContent(`${explanation}: ${label}`);
      }
    );

    it.each([false, true])('exposes the user-rating explanation (userRatingOnly=%s)', (userRatingOnly) => {
      renderWithBadgeStyles(
        <MovieUserScore score={7.8} voteCount={1500} userRating={9} userRatingOnly={userRatingOnly} />
      );

      const badge = screen.getByTitle('Your Rating');
      const explanationText = within(badge).getByText('Your Rating:');
      expect(isInaccessible(explanationText)).toBe(false);
      expect(explanationText).toHaveStyle({ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden' });
      expect(badge).toHaveTextContent(userRatingOnly ? 'Your Rating: ★ 9/10' : 'Your Rating: ★ 9');
    });
  });

  describe('Edge cases and error handling', () => {
    it('handles decimal user ratings', () => {
      // Even though interface expects number, test robustness
      render(<MovieUserScore score={7.0} voteCount={1500} userRating={8.5} />);

      expect(screen.getByText('★ 8.5')).toBeInTheDocument();
    });

    it('handles very low scores', () => {
      render(<MovieUserScore score={0.1} voteCount={1500} />);
      expect(screen.getByText('0.1')).toBeInTheDocument();
    });

    it('handles very high scores', () => {
      render(<MovieUserScore score={9.99} voteCount={1500} />);
      expect(screen.getByText('10.0')).toBeInTheDocument();
    });
  });
});
