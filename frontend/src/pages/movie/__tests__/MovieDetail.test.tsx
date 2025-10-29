import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@tests/helpers/test-renderer';
import { renderWithRoute } from '@tests/helpers/test-renderer-with-routes';
import MovieDetail from '../MovieDetail';
import { createMockMovie } from '@tests/mocks/movieData';
import type { Movie } from '@/types/movie';

// Mock the hooks and services
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

// Helper to render MovieDetail with router and URL params
const renderMovieDetailWithRoute = (movieId: string, searchParams: string = '') => {
	const initialRoute = `/movie/${movieId}${searchParams}`;

	return renderWithRoute(
		'/movie/:id',
		<MovieDetail />,
		{ initialRoute }
	);
};

describe('MovieDetail - Back Button URL Construction', () => {
	const mockMovie: Movie = createMockMovie({
		tmdb_id: 550,
		title: 'Fight Club',
		overview: 'An insomniac office worker...',
		release_date: '1999-10-15',
	});

	beforeEach(() => {
		vi.clearAllMocks();
		// Default mock: successful movie load - cast to match expected type
		vi.mocked(useMovieDetail).mockReturnValue({
			movie: mockMovie as unknown as import('@shared/index').Movie,
			error: '',
			setMovie: vi.fn(),
			setError: vi.fn(),
			isLoading: false,
		});
	});

	describe('Basic Back URL Construction', () => {
		it('reads all params from URL correctly', () => {
			const searchParams = '?page=2&from=popular&query=action';
			renderMovieDetailWithRoute('550', searchParams);

			// MovieDetail should read these from useSearchParams()
			// Currently reads: page, from, query
			// Should ALSO read: minYear, maxYear, genres, rating filters, etc.

			// Basic params should work (already implemented)
			const backButton = screen.getByText('Back to Results');
			expect(backButton).toBeInTheDocument();
		});

		it('constructs back URL with all filter params', async () => {
			// Full set of filter params that should be preserved
			const searchParams =
				'?page=3&from=top-rated&minYear=1980&maxYear=1990&genres=28,12&minRating=7.0&maxRating=10.0&sortBy=vote_average.desc';

			renderMovieDetailWithRoute('550', searchParams);

			await waitFor(() => {
				const backLink = screen.getByText('Back to Results').closest('a');
				expect(backLink).toBeInTheDocument();

				const href = backLink?.getAttribute('href') || '';

				// Currently implemented: page, from, query
				expect(href).toContain('page=3');
				expect(href).toContain('from=top-rated');

				// Should include all filter params (URL-encoded)
				expect(href).toContain('minYear=1980');
				expect(href).toContain('maxYear=1990');
				// Genres are URL-encoded (comma becomes %2C)
				expect(href).toContain('genres=28%2C12');
				expect(href).toContain('minRating=7.0');
				expect(href).toContain('maxRating=10.0');
				expect(href).toContain('sortBy=vote_average.desc');
			});
		});

		it('parses genres array correctly from URL', async () => {
			// Genres come as comma-separated string: "28,12,35"
			const searchParams = '?page=1&from=popular&genres=28,12,35';

			renderMovieDetailWithRoute('550', searchParams);

			await waitFor(() => {
				const backLink = screen.getByText('Back to Results').closest('a');
				const href = backLink?.getAttribute('href') || '';

				// Should preserve genres exactly as received (URL-encoded)
				expect(href).toContain('genres=28%2C12%2C35');
			});
		});

		it('matches original filtered page URL exactly', async () => {
			// The back URL should reconstruct the original collection page URL
			const originalURL = '?page=2&from=popular&minYear=1990&maxYear=2000&minRating=8.0';

			renderMovieDetailWithRoute('550', originalURL);

			await waitFor(() => {
				const backLink = screen.getByText('Back to Results').closest('a');
				const href = backLink?.getAttribute('href') || '';

				// Back URL should match the original (minus leading slash and route)
				// Expected: /popular?page=2&minYear=1990&maxYear=2000&minRating=8.0
				expect(href).toContain('/popular');
				expect(href).toContain('page=2');
				expect(href).toContain('minYear=1990');
				expect(href).toContain('maxYear=2000');
				expect(href).toContain('minRating=8.0');
			});
		});
	});

	describe('Search vs Collection Routes', () => {
		it('constructs search back URL correctly', async () => {
			const searchParams = '?page=1&from=search&query=inception';

			renderMovieDetailWithRoute('550', searchParams);

			await waitFor(() => {
				const backLink = screen.getByText('Back to Results').closest('a');
				const href = backLink?.getAttribute('href') || '';

				// Search route: /search?query=X&page=Y
				expect(href).toContain('/search');
				expect(href).toContain('query=inception');
				expect(href).toContain('page=1');
			});
		});

		it('constructs popular back URL correctly', async () => {
			const searchParams = '?page=2&from=popular';

			renderMovieDetailWithRoute('550', searchParams);

			await waitFor(() => {
				const backLink = screen.getByText('Back to Results').closest('a');
				const href = backLink?.getAttribute('href') || '';

				// Collection route: /popular?page=2
				expect(href).toContain('/popular');
				expect(href).toContain('page=2');
			});
		});

		it('constructs top-rated back URL correctly', async () => {
			const searchParams = '?page=1&from=top-rated';

			renderMovieDetailWithRoute('550', searchParams);

			await waitFor(() => {
				const backLink = screen.getByText('Back to Results').closest('a');
				const href = backLink?.getAttribute('href') || '';

				expect(href).toContain('/top-rated');
				expect(href).toContain('page=1');
			});
		});

		it('constructs now-playing back URL correctly', async () => {
			const searchParams = '?page=3&from=now-playing';

			renderMovieDetailWithRoute('550', searchParams);

			await waitFor(() => {
				const backLink = screen.getByText('Back to Results').closest('a');
				const href = backLink?.getAttribute('href') || '';

				expect(href).toContain('/now-playing');
				expect(href).toContain('page=3');
			});
		});

		it('constructs upcoming back URL correctly', async () => {
			const searchParams = '?page=1&from=upcoming';

			renderMovieDetailWithRoute('550', searchParams);

			await waitFor(() => {
				const backLink = screen.getByText('Back to Results').closest('a');
				const href = backLink?.getAttribute('href') || '';

				expect(href).toContain('/upcoming');
				expect(href).toContain('page=1');
			});
		});
	});

	describe('Filter Combinations', () => {
		it('handles year range filters', async () => {
			const searchParams = '?page=1&from=popular&minYear=1980&maxYear=1983';

			renderMovieDetailWithRoute('550', searchParams);

			await waitFor(() => {
				const backLink = screen.getByText('Back to Results').closest('a');
				const href = backLink?.getAttribute('href') || '';

				expect(href).toContain('minYear=1980');
				expect(href).toContain('maxYear=1983');
			});
		});

		it('handles rating filters', async () => {
			const searchParams = '?page=1&from=popular&minRating=7.0&maxRating=10.0';

			renderMovieDetailWithRoute('550', searchParams);

			await waitFor(() => {
				const backLink = screen.getByText('Back to Results').closest('a');
				const href = backLink?.getAttribute('href') || '';

				expect(href).toContain('minRating=7.0');
				expect(href).toContain('maxRating=10.0');
			});
		});

		it('handles runtime filters', async () => {
			const searchParams = '?page=1&from=popular&minRuntime=90&maxRuntime=120';

			renderMovieDetailWithRoute('550', searchParams);

			await waitFor(() => {
				const backLink = screen.getByText('Back to Results').closest('a');
				const href = backLink?.getAttribute('href') || '';

				expect(href).toContain('minRuntime=90');
				expect(href).toContain('maxRuntime=120');
			});
		});

		it('handles combined filters', async () => {
			// All filters applied at once
			const searchParams =
				'?page=2&from=popular&minYear=1990&maxYear=2000&genres=28,12&minRating=8.0&maxRating=10.0&minRuntime=90&maxRuntime=150&sortBy=vote_count.desc';

			renderMovieDetailWithRoute('550', searchParams);

			await waitFor(() => {
				const backLink = screen.getByText('Back to Results').closest('a');
				const href = backLink?.getAttribute('href') || '';

				// All filters should be preserved (URL-encoded)
				expect(href).toContain('page=2');
				expect(href).toContain('minYear=1990');
				expect(href).toContain('maxYear=2000');
				// Genres are URL-encoded
				expect(href).toContain('genres=28%2C12');
				expect(href).toContain('minRating=8.0');
				expect(href).toContain('maxRating=10.0');
				expect(href).toContain('minRuntime=90');
				expect(href).toContain('maxRuntime=150');
				expect(href).toContain('sortBy=vote_count.desc');
			});
		});

		it('handles search with filters', async () => {
			const searchParams =
				'?page=1&from=search&query=action&minYear=2000&genres=28&minRating=7.0';

			renderMovieDetailWithRoute('550', searchParams);

			await waitFor(() => {
				const backLink = screen.getByText('Back to Results').closest('a');
				const href = backLink?.getAttribute('href') || '';

				// Search URL with filters
				expect(href).toContain('/search');
				expect(href).toContain('query=action');
				expect(href).toContain('minYear=2000');
				expect(href).toContain('genres=28');
				expect(href).toContain('minRating=7.0');
			});
		});
	});

	describe('Edge Cases', () => {
		it('handles missing optional params gracefully', async () => {
			// Minimal params: just page and from
			const searchParams = '?page=1&from=popular';

			renderMovieDetailWithRoute('550', searchParams);

			await waitFor(() => {
				const backLink = screen.getByText('Back to Results').closest('a');
				const href = backLink?.getAttribute('href') || '';

				expect(href).toContain('/popular');
				expect(href).toContain('page=1');

				// Should not include undefined/null params
				expect(href).not.toContain('minYear=undefined');
				expect(href).not.toContain('query=null');
			});
		});

		it('defaults to now-playing when from param missing', async () => {
			// No 'from' param in URL
			const searchParams = '?page=1';

			renderMovieDetailWithRoute('550', searchParams);

			await waitFor(() => {
				const backLink = screen.getByText('Back to Results').closest('a');
				const href = backLink?.getAttribute('href') || '';

				// Should default to now-playing (current implementation behavior)
				expect(href).toContain('/now-playing');
			});
		});

		it('URL-encodes special characters in params', async () => {
			const searchParams = '?page=1&from=search&query=action%20%26%20adventure';

			renderMovieDetailWithRoute('550', searchParams);

			await waitFor(() => {
				const backLink = screen.getByText('Back to Results').closest('a');
				const href = backLink?.getAttribute('href') || '';

				// Should preserve URL encoding
				expect(href).toContain('query=action%20%26%20adventure');
			});
		});

		it('handles empty string params correctly', async () => {
			// Empty query param
			const searchParams = '?page=1&from=popular&query=';

			renderMovieDetailWithRoute('550', searchParams);

			await waitFor(() => {
				const backLink = screen.getByText('Back to Results').closest('a');
				const href = backLink?.getAttribute('href') || '';

				// Empty query should not be included in URL
				expect(href).not.toContain('query=');
			});
		});
	});

	describe('Loading and Error States', () => {
		it('shows back button even while loading', () => {
			vi.mocked(useMovieDetail).mockReturnValue({
				movie: undefined,
				error: '',
				setMovie: vi.fn(),
				setError: vi.fn(),
				isLoading: true,
			});

			renderMovieDetailWithRoute('550', '?page=2&from=popular');

			// Back button should be visible immediately
			expect(screen.getByText('Back to Results')).toBeInTheDocument();
		});

		it('shows back button on error', () => {
			vi.mocked(useMovieDetail).mockReturnValue({
				movie: undefined,
				error: 'Failed to load',
				setMovie: vi.fn(),
				setError: vi.fn(),
				isLoading: false,
			});

			renderMovieDetailWithRoute('550', '?page=2&from=popular');

			// Back button should still work on error
			expect(screen.getByText('Back to Results')).toBeInTheDocument();
		});
	});
});
