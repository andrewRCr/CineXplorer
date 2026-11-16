import type { ReactNode } from "react";
import { vi } from "vitest";
import { act, render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import AuthContextProvider from "@/components/auth/AuthContextProvider";
import { setAuthTokens } from "@/utilities/tokenUtils";
import { authHandlers, clearBrowserAuth, token } from "./auth";
import { TestProviders } from "./test-providers";
import {
  createMockMovieListItem,
  createMockUserMovieData,
} from "@tests/mocks/movieData";
import type { MovieListResponseSchema } from "@/services/userMovieService";

export function prepareLibrary() {
  Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
  Object.defineProperty(window, "pageYOffset", {
    configurable: true,
    value: 0,
  });
  clearBrowserAuth();
  authHandlers();
  setAuthTokens(token());
  // Supply layout measurements while keeping the real virtualizer and observers.
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(374);
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(
    function (this: HTMLElement) {
      return this.hasAttribute("data-index") ? 300 : 0;
    },
  );
}
export function renderLibrary(ui: ReactNode, entry = "/watchlist") {
  return render(
    <TestProviders>
      <MemoryRouter initialEntries={[entry]}>
        <AuthContextProvider>{ui}</AuthContextProvider>
      </MemoryRouter>
    </TestProviders>,
  );
}
export const storedFilm = (id: number) =>
  createMockMovieListItem({
    tmdb_id: id,
    title: `Film ${id}`,
    poster_path: null,
    user_movie_data: createMockUserMovieData({
      tmdb_id: id,
      user_on_watchlist: true,
      user_watched: true,
      user_liked: true,
      user_rating: 8,
    }),
  });
export function filmPage(
  ids: number[],
  page = 1,
  totalPages = 1,
): MovieListResponseSchema {
  return {
    page,
    total_pages: totalPages,
    total_results: totalPages * ids.length,
    results: ids.map(storedFilm),
  };
}

export async function scrollLibrary(position: number) {
  await act(async () => {
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: position,
    });
    Object.defineProperty(window, "pageYOffset", {
      configurable: true,
      value: position,
    });
    window.dispatchEvent(new Event("scroll"));
  });
}
