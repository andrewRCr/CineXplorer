import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw/http";
import { Link } from "react-router";
import {
  afterEach,
  assert,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { measuredCollectionGeometry } from "@tests/helpers/measuredCollectionGeometry";
import { server } from "@tests/mocks/server";
import VirtualizedMovieGrid from "../../VirtualizedMovieGrid";
import {
  browsePage,
  browseUrl,
  holdBrowsePage,
  renderBrowseGrid,
  serveBrowse,
} from "./grid-test-utils";

const firstPage = browsePage(1, 20);
const renderGrid = () => renderBrowseGrid("/browse", <VirtualizedMovieGrid />);
const scrollTo = (position: number) =>
  act(async () => {
    window.scrollTo(0, position);
  });
const movie = (id: number) => ({ name: `Movie ${id}` });
// Allow the 150 ms debounce and the request to reach MSW.
const waitForFetchDebounce = () =>
  act(() => new Promise<void>((resolve) => setTimeout(resolve, 200)));

describe("VirtualizedMovieGrid", () => {
  beforeEach(async () => {
    sessionStorage.clear();
    measuredCollectionGeometry();
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(824);
    vi.stubGlobal("innerHeight", 600);
    await scrollTo(0);
  });

  afterEach(async () => {
    await scrollTo(0);
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it("shows skeletons until the initial browse response arrives", async () => {
    const pending = holdBrowsePage(firstPage);
    serveBrowse(() => pending.response);
    renderGrid();

    try {
      expect(screen.getByText("Loading results...")).toBeVisible();
      expect(screen.getAllByTestId(/^skeleton-loader-/)).toHaveLength(20);
    } finally {
      pending.release();
    }

    expect(await screen.findByRole("article", movie(1))).toBeVisible();
    expect(screen.queryAllByTestId(/^skeleton-loader-/)).toHaveLength(0);
    expect(screen.getByText("20 results")).toBeVisible();
  });

  it("renders only the window of results around the current scroll position", async () => {
    serveBrowse(() => firstPage);
    renderGrid();

    expect(await screen.findByRole("article", movie(1))).toBeVisible();
    expect(screen.getByRole("article", movie(12))).toBeVisible();
    expect(screen.getAllByRole("article")).toHaveLength(12);
    expect(screen.queryByRole("article", movie(13))).not.toBeInTheDocument();

    await scrollTo(1200);
    expect(screen.getByRole("article", movie(20))).toBeVisible();
    expect(screen.queryByRole("article", movie(1))).not.toBeInTheDocument();
  });

  it("renders one column when the container fits one card", async () => {
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(194);
    serveBrowse(() => firstPage);
    renderGrid();

    expect(await screen.findByRole("article", movie(1))).toBeVisible();
    expect(screen.getByRole("article", movie(3))).toBeVisible();
    expect(screen.getAllByRole("article")).toHaveLength(3);

    await scrollTo(1200);
    expect(screen.getByRole("article", movie(5))).toBeVisible();
    expect(screen.queryByRole("article", movie(1))).not.toBeInTheDocument();
  });

  it("includes the poster, text and gap in the distance between rows", async () => {
    vi.stubGlobal("innerHeight", 1);
    serveBrowse(() => firstPage);
    renderGrid();
    await screen.findByRole("article", movie(1));

    // 194px-wide 2:3 poster + 128px text + 16px gap = 435px per row.
    // The first row leaves the overscan when the third row starts at 870px.
    await scrollTo(869);
    expect(screen.getByRole("article", movie(1))).toBeVisible();

    await scrollTo(871);
    expect(screen.queryByRole("article", movie(1))).not.toBeInTheDocument();
    expect(screen.getByRole("article", movie(9))).toBeVisible();
  });

  it("loads the next cursor near the bottom and keeps one request in flight", async () => {
    const pending = holdBrowsePage(browsePage(21, 4, 200));
    const cursors = serveBrowse((cursor) => {
      if (cursor === null) return browsePage(1, 20, 200, 6);
      if (cursor === "6") return pending.response;
      return undefined;
    });
    renderGrid();

    try {
      await screen.findByRole("article", movie(1));
      await waitForFetchDebounce();
      expect(cursors).toEqual([null]);

      await scrollTo(1200);
      expect(await screen.findByText("Loading more...")).toBeVisible();
      expect(screen.getByRole("article", movie(20))).toBeVisible();
      await scrollTo(1450);
      await waitFor(() => expect(cursors).toEqual([null, "6"]));
      // Allow another near-bottom debounce while the first response is held.
      await waitForFetchDebounce();
      expect(cursors).toEqual([null, "6"]);
    } finally {
      pending.release();
    }

    expect(await screen.findByRole("article", movie(24))).toBeVisible();
    expect(screen.queryByText("Loading more...")).not.toBeInTheDocument();
    expect(screen.getByText("No more results")).toBeVisible();
  });

  it("loads the next page automatically when the first page fits in the viewport", async () => {
    const cursors = serveBrowse((cursor) => {
      // Each short response consumes six of the twelve upstream pages.
      if (cursor === null) return browsePage(1, 3, 240, 7);
      if (cursor === "7") return browsePage(4, 1, 240);
      return undefined;
    });
    renderGrid();

    expect(await screen.findByRole("article", movie(4))).toBeVisible();
    expect(screen.getAllByRole("article")).toHaveLength(4);
    expect(cursors).toEqual([null, "7"]);
    expect(screen.getByText("No more results")).toBeVisible();
  });

  it.each([1, 3])(
    "renders all %i movies when the last page fits",
    async (count) => {
      const cursors = serveBrowse((cursor) =>
        cursor === null ? browsePage(1, count) : undefined,
      );
      renderGrid();

      expect(await screen.findByRole("article", movie(count))).toBeVisible();
      expect(screen.getAllByRole("article")).toHaveLength(count);
      expect(screen.getByText("No more results")).toBeVisible();
      expect(
        screen.queryByText("No movies found matching your filters."),
      ).not.toBeInTheDocument();
      await waitForFetchDebounce();
      expect(cursors).toEqual([null]);
    },
  );

  it("shows empty results guidance", async () => {
    serveBrowse(() => browsePage(1, 0));
    renderGrid();

    expect(
      await screen.findByText("No movies found matching your filters."),
    ).toBeVisible();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });

  it("shows a network error and displays movies after a retry", async () => {
    serveBrowse(() => firstPage);
    server.use(http.get(browseUrl, () => HttpResponse.error(), { once: true }));
    const user = userEvent.setup();
    renderGrid();

    const retry = await screen.findByRole("button", { name: "Retry" });
    expect(screen.getByText(/network error/i)).toBeVisible();
    await user.click(retry);
    expect(await screen.findByRole("article", movie(1))).toBeVisible();
    expect(retry).not.toBeInTheDocument();
  });

  it("saves scroll position and restores it on an explicit return to results", async () => {
    serveBrowse(() => firstPage);
    const visit = renderGrid();
    await screen.findByRole("article", movie(1));

    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      await scrollTo(900);
      await act(() => vi.advanceTimersByTimeAsync(100));
      await scrollTo(1200);
      await act(() => vi.advanceTimersByTimeAsync(199));
      expect(sessionStorage.length).toBe(0);

      await act(() => vi.advanceTimersByTimeAsync(1));
      expect(Object.values(sessionStorage)).toContainEqual(
        expect.stringContaining('"position":1200'),
      );
    } finally {
      vi.useRealTimers();
    }
    visit.unmount();
    await scrollTo(0);

    renderBrowseGrid("/browse", <VirtualizedMovieGrid />, {
      pathname: "/browse",
      state: { restoreScroll: true },
    });

    expect(await screen.findByRole("article", movie(20))).toBeVisible();
    expect(window.scrollY).toBe(1200);
    expect(screen.queryByRole("article", movie(1))).not.toBeInTheDocument();
  });

  it("returns past the loading grid's end once results held back arrive", async () => {
    serveBrowse(() => firstPage);
    const visit = renderGrid();
    await screen.findByRole("article", movie(1));
    await scrollTo(1200);
    await act(() => new Promise<void>((resolve) => setTimeout(resolve, 250)));
    expect(Object.values(sessionStorage)).toContainEqual(
      expect.stringContaining('"position":1200'),
    );
    visit.unmount();
    await scrollTo(0);

    // The loading grid is shorter than the saved position, so the browser stops a scroll at its end
    const placeScroll = vi.mocked(window.scrollTo).getMockImplementation();
    assert.isDefined(placeScroll);
    vi.mocked(window.scrollTo).mockImplementation(
      (value: number | ScrollToOptions, y?: number) => {
        const top = typeof value === "number" ? (y ?? 0) : (value.top ?? 0);
        const loading = screen.queryAllByTestId(/^skeleton-loader-/).length > 0;
        placeScroll(0, loading ? Math.min(top, 600) : top);
      },
    );
    const pending = holdBrowsePage(firstPage);
    serveBrowse(() => pending.response);
    renderBrowseGrid("/browse", <VirtualizedMovieGrid />, {
      pathname: "/browse",
      state: { restoreScroll: true },
    });
    // The grid has placed itself at the position, and stopped short of it
    expect(window.scrollY).toBe(600);

    // Results held back for longer than the save delay
    await act(() => new Promise<void>((resolve) => setTimeout(resolve, 300)));
    expect(Object.values(sessionStorage)).toContainEqual(
      expect.stringContaining('"position":1200'),
    );
    pending.release();
    expect(await screen.findByRole("article", movie(20))).toBeVisible();
    expect(window.scrollY).toBe(1200);
  });

  it("starts at the top when returning with no saved position", async () => {
    serveBrowse(() => firstPage);
    renderBrowseGrid("/browse", <VirtualizedMovieGrid />, {
      pathname: "/browse",
      state: { restoreScroll: true },
    });

    expect(await screen.findByRole("article", movie(1))).toBeVisible();
    expect(window.scrollY).toBe(0);
    expect(screen.queryByRole("article", movie(20))).not.toBeInTheDocument();
  });

  it("starts a newly filtered result set at the top", async () => {
    const actionGenre = 28;
    assert.isDefined(firstPage.results);
    const catalog = firstPage.results.map((entry, index) => ({
      ...entry,
      genre_ids: [index === 0 ? 35 : actionGenre],
    }));
    const actionMovies = catalog.filter((entry) =>
      entry.genre_ids.includes(actionGenre),
    );
    const allMovies = { ...firstPage, results: catalog };
    const filteredMovies = {
      ...firstPage,
      results: actionMovies,
      total_results: actionMovies.length,
    };
    serveBrowse((_, params) =>
      params.get("genres") === String(actionGenre) ? filteredMovies : allMovies,
    );
    const user = userEvent.setup();
    renderBrowseGrid(
      "/browse",
      <>
        <Link to={`?genres=${actionGenre}`} state={{ restoreScroll: true }}>
          Action only
        </Link>
        <VirtualizedMovieGrid />
      </>,
    );
    await screen.findByRole("article", movie(1));
    await scrollTo(1200);
    expect(screen.getByRole("article", movie(20))).toBeVisible();

    await user.click(screen.getByRole("link", { name: "Action only" }));
    expect(await screen.findByText("19 results")).toBeVisible();
    expect(screen.getByRole("article", movie(2))).toBeVisible();
    expect(window.scrollY).toBe(0);
    expect(screen.queryByRole("article", movie(1))).not.toBeInTheDocument();
    expect(screen.queryByRole("article", movie(20))).not.toBeInTheDocument();
  });
});
