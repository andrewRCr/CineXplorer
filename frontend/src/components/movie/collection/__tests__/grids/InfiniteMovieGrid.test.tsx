import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import { ChakraProvider } from "@chakra-ui/react";
import defaultSystem from "@/theme";
import InfiniteMovieGrid from "../../InfiniteMovieGrid";
import { useInfiniteMovies } from "@/hooks/movie/useInfiniteMovies";
import { useMovieCollectionContext } from "@/hooks/movie/useMovieCollectionContext";
import { type MovieListItem } from "@/types/movie";

// Mock the hooks
vi.mock("@/hooks/movie/useInfiniteMovies");
vi.mock("@/hooks/movie/useMovieCollectionContext");

// Mock child components to isolate grid logic
vi.mock("../../../MovieCard", () => ({
  default: ({ movie }: { movie: MovieListItem }) => (
    <div data-testid="movie-card">{movie.title}</div>
  ),
}));

vi.mock("../../../MovieCardContainer", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="movie-card-container">{children}</div>
  ),
}));

// Mock IntersectionObserver
const mockObserve = vi.fn();
const mockDisconnect = vi.fn();
const mockIntersectionObserver = vi.fn();

// Helper to render with provider
const renderWithProvider = (ui: React.ReactElement) => {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>);
};

