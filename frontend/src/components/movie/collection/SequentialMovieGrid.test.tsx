import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { ChakraProvider } from "@chakra-ui/react";
import defaultSystem from "@/theme";
import SequentialMovieGrid from "./SequentialMovieGrid";
import { useInfiniteMovies } from "@/hooks/useInfiniteMovies";
import { useMovieCollectionContext } from "@/hooks/useMovieCollectionContext";
import { type MovieListItem, type PaginatedMoviesResponse } from "@/@types/movie";

// Mock the hooks
vi.mock("@/hooks/useInfiniteMovies");
vi.mock("@/hooks/useMovieCollectionContext");

// Mock child components to isolate grid logic
vi.mock("../MovieCard", () => ({
  default: ({ movie }: { movie: MovieListItem }) => (
    <div data-testid="movie-card">{movie.title}</div>
  ),
}));

vi.mock("../MovieCardContainer", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="movie-card-container">{children}</div>
  ),
}));

// Helper to render with provider
const renderWithProvider = (ui: React.ReactElement) => {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>);
};

// Helper to create mock page response
const createMockPage = (
  pageNum: number,
  movies: MovieListItem[],
  hasNext = true
): PaginatedMoviesResponse => ({
  page: pageNum,
  results: movies,
  total_pages: 10,
  total_results: 200,
  next_tmdb_page_start: hasNext ? (pageNum + 1) * 3 : null,
});

