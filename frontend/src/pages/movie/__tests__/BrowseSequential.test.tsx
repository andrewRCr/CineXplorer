import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TestProviders } from "@tests/helpers/test-providers";
import { createMockMovieListItem } from "@tests/mocks/movieData";
import { server } from "@tests/mocks/server";
import MovieCollectionLayout from "@/components/movie/collection/MovieCollectionLayout";
import { apiBaseUrl } from "@/config/baseUrls";
import type { MovieListResponse } from "@/types/movie";
import BrowseSequential from "../BrowseSequential";

const browseUrl = `${apiBaseUrl}/movies/browse`;

const browsePage = (
  titles: string[],
  firstId: number,
  nextCursor: number | null,
): MovieListResponse => ({
  page: 1,
  results: titles.map((title, index) =>
    createMockMovieListItem({ tmdb_id: firstId + index, title }),
  ),
  total_pages: 10,
  total_results: 200,
  next_tmdb_page_start: nextCursor,
});

// Responses keyed by the cursor the request carries; the first request has none
const pagesByCursor = new Map<string | null, MovieListResponse>([
  [null, browsePage(["Alpha One", "Alpha Two", "Alpha Three"], 1, 6)],
  ["6", browsePage(["Bravo One", "Bravo Two"], 4, 9)],
  ["9", browsePage(["Charlie One", "Charlie Two"], 6, null)],
]);

const renderSequentialBrowse = () =>
  render(
    <TestProviders>
      <MemoryRouter initialEntries={["/browse/sequential"]}>
        <Routes>
          <Route
            path="/browse/sequential"
            element={
              <MovieCollectionLayout showBrowseControls renderPageHeader />
            }
          >
            <Route index element={<BrowseSequential />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </TestProviders>,
  );

describe("BrowseSequential", () => {
  it("counts the results range from the pages before, whatever their sizes", async () => {
    server.use(
      http.get(browseUrl, ({ request }) => {
        const cursor = new URL(request.url).searchParams.get("tmdb_page_start");
        const page = pagesByCursor.get(cursor);
        return page
          ? HttpResponse.json(page)
          : HttpResponse.json({ detail: "Unexpected cursor" }, { status: 400 });
      }),
    );
    const user = userEvent.setup();
    renderSequentialBrowse();

    expect(await screen.findByText("Alpha Three")).toBeInTheDocument();
    expect(
      screen.getAllByText("Showing 1-3 of 200 results").length,
    ).toBeGreaterThan(0);

    const showNextPage = async () => {
      const [nextButton] = screen.getAllByRole("button", { name: "Next page" });
      if (!nextButton) throw new Error("No next page button");
      await user.click(nextButton);
    };

    await showNextPage();
    expect(await screen.findByText("Bravo Two")).toBeInTheDocument();
    expect(
      screen.getAllByText("Showing 4-5 of 200 results").length,
    ).toBeGreaterThan(0);

    // Pages of 3 and 2 come before, so the third page holds results 6-7
    await showNextPage();
    expect(await screen.findByText("Charlie Two")).toBeInTheDocument();
    expect(
      screen.getAllByText("Showing 6-7 of 200 results").length,
    ).toBeGreaterThan(0);
  });
});