describe("InfiniteMovieGrid", () => {
  const mockFetchNextPage = vi.fn();
  const mockRefetch = vi.fn();

  // Mock movies using MovieListItem shape (genre_ids, not genres)
  const mockMovies: MovieListItem[] = [
    {
      tmdb_id: 1,
      title: "Movie 1",
      release_date: "2023-01-01",
      poster_path: "/path1.jpg",
      vote_average: 8.5,
      overview: "Overview 1",
      genre_ids: [28, 12],
      runtime: 120,
    },
    {
      tmdb_id: 2,
      title: "Movie 2",
      release_date: "2023-01-02",
      poster_path: "/path2.jpg",
      vote_average: 7.5,
      overview: "Overview 2",
      genre_ids: [35],
      runtime: 110,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Setup IntersectionObserver mock
    mockIntersectionObserver.mockReturnValue({
      observe: mockObserve,
      disconnect: mockDisconnect,
      unobserve: vi.fn(),
    });
    vi.stubGlobal("IntersectionObserver", mockIntersectionObserver);

    // Setup default context mock
    (useMovieCollectionContext as Mock).mockReturnValue({
      source: "discover",
      query: "",
      finalFetcher: vi.fn(),
    });

    // Setup default hook mock
    (useInfiniteMovies as Mock).mockReturnValue({
      movies: [],
      fetchNextPage: mockFetchNextPage,
      hasNextPage: false,
      isLoading: false,
      isFetching: false,
      isFetchingNextPage: false,
      error: null,
      isError: false,
      refetch: mockRefetch,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("renders initial movies on mount", () => {
    (useInfiniteMovies as Mock).mockReturnValue({
      movies: mockMovies,
      fetchNextPage: mockFetchNextPage,
      hasNextPage: true,
      isLoading: false,
      isFetching: false,
      isFetchingNextPage: false,
      error: null,
      isError: false,
      refetch: mockRefetch,
    });

    renderWithProvider(<InfiniteMovieGrid />);

    expect(screen.getAllByTestId("movie-card")).toHaveLength(2);
    expect(screen.getByText("Movie 1")).toBeInTheDocument();
    expect(screen.getByText("Movie 2")).toBeInTheDocument();
  });

  it("shows loading skeleton while fetching initial data", () => {
    (useInfiniteMovies as Mock).mockReturnValue({
      movies: [],
      fetchNextPage: mockFetchNextPage,
      hasNextPage: true,
      isLoading: true,
      isFetching: true,
      isFetchingNextPage: false,
      error: null,
      isError: false,
      refetch: mockRefetch,
    });

    renderWithProvider(<InfiniteMovieGrid />);

    const skeletons = screen.getAllByTestId("skeleton-loader");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("triggers fetchNextPage when scroll sentinel is visible (with debounce)", () => {
    (useInfiniteMovies as Mock).mockReturnValue({
      movies: mockMovies,
      fetchNextPage: mockFetchNextPage,
      hasNextPage: true,
      isLoading: false,
      isFetching: false,
      isFetchingNextPage: false,
      error: null,
      isError: false,
      refetch: mockRefetch,
    });

    renderWithProvider(<InfiniteMovieGrid />);

    // Verify observer was created
    expect(mockIntersectionObserver).toHaveBeenCalled();

    // Get the callback passed to IntersectionObserver
    const observerCallback = mockIntersectionObserver.mock.calls[0][0];

    // Simulate intersection
    const mockEntry = { isIntersecting: true };
    observerCallback([mockEntry]);

    // fetchNextPage should not be called immediately (debounced)
    expect(mockFetchNextPage).not.toHaveBeenCalled();

    // Fast-forward past debounce delay
    vi.advanceTimersByTime(150);

    expect(mockFetchNextPage).toHaveBeenCalledTimes(1);
  });

  it("shows loading indicator when fetching next page", () => {
    (useInfiniteMovies as Mock).mockReturnValue({
      movies: mockMovies,
      fetchNextPage: mockFetchNextPage,
      hasNextPage: true,
      isLoading: false,
      isFetching: true,
      isFetchingNextPage: true,
      error: null,
      isError: false,
      refetch: mockRefetch,
    });

    renderWithProvider(<InfiniteMovieGrid />);

    // Should show existing movies AND loading indicator at bottom
    expect(screen.getAllByTestId("movie-card")).toHaveLength(2);
    expect(screen.getByTestId("loading-more")).toBeInTheDocument();
  });

  it("shows 'end of results' when hasNextPage is false", () => {
    (useInfiniteMovies as Mock).mockReturnValue({
      movies: mockMovies,
      fetchNextPage: mockFetchNextPage,
      hasNextPage: false,
      isLoading: false,
      isFetching: false,
      isFetchingNextPage: false,
      error: null,
      isError: false,
      refetch: mockRefetch,
    });

    renderWithProvider(<InfiniteMovieGrid />);

    expect(screen.getByText(/no more results/i)).toBeInTheDocument();
    expect(screen.queryByTestId("loading-more")).not.toBeInTheDocument();
  });

  it("handles empty results state", () => {
    (useInfiniteMovies as Mock).mockReturnValue({
      movies: [],
      fetchNextPage: mockFetchNextPage,
      hasNextPage: false,
      isLoading: false,
      isFetching: false,
      isFetchingNextPage: false,
      error: null,
      isError: false,
      refetch: mockRefetch,
    });

    renderWithProvider(<InfiniteMovieGrid />);

    expect(screen.getByText(/no movies found/i)).toBeInTheDocument();
  });

  it("handles error state with retry option", () => {
    (useInfiniteMovies as Mock).mockReturnValue({
      movies: [],
      fetchNextPage: mockFetchNextPage,
      hasNextPage: false,
      isLoading: false,
      isFetching: false,
      isFetchingNextPage: false,
      error: new Error("Network error"),
      isError: true,
      refetch: mockRefetch,
    });

    renderWithProvider(<InfiniteMovieGrid />);

    expect(screen.getByText(/network error/i)).toBeInTheDocument();

    const retryButton = screen.getByRole("button", { name: /retry/i });
    fireEvent.click(retryButton);

    expect(mockRefetch).toHaveBeenCalled();
  });

  it("does not trigger fetch when already fetching next page", () => {
    (useInfiniteMovies as Mock).mockReturnValue({
      movies: mockMovies,
      fetchNextPage: mockFetchNextPage,
      hasNextPage: true,
      isLoading: false,
      isFetching: true,
      isFetchingNextPage: true, // Already fetching
      error: null,
      isError: false,
      refetch: mockRefetch,
    });

    renderWithProvider(<InfiniteMovieGrid />);

    // Get the callback passed to IntersectionObserver
    const observerCallback = mockIntersectionObserver.mock.calls[0][0];

    // Simulate intersection while already fetching
    const mockEntry = { isIntersecting: true };
    observerCallback([mockEntry]);

    // Fast-forward past debounce delay
    vi.advanceTimersByTime(150);

    // Should not trigger another fetch
    expect(mockFetchNextPage).not.toHaveBeenCalled();
  });
});