describe("SequentialMovieGrid", () => {
  const mockFetchNextPage = vi.fn();
  const mockRefetch = vi.fn();

  // Mock movies using MovieListItem shape
  // Note: Avoid "Page N" in titles - conflicts with page indicator regex tests
  const page1Movies: MovieListItem[] = [
    {
      tmdb_id: 1,
      title: "First Set Movie A",
      release_date: "2023-01-01",
      poster_path: "/path1.jpg",
      vote_average: 8.5,
      overview: "Overview 1",
      genre_ids: [28, 12],
      runtime: 120,
    },
    {
      tmdb_id: 2,
      title: "First Set Movie B",
      release_date: "2023-01-02",
      poster_path: "/path2.jpg",
      vote_average: 7.5,
      overview: "Overview 2",
      genre_ids: [35],
      runtime: 110,
    },
  ];

  const page2Movies: MovieListItem[] = [
    {
      tmdb_id: 3,
      title: "Second Set Movie A",
      release_date: "2023-02-01",
      poster_path: "/path3.jpg",
      vote_average: 9.0,
      overview: "Overview 3",
      genre_ids: [18],
      runtime: 140,
    },
    {
      tmdb_id: 4,
      title: "Second Set Movie B",
      release_date: "2023-02-02",
      poster_path: "/path4.jpg",
      vote_average: 6.5,
      overview: "Overview 4",
      genre_ids: [27],
      runtime: 95,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default context mock
    (useMovieCollectionContext as Mock).mockReturnValue({
      source: "discover",
      query: "",
      finalFetcher: vi.fn(),
      browseParams: {},
    });

    // Setup default hook mock - single page loaded
    (useInfiniteMovies as Mock).mockReturnValue({
      movies: page1Movies,
      pages: [createMockPage(1, page1Movies)],
      pageCount: 1,
      fetchNextPage: mockFetchNextPage,
      hasNextPage: true,
      isLoading: false,
      isFetching: false,
      isFetchingNextPage: false,
      error: null,
      isError: false,
      refetch: mockRefetch,
    });
  });

  describe("Initial load shows first page", () => {
    it("renders first page movies on mount", () => {
      renderWithProvider(<SequentialMovieGrid />);

      expect(screen.getAllByTestId("movie-card")).toHaveLength(2);
      expect(screen.getByText("First Set Movie A")).toBeInTheDocument();
      expect(screen.getByText("First Set Movie B")).toBeInTheDocument();
    });

    it("shows page indicator starting at page 1", () => {
      renderWithProvider(<SequentialMovieGrid />);

      expect(screen.getByText(/page 1/i)).toBeInTheDocument();
    });

    it("shows loading skeleton while fetching initial data", () => {
      (useInfiniteMovies as Mock).mockReturnValue({
        movies: [],
        pages: [],
        pageCount: 0,
        fetchNextPage: mockFetchNextPage,
        hasNextPage: true,
        isLoading: true,
        isFetching: true,
        isFetchingNextPage: false,
        error: null,
        isError: false,
        refetch: mockRefetch,
      });

      renderWithProvider(<SequentialMovieGrid />);

      const skeletons = screen.getAllByTestId("skeleton-loader");
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe("Next button fetches and shows next page", () => {
    it("calls fetchNextPage when clicking next and page not cached", async () => {
      // Single page loaded, but more available
      (useInfiniteMovies as Mock).mockReturnValue({
        movies: page1Movies,
        pages: [createMockPage(1, page1Movies)],
        pageCount: 1,
        fetchNextPage: mockFetchNextPage.mockResolvedValue(undefined),
        hasNextPage: true,
        isLoading: false,
        isFetching: false,
        isFetchingNextPage: false,
        error: null,
        isError: false,
        refetch: mockRefetch,
      });

      renderWithProvider(<SequentialMovieGrid />);

      const nextButton = screen.getByLabelText(/next page/i);
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(mockFetchNextPage).toHaveBeenCalledTimes(1);
      });
    });

    it("shows page 2 content after navigation", async () => {
      // Simulate two pages already cached
      (useInfiniteMovies as Mock).mockReturnValue({
        movies: [...page1Movies, ...page2Movies],
        pages: [
          createMockPage(1, page1Movies),
          createMockPage(2, page2Movies),
        ],
        pageCount: 2,
        fetchNextPage: mockFetchNextPage,
        hasNextPage: true,
        isLoading: false,
        isFetching: false,
        isFetchingNextPage: false,
        error: null,
        isError: false,
        refetch: mockRefetch,
      });

      renderWithProvider(<SequentialMovieGrid />);

      // Initially shows page 1
      expect(screen.getByText("First Set Movie A")).toBeInTheDocument();

      // Click next
      const nextButton = screen.getByLabelText(/next page/i);
      fireEvent.click(nextButton);

      // Should show page 2 movies (not page 1)
      await waitFor(() => {
        expect(screen.getByText("Second Set Movie A")).toBeInTheDocument();
      });
      expect(screen.queryByText("First Set Movie A")).not.toBeInTheDocument();
    });

    it("does not call fetchNextPage when page is already cached", async () => {
      // Two pages already cached
      (useInfiniteMovies as Mock).mockReturnValue({
        movies: [...page1Movies, ...page2Movies],
        pages: [
          createMockPage(1, page1Movies),
          createMockPage(2, page2Movies),
        ],
        pageCount: 2,
        fetchNextPage: mockFetchNextPage,
        hasNextPage: true,
        isLoading: false,
        isFetching: false,
        isFetchingNextPage: false,
        error: null,
        isError: false,
        refetch: mockRefetch,
      });

      renderWithProvider(<SequentialMovieGrid />);

      // Click next (page 2 is cached)
      const nextButton = screen.getByLabelText(/next page/i);
      fireEvent.click(nextButton);

      // Should NOT call fetchNextPage since page 2 is cached
      expect(mockFetchNextPage).not.toHaveBeenCalled();
    });
  });

  describe("Prev button shows previous page from cache", () => {
    it("prev button is disabled on first page", () => {
      renderWithProvider(<SequentialMovieGrid />);

      const prevButton = screen.getByLabelText(/previous page/i);
      expect(prevButton).toBeDisabled();
    });

    it("shows previous page content when clicking prev", async () => {
      // Two pages cached
      (useInfiniteMovies as Mock).mockReturnValue({
        movies: [...page1Movies, ...page2Movies],
        pages: [
          createMockPage(1, page1Movies),
          createMockPage(2, page2Movies),
        ],
        pageCount: 2,
        fetchNextPage: mockFetchNextPage,
        hasNextPage: false,
        isLoading: false,
        isFetching: false,
        isFetchingNextPage: false,
        error: null,
        isError: false,
        refetch: mockRefetch,
      });

      renderWithProvider(<SequentialMovieGrid />);

      // Navigate to page 2
      const nextButton = screen.getByLabelText(/next page/i);
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText("Second Set Movie A")).toBeInTheDocument();
      });

      // Navigate back to page 1
      const prevButton = screen.getByLabelText(/previous page/i);
      fireEvent.click(prevButton);

      await waitFor(() => {
        expect(screen.getByText("First Set Movie A")).toBeInTheDocument();
      });
      expect(screen.queryByText("Second Set Movie A")).not.toBeInTheDocument();
    });
  });

  describe("Handles variable page sizes gracefully", () => {
    it("displays whatever movies the API returns per page", () => {
      // Simulate variable page size (15 movies on page 1)
      const variableSizeMovies: MovieListItem[] = Array.from({ length: 15 }, (_, i) => ({
        tmdb_id: i + 1,
        title: `Variable Movie ${i + 1}`,
        release_date: "2023-01-01",
        poster_path: `/path${i + 1}.jpg`,
        vote_average: 7.0,
        overview: `Overview ${i + 1}`,
        genre_ids: [28],
        runtime: 100,
      }));

      (useInfiniteMovies as Mock).mockReturnValue({
        movies: variableSizeMovies,
        pages: [createMockPage(1, variableSizeMovies)],
        pageCount: 1,
        fetchNextPage: mockFetchNextPage,
        hasNextPage: true,
        isLoading: false,
        isFetching: false,
        isFetchingNextPage: false,
        error: null,
        isError: false,
        refetch: mockRefetch,
      });

      renderWithProvider(<SequentialMovieGrid />);

      // Should show all 15 movies (not truncated to 20)
      expect(screen.getAllByTestId("movie-card")).toHaveLength(15);
    });
  });

  describe("Loading states during fetch", () => {
    it("disables navigation buttons while fetching", () => {
      (useInfiniteMovies as Mock).mockReturnValue({
        movies: page1Movies,
        pages: [createMockPage(1, page1Movies)],
        pageCount: 1,
        fetchNextPage: mockFetchNextPage,
        hasNextPage: true,
        isLoading: false,
        isFetching: true,
        isFetchingNextPage: true,
        error: null,
        isError: false,
        refetch: mockRefetch,
      });

      renderWithProvider(<SequentialMovieGrid />);

      const nextButton = screen.getByLabelText(/next page/i);
      expect(nextButton).toBeDisabled();
    });
  });

  describe("Empty and error states", () => {
    it("handles empty results state", () => {
      (useInfiniteMovies as Mock).mockReturnValue({
        movies: [],
        pages: [],
        pageCount: 0,
        fetchNextPage: mockFetchNextPage,
        hasNextPage: false,
        isLoading: false,
        isFetching: false,
        isFetchingNextPage: false,
        error: null,
        isError: false,
        refetch: mockRefetch,
      });

      renderWithProvider(<SequentialMovieGrid />);

      expect(screen.getByText(/no movies found/i)).toBeInTheDocument();
    });

    it("handles error state with retry option", () => {
      (useInfiniteMovies as Mock).mockReturnValue({
        movies: [],
        pages: [],
        pageCount: 0,
        fetchNextPage: mockFetchNextPage,
        hasNextPage: false,
        isLoading: false,
        isFetching: false,
        isFetchingNextPage: false,
        error: new Error("Network error"),
        isError: true,
        refetch: mockRefetch,
      });

      renderWithProvider(<SequentialMovieGrid />);

      expect(screen.getByText(/network error/i)).toBeInTheDocument();

      const retryButton = screen.getByRole("button", { name: /retry/i });
      fireEvent.click(retryButton);

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe("Page indicator", () => {
    it("shows + indicator when more pages are available", () => {
      (useInfiniteMovies as Mock).mockReturnValue({
        movies: page1Movies,
        pages: [createMockPage(1, page1Movies)],
        pageCount: 1,
        fetchNextPage: mockFetchNextPage,
        hasNextPage: true,
        isLoading: false,
        isFetching: false,
        isFetchingNextPage: false,
        error: null,
        isError: false,
        refetch: mockRefetch,
      });

      renderWithProvider(<SequentialMovieGrid />);

      // Should show "Page 1 of 1+" when more pages available
      expect(screen.getByText(/page 1 of 1\+/i)).toBeInTheDocument();
    });

    it("shows final page count when no more pages", () => {
      (useInfiniteMovies as Mock).mockReturnValue({
        movies: [...page1Movies, ...page2Movies],
        pages: [
          createMockPage(1, page1Movies),
          createMockPage(2, page2Movies, false),
        ],
        pageCount: 2,
        fetchNextPage: mockFetchNextPage,
        hasNextPage: false,
        isLoading: false,
        isFetching: false,
        isFetchingNextPage: false,
        error: null,
        isError: false,
        refetch: mockRefetch,
      });

      renderWithProvider(<SequentialMovieGrid />);

      // Should show "Page 1 of 2" (no + since hasNextPage is false)
      expect(screen.getByText(/page 1 of 2$/i)).toBeInTheDocument();
    });
  });
});
