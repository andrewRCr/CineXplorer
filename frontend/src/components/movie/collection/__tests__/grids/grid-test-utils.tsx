import { render } from "@testing-library/react";
import { HttpResponse, http } from "msw/http";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes, type Location } from "react-router";
import { TestProviders } from "@tests/helpers/test-providers";
import { createMockMovieListItem } from "@tests/mocks/movieData";
import { server } from "@tests/mocks/server";
import MovieCollectionLayout from "@/components/movie/collection/MovieCollectionLayout";
import { apiBaseUrl } from "@/config/baseUrls";
import type { MovieListResponse } from "@/types/movie";

export const browseUrl = `${apiBaseUrl}/movies/browse`;

export function browsePage(
  firstId: number,
  count: number,
  totalResults = count,
  nextCursor: number | null = null,
): MovieListResponse {
  return {
    // Both grids keep page=1 and continue from the upstream cursor.
    page: 1,
    results: Array.from({ length: count }, (_, index) =>
      createMockMovieListItem({
        tmdb_id: firstId + index,
        title: `Movie ${firstId + index}`,
        runtime: 0,
        user_movie_data: null,
      }),
    ),
    total_pages: Math.ceil(totalResults / 20),
    total_results: totalResults,
    next_tmdb_page_start: nextCursor,
  };
}

export function holdBrowsePage(page: MovieListResponse) {
  let release = () => {};
  const response = new Promise<MovieListResponse>((resolve) => {
    release = () => resolve(page);
  });
  return { response, release };
}

export function serveBrowse(
  getPage: (
    cursor: string | null,
    params: URLSearchParams,
  ) => MovieListResponse | undefined | Promise<MovieListResponse>,
) {
  const cursors: (string | null)[] = [];
  server.use(
    http.get(browseUrl, async ({ request }) => {
      const params = new URL(request.url).searchParams;
      const cursor = params.get("tmdb_page_start");
      cursors.push(cursor);
      const page =
        params.get("page") === "1" && (await getPage(cursor, params));
      return page
        ? HttpResponse.json(page)
        : HttpResponse.json(
            { detail: "Unexpected browse request" },
            { status: 400 },
          );
    }),
  );
  return cursors;
}

export function renderBrowseGrid(
  path: "/browse" | "/browse/sequential",
  grid: ReactNode,
  entry: string | Partial<Location> = path,
) {
  return render(
    <TestProviders>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route
            path={path}
            element={
              <MovieCollectionLayout
                showBrowseControls
                renderPageHeader={path === "/browse/sequential"}
              />
            }
          >
            <Route index element={grid} />
          </Route>
        </Routes>
      </MemoryRouter>
    </TestProviders>,
  );
}
