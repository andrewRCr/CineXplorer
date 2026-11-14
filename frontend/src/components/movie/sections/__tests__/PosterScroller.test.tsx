import { afterEach, it, expect, vi } from "vitest";
import {
  act,
  within,
  render,
  screen,
  fireEvent,
  waitFor,
} from "@tests/helpers/test-renderer";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { server } from "@tests/mocks/server";
import { apiBaseUrl } from "@/config/baseUrls";
import { createMockMovieListItem } from "@tests/mocks/movieData";
import { homeWindowQuery } from "@/lib/queries";
import { PosterRowSection } from "@/components/movie/sections/PosterRowSection";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it.each([false, true])(
  "pages by complete cards and respects reduced motion: %s",
  async (reduced) => {
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(400);
    vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(816);
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    vi.spyOn(window, "matchMedia").mockImplementation((q) => ({
      ...media,
      media: q,
      matches: q.includes("prefers-reduced-motion") && reduced,
    }));
    const scroll = vi
      .spyOn(HTMLElement.prototype, "scrollTo")
      .mockImplementation(function (
        this: HTMLElement,
        options: ScrollToOptions | number = {},
      ) {
        if (typeof options === "object") this.scrollLeft = options.left ?? 0;
        fireEvent.scroll(this);
      });
    server.use(
      http.get(`${apiBaseUrl}/movies/now-playing`, () =>
        HttpResponse.json({
          results: Array.from({ length: 4 }, (_, i) =>
            createMockMovieListItem({ tmdb_id: i, title: `Film ${i}` }),
          ),
        }),
      ),
    );
    render(
      <PosterRowSection title="Films" query={homeWindowQuery("now-playing")} />,
    );
    await screen.findByText("Film 0");
    expect(
      screen.getByRole("button", { name: "Previous films" }),
    ).toBeDisabled();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Next films" }));
    expect(screen.getByRole("list").scrollLeft).toBe(416);
    expect(scroll).toHaveBeenLastCalledWith({
      left: 416,
      behavior: reduced ? "auto" : "smooth",
    });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Next films" })).toBeDisabled(),
    );
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Previous films" }));
    expect(screen.getByRole("list").scrollLeft).toBe(0);
  },
);
it("disables both controls when the list fits", async () => {
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(400);
  vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(400);
  server.use(
    http.get(`${apiBaseUrl}/movies/now-playing`, () =>
      HttpResponse.json({ results: [createMockMovieListItem()] }),
    ),
  );
  render(
    <PosterRowSection title="Films" query={homeWindowQuery("now-playing")} />,
  );
  await screen.findByText("Test Movie");
  expect(screen.getByRole("button", { name: "Previous films" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Next films" })).toBeDisabled();
});

function supplyRowGeometry(width: () => number) {
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(
    width,
  );
  vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockImplementation(
    function (this: HTMLElement) {
      return Math.round(
        within(this).queryAllByRole("listitem", { hidden: true }).length *
          (width() === 400 ? 208 : 616 / 3) -
          16,
      );
    },
  );
  vi.spyOn(HTMLElement.prototype, "scrollTo").mockImplementation(function (
    this: HTMLElement,
    options: ScrollToOptions | number = {},
  ) {
    if (typeof options === "object") this.scrollLeft = options.left ?? 0;
    fireEvent.scroll(this);
  });
  server.use(
    http.get(`${apiBaseUrl}/movies/now-playing`, () =>
      HttpResponse.json({
        results: Array.from({ length: 8 }, (_, i) =>
          createMockMovieListItem({ tmdb_id: i, title: `Film ${i}` }),
        ),
      }),
    ),
  );
}

it("ends on an overlapping complete page instead of partial cards", async () => {
  supplyRowGeometry(() => 600);
  render(
    <PosterRowSection title="Films" query={homeWindowQuery("now-playing")} />,
  );
  await screen.findByText("Film 0");
  const next = screen.getByRole("button", { name: "Next films" });
  await userEvent.setup().click(next);
  expect(screen.getByRole("list").scrollLeft).toBeCloseTo(616);
  await userEvent.setup().click(next);
  expect(screen.getByRole("list").scrollLeft).toBeCloseTo((5 * 616) / 3);
  expect(next).toBeDisabled();
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "Previous films" }));
  expect(screen.getByRole("list").scrollLeft).toBeCloseTo((2 * 616) / 3);
});

it("pages from the actual snapped position after native scrolling", async () => {
  supplyRowGeometry(() => 400);
  render(
    <PosterRowSection title="Films" query={homeWindowQuery("now-playing")} />,
  );
  await screen.findByText("Film 0");
  const list = screen.getByRole("list");
  list.scrollLeft = 3 * 208;
  fireEvent.scroll(list);
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "Next films" }));
  expect(list.scrollLeft).toBe(5 * 208);
});

it("realigns the final page to the new card edges after a resize", async () => {
  let width = 400;
  let resize = () => {};
  vi.stubGlobal(
    "ResizeObserver",
    class implements ResizeObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
      constructor(callback: ResizeObserverCallback) {
        resize = () => callback([], this);
      }
    },
  );
  supplyRowGeometry(() => width);
  render(
    <PosterRowSection title="Films" query={homeWindowQuery("now-playing")} />,
  );
  await screen.findByText("Film 0");
  const user = userEvent.setup();
  const next = screen.getByRole("button", { name: "Next films" });
  for (let i = 0; i < 3; i++) await user.click(next);
  const list = screen.getByRole("list");
  expect(list.scrollLeft).toBe(6 * 208);
  width = 600;
  act(resize);
  expect(list.scrollLeft).toBeCloseTo((5 * 616) / 3);
  expect(next).toBeDisabled();
});
