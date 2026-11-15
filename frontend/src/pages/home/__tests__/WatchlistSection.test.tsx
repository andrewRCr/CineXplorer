import { useQuery } from "@tanstack/react-query";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import {
  render,
  screen,
  within,
  act,
  waitFor,
} from "@tests/helpers/test-renderer";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { server } from "@tests/mocks/server";
import { gate } from "@tests/helpers/web-locks";
import { apiBaseUrl } from "@/config/baseUrls";
import { authHandlers, clearBrowserAuth, token } from "@tests/helpers/auth";
import { setAuthTokens } from "@/utilities/tokenUtils";
import {
  createMockMovieListItem,
  createMockMoviePage,
  createMockUserMovieData,
} from "@tests/mocks/movieData";
import AuthContextProvider from "@/components/auth/AuthContextProvider";
import {
  Toaster,
  toaster,
  priorityToaster,
} from "@/components/core/chakra/toaster";
import { WatchlistSection } from "@/pages/home/WatchlistSection";
import { PosterRowSection } from "@/components/movie/sections/PosterRowSection";
import { homeWindowQuery, homeWatchlistQuery } from "@/lib/queries";

const movie = (id: number, saved = true) =>
  createMockMovieListItem({
    tmdb_id: id,
    title: `Film ${id}`,
    user_movie_data: createMockUserMovieData({
      tmdb_id: id,
      user_on_watchlist: saved,
    }),
  });
beforeEach(() => {
  clearBrowserAuth();
  authHandlers();
  setAuthTokens(token());
  act(() => {
    toaster.remove();
    priorityToaster.remove();
  });
});
afterEach(() =>
  act(() => {
    toaster.remove();
    priorityToaster.remove();
  }),
);
it.each([1, 3])(
  "leads with the first film and shows only the rest in a row (%s films)",
  async (count) => {
    server.use(
      http.get(`${apiBaseUrl}/user-movie-data/movies`, ({ request }) => {
        const params = new URL(request.url).searchParams;
        expect(Object.fromEntries(params)).toEqual({
          watchlist: "true",
          page: "1",
          page_size: "20",
        });
        expect(request.headers.has("X-Pagination-Context")).toBe(false);
        return HttpResponse.json(
          createMockMoviePage(
            Array.from({ length: count }, (_, i) => movie(i + 1)),
          ),
        );
      }),
    );
    render(
      <AuthContextProvider>
        <ReadWatchlistSection />
      </AuthContextProvider>,
    );
    const region = await screen.findByRole("region", {
      name: "Your watchlist",
    });
    expect(
      await within(region).findByRole("heading", { level: 3, name: "Film 1" }),
    ).toBeInTheDocument();
    expect(
      within(region).getByRole("link", { name: "See all" }),
    ).toHaveAttribute("href", "/watchlist");
    if (count === 1) {
      expect(within(region).queryByRole("list")).not.toBeInTheDocument();
      expect(within(region).queryByRole("button")).not.toBeInTheDocument();
    } else
      expect(within(region).getAllByRole("listitem")).toHaveLength(count - 1);
  },
);
it("updates the leading film and removes saved films through real card saves", async () => {
  let ids = [1];
  server.use(
    http.get(`${apiBaseUrl}/user-movie-data/movies`, () =>
      HttpResponse.json(createMockMoviePage(ids.map((id) => movie(id)))),
    ),
    http.get(`${apiBaseUrl}/movies/now-playing`, () =>
      HttpResponse.json(createMockMoviePage([movie(2, false), movie(1)])),
    ),
    http.patch(
      `${apiBaseUrl}/user-movie-data/:id`,
      async ({ params, request }) => {
        const body = await request.json();
        const id = Number(params.id);
        const saved =
          typeof body === "object" &&
          body !== null &&
          "user_on_watchlist" in body &&
          body.user_on_watchlist === true;
        ids = saved
          ? [id, ...ids.filter((value) => value !== id)]
          : ids.filter((value) => value !== id);
        return HttpResponse.json(
          createMockUserMovieData({ tmdb_id: id, user_on_watchlist: saved }),
        );
      },
    ),
  );
  render(
    <AuthContextProvider>
      <ReadWatchlistSection />
      <PosterRowSection
        title="Theaters"
        query={homeWindowQuery("now-playing")}
      />
    </AuthContextProvider>,
  );
  await screen.findByRole("heading", { level: 3, name: "Film 1" });
  const theaters = screen.getByRole("region", { name: "Theaters" });
  const user = userEvent.setup();
  await user.click(
    await within(theaters).findByRole("button", { name: "Add to watchlist" }),
  );
  await screen.findByRole("heading", { level: 3, name: "Film 2" });
  const second = within(theaters).getAllByRole("button", {
    name: "Remove from watchlist",
  })[0];
  if (!second) throw new Error("Saved card missing");
  await user.click(second);
  await screen.findByRole("heading", { level: 3, name: "Film 1" });
  await user.click(
    within(theaters).getByRole("button", { name: "Remove from watchlist" }),
  );
  await waitFor(() =>
    expect(
      screen.queryByRole("region", { name: "Your watchlist" }),
    ).not.toBeInTheDocument(),
  );
});
it("shows a section failure without the global error toast", async () => {
  server.use(
    http.get(`${apiBaseUrl}/user-movie-data/movies`, () =>
      HttpResponse.json({ detail: "Unavailable" }, { status: 500 }),
    ),
  );
  render(
    <AuthContextProvider>
      <ReadWatchlistSection />
      <Toaster />
    </AuthContextProvider>,
  );
  expect(
    await screen.findByText("Couldn't load these films."),
  ).toBeInTheDocument();
  expect(screen.queryByText("Server error")).not.toBeInTheDocument();
});

function ReadWatchlistSection() {
  const result = useQuery(homeWatchlistQuery());
  return <WatchlistSection result={result} />;
}

it("uses the measured row count for watchlist loading placeholders", async () => {
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(400);
  const pending = gate();
  server.use(
    http.get(`${apiBaseUrl}/user-movie-data/movies`, async () => {
      await pending.wait;
      return HttpResponse.json(
        createMockMoviePage([movie(1), movie(2), movie(3)]),
      );
    }),
  );
  try {
    render(
      <AuthContextProvider>
        <ReadWatchlistSection />
      </AuthContextProvider>,
    );
    const status = await screen.findByRole("status");
    expect(
      within(status).getAllByRole("listitem", { hidden: true }),
    ).toHaveLength(2);
    pending.release();
    const region = screen.getByRole("region", { name: "Your watchlist" });
    await within(region).findByRole("heading", { name: "Film 1" });
    expect(within(region).getAllByRole("listitem")).toHaveLength(2);
  } finally {
    pending.release();
    vi.restoreAllMocks();
  }
});
