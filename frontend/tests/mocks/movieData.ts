import { type Movie } from '@shared';

// Factory function for creating mock movie data
export const createMockMovie = (overrides: Partial<Movie> = {}): Movie => ({
	tmdb_id: 1,
	title: 'Test Movie',
	overview: 'A great test movie',
	poster_path: '/test-poster.jpg',
	backdrop_path: '/test-backdrop.jpg',
	release_date: '2024-01-01',
	adult: false,
	original_language: 'en',
	original_title: 'Test Movie',
	popularity: 7.8,
	video: false,
	vote_average: 8.2,
	vote_count: 1500,
	...overrides,
});

// Factory for creating multiple mock movies
export const createMockMovies = (count: number = 5): Movie[] => {
	return Array.from({ length: count }, (_, index) => 
		createMockMovie({
			tmdb_id: index + 1,
			title: `Test Movie ${index + 1}`,
			overview: `Overview for test movie ${index + 1}`,
			vote_average: 6 + (index * 0.5),
		})
	);
};

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