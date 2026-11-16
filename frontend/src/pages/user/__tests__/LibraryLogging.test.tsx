import { Route, Routes } from "react-router";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw/http";
import { apiBaseUrl } from "@/config/baseUrls";
import { EntryDialogHost } from "@/components/movie/entry/EntryDialogHost";
import { Toaster, toaster } from "@/components/core/chakra/toaster";
import Library from "@/pages/user/Library";
import LibraryFilms from "@/pages/user/LibraryFilms";
import LibraryHistory from "@/pages/user/LibraryHistory";
import {
  filmPage,
  prepareLibrary,
  renderLibrary,
} from "@tests/helpers/library";
import { historyEntry, historyPage } from "@tests/helpers/history";
import { gate } from "@tests/helpers/web-locks";
import {
  createMockMovieListItem,
  createMockUserMovieData,
} from "@tests/mocks/movieData";
import { server } from "@tests/mocks/server";

const today = "2026-11-14";
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-14T18:00:00Z"));
  prepareLibrary();
  act(() => toaster.remove());
});
afterEach(() => {
  act(() => toaster.remove());
  vi.useRealTimers();
});

for (const view of ["Films", "History"]) {
  it.each([false, true])(
    `${view} logs from empty and retains navigation focus after delayed refresh: %s`,
    async (delayed) => {
      let saved = false;
      const refreshed = gate();
      const initial = createMockUserMovieData({ tmdb_id: 1 });
      const record = {
        ...initial,
        user_watched: true,
        has_entries: true,
        last_logged_on: today,
      };
      const film = createMockMovieListItem({
        tmdb_id: 1,
        title: "Film 1",
        release_date: "2020-01-01",
        poster_path: null,
      });
      const entry = {
        id: 1,
        tmdb_id: 1,
        watched_on: today,
        rating: null,
        review: null,
        rewatch: false,
      };
      server.use(
        http.get(`${apiBaseUrl}/user-movie-data/movies`, async () => {
          if (saved && delayed) await refreshed.wait;
          return HttpResponse.json({
            ...filmPage(saved ? [1] : [], 1, saved ? 1 : 0),
            results: saved ? [{ ...film, user_movie_data: record }] : [],
          });
        }),
        http.get(`${apiBaseUrl}/user-movie-data/history`, async () => {
          if (saved && delayed) await refreshed.wait;
          return HttpResponse.json(
            historyPage(
              saved
                ? [
                    historyEntry(1, {
                      title: film.title,
                      day: today,
                      watched_on: today,
                    }),
                  ]
                : [],
            ),
          );
        }),
        http.get(`${apiBaseUrl}/movies/search`, () =>
          HttpResponse.json({
            page: 1,
            total_pages: 1,
            total_results: 1,
            next_tmdb_page_start: null,
            results: [film],
          }),
        ),
        http.get(`${apiBaseUrl}/user-movie-data/1/entries`, () =>
          HttpResponse.json({
            record: saved ? record : initial,
            entries: saved ? [entry] : [],
          }),
        ),
        http.post(
          `${apiBaseUrl}/user-movie-data/1/entries`,
          async ({ request }) => {
            expect(await request.json()).toMatchObject({
              watched_on: today,
              rating: null,
              review: null,
              rewatch: false,
              liked: false,
            });
            saved = true;
            return HttpResponse.json({ record, entry });
          },
        ),
      );
      renderLibrary(
        <EntryDialogHost>
          <Routes>
            <Route path="/library" element={<Library />}>
              <Route index element={<LibraryFilms />} />
              <Route path="history" element={<LibraryHistory />} />
            </Route>
          </Routes>
          <Toaster />
        </EntryDialogHost>,
        view === "Films" ? "/library" : "/library/history",
      );
      const empty =
        view === "Films" ? "Your Library is empty" : "Your history is empty";
      await screen.findByText(empty);
      const navigation = screen.getByRole("navigation", { name: "Library" });
      const destination = within(navigation).getByRole("link", {
        name: view,
      });
      const user = userEvent.setup();
      try {
        await user.click(screen.getByRole("button", { name: "Log a film" }));
        const dialog = await screen.findByRole("dialog", {
          name: "Review or log",
        });
        expect(
          within(dialog).getByRole("switch", { name: "Watched on" }),
        ).toBeChecked();
        expect(within(dialog).getByLabelText("Date watched")).toHaveValue(
          today,
        );
        await user.type(
          within(dialog).getByRole("combobox", { name: "Film" }),
          "Film",
        );
        await user.click(
          await screen.findByRole("option", {
            name: "Film 1 2020",
          }),
        );
        const save = within(dialog).getByRole("button", {
          name: "Save",
        });
        await waitFor(() => expect(save).toBeEnabled());
        await user.click(save);
        await waitFor(() =>
          expect(
            screen.queryByRole("dialog", { name: "Review or log" }),
          ).not.toBeInTheDocument(),
        );
        if (delayed) {
          // The empty-state opener can outlive the dialog while its list refresh is pending.
          expect(
            screen.getByRole("button", { name: "Log a film" }),
          ).toBeVisible();
          await waitFor(() => expect(destination).toHaveFocus());
        }
      } finally {
        await act(async () => refreshed.release());
      }
      expect(
        (await screen.findAllByRole("link", { name: "Film 1" }))[0],
      ).toBeVisible();
      expect(
        screen.queryByRole("button", { name: "Log a film" }),
      ).not.toBeInTheDocument();
      await waitFor(() => expect(destination).toHaveFocus());
    },
  );
}
