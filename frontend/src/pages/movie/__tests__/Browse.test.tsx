import { StrictMode } from "react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import {
  Link,
  MemoryRouter,
  Route,
  Routes,
  type InitialEntry,
} from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { TestProviders } from "@tests/helpers/test-providers";
import { createMockMovieListItems } from "@tests/mocks/movieData";
import { server } from "@tests/mocks/server";
import MovieCollectionLayout from "@/components/movie/collection/MovieCollectionLayout";
import { apiBaseUrl } from "@/config/baseUrls";
import type { MovieListResponse } from "@/types/movie";
import { isRecord } from "@/utilities/typeGuards";
import Browse from "../Browse";

const browseUrl = `${apiBaseUrl}/movies/browse`;

const browsePage: MovieListResponse = {
  page: 1,
  results: createMockMovieListItems(20),
  total_pages: 1,
  total_results: 20,
  next_tmdb_page_start: null,
};

const renderBrowse = (entry: InitialEntry) =>
  render(
    // The app renders under StrictMode, which runs effects twice in development
    <StrictMode>
      <TestProviders>
        <MemoryRouter initialEntries={[entry]}>
          <Link to="/browse">All movies</Link>
          <Routes>
            <Route
              path="/browse"
              element={
                <MovieCollectionLayout
                  showBrowseControls
                  renderPageHeader={false}
                />
              }
            >
              <Route index element={<Browse />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </TestProviders>
    </StrictMode>,
  );

const setScrollY = (value: number) =>
  Object.defineProperty(window, "scrollY", { value, configurable: true });

/** Where each window.scrollTo call aimed, in either of its call forms. */
const scrollTargets = (): unknown[] =>
  vi
    .mocked(window.scrollTo)
    .mock.calls.map(([first, second]: unknown[]) =>
      isRecord(first) ? first.top : second,
    );

const storedScrollEntries = () =>
  Array.from({ length: sessionStorage.length }, (_, index) =>
    sessionStorage.getItem(sessionStorage.key(index) ?? ""),
  ).join();

describe("Browse", () => {
  afterEach(() => {
    setScrollY(0);
    sessionStorage.clear();
  });

  /** Visit the results and scroll down them, which saves the position. */
  const scrollDownResults = async (position: number) => {
    server.use(http.get(browseUrl, () => HttpResponse.json(browsePage)));
    const visit = renderBrowse("/browse");
    expect(await screen.findByText("20 results")).toBeInTheDocument();
    setScrollY(position);
    window.dispatchEvent(new Event("scroll"));
    await waitFor(() =>
      expect(storedScrollEntries()).toContain(`"position":${position}`),
    );
    visit.unmount();
    setScrollY(0);
  };

  /** Hold the results back until the returned function is called. */
  const holdResults = () => {
    let finishRequest: (() => void) | undefined;
    const pending = new Promise<void>((resolve) => {
      finishRequest = resolve;
    });
    server.use(
      http.get(browseUrl, async () => {
        await pending;
        return HttpResponse.json(browsePage);
      }),
    );
    return () => finishRequest?.();
  };

  it("returns to the saved scroll position once results that were still loading arrive", async () => {
    await scrollDownResults(1500);
    const finishLoading = holdResults();

    renderBrowse({ pathname: "/browse", state: { restoreScroll: true } });
    const scrollsBeforeResults = scrollTargets().length;
    finishLoading();

    expect(await screen.findByText("20 results")).toBeInTheDocument();
    // It scrolls there at once, then again after the grid has laid out
    await waitFor(() =>
      expect(scrollTargets().slice(scrollsBeforeResults)).toEqual([1500, 1500]),
    );
  });

  it("stays at the top when a new navigation follows Back to Results before the results arrive", async () => {
    await scrollDownResults(1500);
    const finishLoading = holdResults();
    const user = userEvent.setup();

    renderBrowse({ pathname: "/browse", state: { restoreScroll: true } });
    await user.click(screen.getByRole("link", { name: "All movies" }));
    const scrollsBeforeResults = scrollTargets().length;
    finishLoading();

    expect(await screen.findByText("20 results")).toBeInTheDocument();
    // Restoration scrolls again after a frame and 50 ms; wait past both
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(scrollTargets().slice(scrollsBeforeResults)).not.toContain(1500);
  });

  it("doesn't scroll again after leaving the results just as they're restored", async () => {
    await scrollDownResults(1500);
    const finishLoading = holdResults();

    const backVisit = renderBrowse({
      pathname: "/browse",
      state: { restoreScroll: true },
    });
    finishLoading();
    expect(await screen.findByText("20 results")).toBeInTheDocument();
    backVisit.unmount();
    const scrollsBeforeLeaving = scrollTargets().length;

    // The restore's second scroll would come after a frame and 50 ms
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(scrollTargets().slice(scrollsBeforeLeaving)).toEqual([]);
  });
});
