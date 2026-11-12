import type { ReactNode } from "react";
import userEvent from "@testing-library/user-event";
import AuthContextProvider from "@/components/auth/AuthContextProvider";
import useAuthContext from "@/hooks/auth/useAuthContext";
import { useUserMovieState } from "@/hooks/movie/useUserMovieState";
import { setAuthTokens } from "@/utilities/tokenUtils";
import { authHandlers, clearBrowserAuth, token } from "@tests/helpers/auth";
import {
  createMockMovieListItem,
  createMockUserMovieData,
} from "@tests/mocks/movieData";
import { toaster } from "@/components/core/chakra/toaster";
import { HttpResponse, http } from "msw/http";
import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { act, render, screen, waitFor } from "@tests/helpers/test-renderer";
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

beforeEach(() => {
  clearBrowserAuth();
  authHandlers();
  setAuthTokens(token());
});
afterEach(() => {
  clearBrowserAuth();
  act(() => toaster.remove());
});
function AuthStatus() {
  return (
    <output aria-label="Sign-in status">{useAuthContext()?.status}</output>
  );
}
function renderWatchlist(extra?: ReactNode) {
  return render(
    <AuthContextProvider>
      <AuthStatus />
      <Watchlist />
      {extra}
    </AuthContextProvider>,
  );
}
function RemoveMovie() {
  const { save } = useUserMovieState(
    550,
    createMockUserMovieData({ tmdb_id: 550, user_on_watchlist: true }),
  );
  return (
    <button onClick={() => save({ user_on_watchlist: false })}>
      Remove saved movie
    </button>
  );
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
    renderWatchlist();
    await screen.findByText("No movies on watchlist");
    await waitFor(() => expect(query?.get("watchlist")).toBe("true"));
    expect(query?.get("page_size")).toBe("100");
  });

  it("displays watchlisted movies and excludes other movies", async () => {
    renderWatchlist();

    expect(await screen.findByText("Fight Club")).toBeInTheDocument();
    expect(screen.getByText("Forrest Gump")).toBeInTheDocument();
    expect(screen.queryByText("Already watched")).not.toBeInTheDocument();
  });

  it("shows the empty state when no movies are on the watchlist", async () => {
    server.use(
      http.get(userMoviesUrl, () => HttpResponse.json(emptyWatchlist)),
    );
    renderWatchlist();

    expect(
      await screen.findByText("No movies on watchlist"),
    ).toBeInTheDocument();
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
    renderWatchlist();

    expect(screen.getByText("Loading watchlist...")).toBeInTheDocument();
    finishRequest?.();
    expect(
      await screen.findByText("No movies on watchlist"),
    ).toBeInTheDocument();
  });

  it("shows an error when the request fails", async () => {
    server.use(
      http.get(userMoviesUrl, () =>
        HttpResponse.json({ detail: "Service unavailable" }, { status: 503 }),
      ),
    );
    renderWatchlist();

    expect(
      await screen.findByText("Error: Request failed with status code 503"),
    ).toBeInTheDocument();
  });
});

it("refetches the mounted watchlist after a save", async () => {
  let onWatchlist = true;
  let reads = 0;
  server.use(
    http.get(userMoviesUrl, () => {
      reads++;
      return HttpResponse.json(
        onWatchlist
          ? {
              page: 1,
              total_pages: 1,
              total_results: 1,
              results: [
                createMockMovieListItem({
                  tmdb_id: 550,
                  title: "Saved film",
                  user_movie_data: createMockUserMovieData({
                    tmdb_id: 550,
                    user_on_watchlist: true,
                  }),
                }),
              ],
            }
          : emptyWatchlist,
      );
    }),
    http.patch(`${apiBaseUrl}/user-movie-data/550`, () => {
      onWatchlist = false;
      return HttpResponse.json(createMockUserMovieData({ tmdb_id: 550 }));
    }),
  );
  const user = userEvent.setup();
  renderWatchlist(<RemoveMovie />);
  await screen.findByText("Saved film");
  await user.click(screen.getByRole("button", { name: "Remove saved movie" }));
  await screen.findByText("No movies on watchlist");
  expect(reads).toBe(2);
});
it("makes no Library request for a signed-out visitor", async () => {
  clearBrowserAuth();
  let reads = 0;
  server.use(
    http.get(userMoviesUrl, () => {
      reads++;
      return HttpResponse.json(emptyWatchlist);
    }),
  );
  renderWatchlist();
  await waitFor(() =>
    expect(screen.getByLabelText("Sign-in status")).toHaveTextContent(
      "anonymous",
    ),
  );
  expect(screen.getByText("No movies on watchlist")).toBeInTheDocument();
  expect(reads).toBe(0);
});
