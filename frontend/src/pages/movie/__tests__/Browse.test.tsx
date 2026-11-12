import { StrictMode } from "react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw/http";
import {
  Link,
  MemoryRouter,
  Route,
  Routes,
  type InitialEntry,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { TestProviders } from "@tests/helpers/test-providers";
import { createMockMovieListItems } from "@tests/mocks/movieData";
import { server } from "@tests/mocks/server";
import MovieCollectionLayout from "@/components/movie/collection/MovieCollectionLayout";
import { apiBaseUrl } from "@/config/baseUrls";
import type { MovieListResponse } from "@/types/movie";
import { isRecord } from "@/utilities/typeGuards";
import Browse from "../Browse";
import NowPlaying from "../NowPlaying";
import Upcoming from "../Upcoming";
import SearchResults from "../SearchResults";
import { gate } from "@tests/helpers/web-locks";
import { styleSystem, expectResolvedColor } from "@tests/helpers/theme-styles";

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
              element={<MovieCollectionLayout renderPageHeader={false} />}
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
    fireEvent.scroll(window);
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

    // Hold animation frames so leaving always precedes the delayed restore.
    const frames = new Map<number, FrameRequestCallback>();
    let frameId = 0;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      frames.set(++frameId, callback);
      return frameId;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
      frames.delete(id);
    });

    const backVisit = renderBrowse({
      pathname: "/browse",
      state: { restoreScroll: true },
    });
    finishLoading();
    expect(await screen.findByText("20 results")).toBeInTheDocument();
    expect(scrollTargets()).toContain(1500);
    expect(frames.size).toBeGreaterThan(0);
    backVisit.unmount();
    const scrollsBeforeLeaving = scrollTargets().length;

    // Release the queued frames after leaving, then wait past the 50 ms restore.
    const pendingFrames = [...frames.values()];
    frames.clear();
    act(() => pendingFrames.forEach((callback) => callback(performance.now())));
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(scrollTargets().slice(scrollsBeforeLeaving)).toEqual([]);
  });
});

