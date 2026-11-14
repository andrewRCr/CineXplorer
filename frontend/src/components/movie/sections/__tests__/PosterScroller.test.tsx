import { afterEach, it, expect, vi } from "vitest";
import {
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

afterEach(() => vi.restoreAllMocks());
it.each([false, true])(
  "scrolls a visible width and respects reduced motion: %s",
  async (reduced) => {
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(400);
    vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(800);
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
        HttpResponse.json({ results: [createMockMovieListItem()] }),
      ),
    );
    render(
      <PosterRowSection title="Films" query={homeWindowQuery("now-playing")} />,
    );
    await screen.findByText("Test Movie");
    expect(
      screen.getByRole("button", { name: "Previous films" }),
    ).toBeDisabled();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Next films" }));
    expect(screen.getByRole("list").scrollLeft).toBe(400);
    expect(scroll).toHaveBeenLastCalledWith({
      left: 400,
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
