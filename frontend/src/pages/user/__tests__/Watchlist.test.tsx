import { HttpResponse, http } from "msw/http";
import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@tests/helpers/test-renderer";
import { server } from "@tests/mocks/server";
import { apiBaseUrl } from "@/config/baseUrls";
import type { MovieListResponseSchema } from "@/services/userMovieService";
import Watchlist from "../Watchlist";

const userMoviesUrl = `${apiBaseUrl}/user-movie-data/movies`;
const emptyWatchlist: MovieListResponseSchema = {
  page: 1,
  total_pages: 0,
  total_results: 0,
  results: [],
};

function expectPageTitle() {
  expect(
    screen.getByRole("heading", { level: 1, name: "My Watchlist" }),
  ).toBeVisible();
  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
}

describe("Watchlist Page", () => {
  it("requests the watchlist with a hundred stored cards per page", async () => {
    let query: URLSearchParams | undefined;
    server.use(
      http.get(userMoviesUrl, ({ request }) => {
        query = new URL(request.url).searchParams;
        return HttpResponse.json(emptyWatchlist);
      }),
    );
    render(<Watchlist />);
    await screen.findByText("No movies on watchlist");
    await waitFor(() => expect(query?.get("watchlist")).toBe("true"));
    expect(query?.get("page_size")).toBe("100");
  });

  it("displays watchlisted movies and excludes other movies", async () => {
    render(<Watchlist />);

    expect(await screen.findByText("Fight Club")).toBeInTheDocument();
    expectPageTitle();
    expect(screen.getByText("Forrest Gump")).toBeInTheDocument();
    expect(screen.queryByText("Already watched")).not.toBeInTheDocument();
  });

  it("shows the empty state when no movies are on the watchlist", async () => {
    server.use(
      http.get(userMoviesUrl, () => HttpResponse.json(emptyWatchlist)),
    );
    render(<Watchlist />);

    expect(
      await screen.findByText("No movies on watchlist"),
    ).toBeInTheDocument();
    expectPageTitle();
  });

  it("keeps the loading state until the request finishes", async () => {
    let finishRequest: (() => void) | undefined;
    const pending = new Promise<void>((resolve) => {
      finishRequest = resolve;
    });
    server.use(
      http.get(userMoviesUrl, async () => {
        await pending;
        return HttpResponse.json(emptyWatchlist);
      }),
    );
    render(<Watchlist />);

    expect(screen.getByText("Loading watchlist...")).toBeInTheDocument();
    expectPageTitle();
    finishRequest?.();
    expect(
      await screen.findByText("No movies on watchlist"),
    ).toBeInTheDocument();
    expectPageTitle();
  });

  it("shows an error when the request fails", async () => {
    server.use(
      http.get(userMoviesUrl, () =>
        HttpResponse.json({ detail: "Service unavailable" }, { status: 503 }),
      ),
    );
    render(<Watchlist />);

    expect(
      await screen.findByText("Error: Request failed with status code 503"),
    ).toBeInTheDocument();
    expectPageTitle();
  });
});