function CatalogLocation() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <output aria-label="Catalog location">
        {location.pathname}
        {location.search}
      </output>
      <button onClick={() => void navigate(-1)}>Back in history</button>
    </>
  );
}
function renderCatalog(entry: string) {
  return render(
    <StrictMode>
      <TestProviders system={styleSystem}>
        <MemoryRouter initialEntries={["/", entry]}>
          <CatalogLocation />
          <Routes>
            <Route path="/" element={<h1>Home</h1>} />
            <Route
              path="/browse"
              element={<MovieCollectionLayout renderPageHeader={false} />}
            >
              <Route index element={<Browse />} />
              <Route path="now-playing" element={<NowPlaying />} />
              <Route path="upcoming" element={<Upcoming />} />
            </Route>
            <Route
              path="/search"
              element={<MovieCollectionLayout renderPageHeader={false} />}
            >
              <Route index element={<SearchResults />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </TestProviders>
    </StrictMode>,
  );
}

describe("release-window URL rules", () => {
  it.each(["now-playing", "upcoming"])(
    "replaces years on %s before the first request",
    async (window) => {
      const requests: URLSearchParams[] = [];
      server.use(
        http.get(`${apiBaseUrl}/movies/${window}`, ({ request }) => {
          requests.push(new URL(request.url).searchParams);
          return HttpResponse.json(browsePage);
        }),
      );
      const user = userEvent.setup();
      renderCatalog(`/browse/${window}?minYear=1990&maxYear=1999&genres=27`);
      await screen.findByText("20 results");
      await waitFor(() =>
        expect(screen.getByLabelText("Catalog location")).toHaveTextContent(
          `/browse/${window}?genres=27`,
        ),
      );
      expect(requests[0]?.has("release_date_gte")).toBe(false);
      expect(requests[0]?.has("release_date_lte")).toBe(false);
      expect(requests[0]?.get("genres")).toBe("27");
      await user.click(screen.getByRole("button", { name: "Back in history" }));
      expect(screen.getByRole("heading", { name: "Home" })).toBeVisible();
    },
  );

  it.each(["", "&minYear=1990&maxYear=1999"])(
    "replaces Coming soon's rating sort and any years (%s)",
    async (years) => {
      const requests: URLSearchParams[] = [];
      server.use(
        http.get(`${apiBaseUrl}/movies/upcoming`, ({ request }) => {
          requests.push(new URL(request.url).searchParams);
          return HttpResponse.json(browsePage);
        }),
      );
      const user = userEvent.setup();
      renderCatalog(`/browse/upcoming?sortBy=vote_average.desc${years}`);
      await screen.findByText("20 results");
      await waitFor(() =>
        expect(screen.getByLabelText("Catalog location")).toHaveTextContent(
          /^\/browse\/upcoming\??$/,
        ),
      );
      expect(requests[0]?.get("sort_by")).toBe("popularity.desc");
      expect(requests[0]?.has("release_date_gte")).toBe(false);
      expect(requests[0]?.has("release_date_lte")).toBe(false);
      await user.click(screen.getByRole("button", { name: "Back in history" }));
      expect(screen.getByRole("heading", { name: "Home" })).toBeVisible();
    },
  );

  it("keeps the years on All films", async () => {
    let query: URLSearchParams | undefined;
    server.use(
      http.get(browseUrl, ({ request }) => {
        query = new URL(request.url).searchParams;
        return HttpResponse.json(browsePage);
      }),
    );
    renderCatalog("/browse?minYear=1990");
    await screen.findByText("20 results");
    expect(screen.getByLabelText("Catalog location")).toHaveTextContent(
      "/browse?minYear=1990",
    );
    expect(query?.get("release_date_gte")).toBe("1990-01-01");
  });
});

describe("catalog headers and release tabs", () => {
  it.each(["browse", "now-playing", "upcoming"])(
    "links the windows with the current query on %s",
    async (window) => {
      server.use(
        http.get(`${apiBaseUrl}/movies/${window}`, () =>
          HttpResponse.json(browsePage),
        ),
      );
      const path = window === "browse" ? "/browse" : `/browse/${window}`;
      renderCatalog(`${path}?genres=27`);
      await screen.findByText("20 results");
      const nav = screen.getByRole("navigation", { name: "Release windows" });
      const links = within(nav).getAllByRole("link");
      expect(links.map((link) => link.textContent)).toEqual([
        "All films",
        "In theaters",
        "Coming soon",
      ]);
      expect(links.map((link) => link.getAttribute("href"))).toEqual([
        "/browse?genres=27",
        "/browse/now-playing?genres=27",
        "/browse/upcoming?genres=27",
      ]);
      for (const link of links) {
        if (link.getAttribute("href") === `${path}?genres=27`)
          expect(link).toHaveAttribute("aria-current", "page");
        else expect(link).not.toHaveAttribute("aria-current");
      }
    },
  );

  it("carries applicable filters into the chosen window", async () => {
    server.use(
      http.get(browseUrl, () => HttpResponse.json(browsePage)),
      http.get(`${apiBaseUrl}/movies/now-playing`, () =>
        HttpResponse.json(browsePage),
      ),
    );
    const user = userEvent.setup();
    renderCatalog(
      "/browse?genres=27&minRating=7&maxRating=9&certifications=R&language=fr&sortBy=vote_average.desc&minYear=1990",
    );
    await screen.findByText("20 results");
    await user.click(screen.getByRole("link", { name: "In theaters" }));
    await waitFor(() => {
      const query = new URL(
        screen.getByLabelText("Catalog location").textContent || "",
        "https://example.test",
      ).searchParams;
      expect(query.has("minYear")).toBe(false);
      expect(Object.fromEntries(query)).toEqual({
        genres: "27",
        minRating: "7",
        maxRating: "9",
        certifications: "R",
        language: "fr",
        sortBy: "vote_average.desc",
      });
    });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Highest-rated French-language horror films in theaters",
    );
  });

  it.each(["loading", "loaded", "empty", "failed"])(
    "keeps the catalog title and tabs while %s",
    async (state) => {
      const held = gate();
      server.use(
        http.get(browseUrl, async () => {
          if (state === "loading") await held.wait;
          return state === "failed"
            ? HttpResponse.json({ detail: "Unavailable" }, { status: 503 })
            : HttpResponse.json(
                state === "empty"
                  ? {
                      ...browsePage,
                      results: [],
                      total_results: 0,
                      total_pages: 0,
                    }
                  : browsePage,
              );
        }),
      );
      renderCatalog("/browse");
      if (state === "empty")
        await screen.findByText("No movies found matching your filters.");
      if (state === "failed")
        await screen.findByRole("button", { name: "Retry" });
      if (state === "loaded") await screen.findByText("20 results");
      expect(
        screen.getByRole("heading", { level: 1, name: "Popular films" }),
      ).toBeVisible();
      expect(
        screen.getByRole("navigation", { name: "Release windows" }),
      ).toBeVisible();
      if (state === "loading") {
        expect(screen.getByText("Loading results...")).toBeVisible();
        held.release();
        await screen.findByText("20 results");
      }
      if (state === "loaded")
        expect(screen.getByText("20 results")).toBeVisible();
      if (state === "empty" || state === "failed")
        expect(
          screen.queryByText(/^(Loading results\.\.\.|20 results)$/),
        ).not.toBeInTheDocument();
    },
  );

  it.each(["empty", "failed"])(
    "keeps search's title without tabs while %s",
    async (state) => {
      server.use(
        http.get(`${apiBaseUrl}/movies/search`, () =>
          state === "failed"
            ? HttpResponse.json({ detail: "Unavailable" }, { status: 503 })
            : HttpResponse.json({
                ...browsePage,
                results: [],
                total_results: 0,
                total_pages: 0,
              }),
        ),
      );
      renderCatalog("/search?query=Alien");
      if (state === "empty")
        await screen.findByText("No movies found matching your filters.");
      else await screen.findByRole("button", { name: "Retry" });
      expect(
        screen.getByRole("heading", {
          level: 1,
          name: 'Search Results for "Alien"',
        }),
      ).toBeVisible();
      expect(
        screen.queryByRole("navigation", { name: "Release windows" }),
      ).not.toBeInTheDocument();
    },
  );

  it("uses theme roles for the tabs and their keyboard rings", async () => {
    server.use(http.get(browseUrl, () => HttpResponse.json(browsePage)));
    const user = userEvent.setup();
    renderCatalog("/browse");
    await screen.findByText("20 results");
    const links = within(
      screen.getByRole("navigation", { name: "Release windows" }),
    ).getAllByRole("link");
    const current = screen.getByRole("link", { name: "All films" });
    expectResolvedColor(
      current,
      "text-decoration-color",
      "var(--chakra-colors-tertiary)",
    );
    await user.tab();
    for (const link of links) {
      await user.tab();
      expect(link).toHaveFocus();
      expectResolvedColor(link, "color", "var(--chakra-colors-foreground)");
      expectResolvedColor(link, "outline-color", "var(--chakra-colors-ring)");
    }
  });
});
