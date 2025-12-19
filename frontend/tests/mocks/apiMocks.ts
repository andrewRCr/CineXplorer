import { vi } from 'vitest';
import { mockPaginatedResponse, mockGenres } from './movieData';

// Mock fetch function
export const mockFetch = vi.fn();

// Common API response helpers
export const createMockApiResponse = <T>(data: T, status = 200) => ({
	ok: status >= 200 && status < 300,
	status,
	json: vi.fn().mockResolvedValue({ data }),
	text: vi.fn().mockResolvedValue(JSON.stringify({ data })),
});

// Mock movie service functions
export const mockMovieService = {
	fetchNowPlaying: vi.fn().mockResolvedValue(createMockApiResponse(mockPaginatedResponse)),
	fetchUpcoming: vi.fn().mockResolvedValue(createMockApiResponse(mockPaginatedResponse)),
	fetchTopRated: vi.fn().mockResolvedValue(createMockApiResponse(mockPaginatedResponse)),
	fetchPopular: vi.fn().mockResolvedValue(createMockApiResponse(mockPaginatedResponse)),
	fetchSearchResults: vi.fn().mockResolvedValue(createMockApiResponse(mockPaginatedResponse)),
	fetchMovieDetails: vi.fn().mockResolvedValue(createMockApiResponse({
		id: 1,
		title: 'Test Movie Details',
		overview: 'Detailed test movie',
		// Add more detail fields as needed
	})),
	fetchGenres: vi.fn().mockResolvedValue(createMockApiResponse({ genres: mockGenres })),
};

// Mock hooks
export const mockUseMovieCollectionState = {
	filters: {
		genre: '',
		year: '',
		rating: '',
		runtime: '',
		sort_by: 'popularity.desc',
		query: '',
	},
	currentPage: 1,
	hasActiveFilters: false,
	hasActiveAdvancedFilters: false,
	filterCount: 0,
	handleFiltersChange: vi.fn(),
	handlePageChange: vi.fn(),
	clearFilters: vi.fn(),
	resetToDefaults: vi.fn(),
};

// Mock router hooks
export const mockUseLocation = {
	pathname: '/popular',
	search: '',
	hash: '',
	state: null,
	key: 'default',
};

export const mockUseNavigate = vi.fn();

// Reset all mocks helper
export const resetAllMocks = () => {
	vi.clearAllMocks();
	Object.values(mockMovieService).forEach(mock => mock.mockClear());
};