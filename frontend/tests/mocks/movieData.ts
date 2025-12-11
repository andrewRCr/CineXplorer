import { type MovieListItem, type MovieDetail } from '@/@types/movie';

/**
 * Factory for creating mock movie list items (for grids, lists, cards).
 * Uses MovieListItem shape with genre_ids (not genres).
 */
export const createMockMovieListItem = (overrides: Partial<MovieListItem> = {}): MovieListItem => ({
	tmdb_id: 1,
	title: 'Test Movie',
	overview: 'A great test movie',
	poster_path: '/test-poster.jpg',
	release_date: '2024-01-01',
	vote_average: 8.2,
	vote_count: 1500,
	runtime: 120,
	genre_ids: [28, 12], // Action, Adventure
	...overrides,
});

/**
 * Factory for creating mock movie detail (for detail pages).
 * Uses MovieDetail shape with full genre objects.
 */
export const createMockMovieDetail = (overrides: Partial<MovieDetail> = {}): MovieDetail => ({
	tmdb_id: 1,
	title: 'Test Movie',
	overview: 'A great test movie',
	poster_path: '/test-poster.jpg',
	release_date: '2024-01-01',
	vote_average: 8.2,
	vote_count: 1500,
	runtime: 120,
	genre_ids: [28, 12],
	genres: [
		{ id: 28, name: 'Action' },
		{ id: 12, name: 'Adventure' },
	],
	cast: [],
	crew: [],
	production_companies: [],
	spoken_languages: [],
	us_certification: 'PG-13',
	...overrides,
});

/**
 * @deprecated Use createMockMovieListItem or createMockMovieDetail
 */
export const createMockMovie = createMockMovieListItem;

/**
 * Factory for creating multiple mock movie list items.
 */
export const createMockMovieListItems = (count: number = 5): MovieListItem[] => {
	return Array.from({ length: count }, (_, index) =>
		createMockMovieListItem({
			tmdb_id: index + 1,
			title: `Test Movie ${index + 1}`,
			overview: `Overview for test movie ${index + 1}`,
			vote_average: 6 + (index * 0.5),
		})
	);
};

/**
 * @deprecated Use createMockMovieListItems
 */
export const createMockMovies = createMockMovieListItems;

// Common movie filter mock data
export const mockMovieFilters = {
	genre: '',
	year: '',
	rating: '',
	runtime: '',
	sort_by: 'popularity.desc',
	query: '',
};

// Mock API responses
export const mockPaginatedResponse = {
	page: 1,
	results: createMockMovies(20),
	total_pages: 100,
	total_results: 2000,
};

// Mock genre data
export const mockGenres = [
	{ id: 28, name: 'Action' },
	{ id: 12, name: 'Adventure' },
	{ id: 16, name: 'Animation' },
	{ id: 35, name: 'Comedy' },
	{ id: 80, name: 'Crime' },
	{ id: 99, name: 'Documentary' },
	{ id: 18, name: 'Drama' },
];