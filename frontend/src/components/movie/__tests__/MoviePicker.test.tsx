import { useState } from "react";
import { beforeEach, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@tests/helpers/test-renderer";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { apiBaseUrl } from "@/config/baseUrls";
import type { MoviePickerItem } from "@/types/movie";
import { clearBrowserAuth } from "@tests/helpers/auth";
import { createMockMovieListItem } from "@tests/mocks/movieData";
import { gate } from "@tests/helpers/web-locks";
import { server } from "@tests/mocks/server";
import { MoviePicker } from "../MoviePicker";

function Probe() {
  const [selected, setSelected] = useState<MoviePickerItem | null>(null);
  return (
    <>
      <MoviePicker onSelect={setSelected} />
      <output aria-label="Chosen film">{JSON.stringify(selected)}</output>
    </>
  );
}
const movies = [
  createMockMovieListItem({ title: "Alpha" }),
  createMockMovieListItem({
    tmdb_id: 2,
    title: "Alpine",
    poster_path: null,
    release_date: null,
  }),
];
beforeEach(clearBrowserAuth);

it.each(["keyboard", "pointer"])(
  "finds films and chooses one by %s",
  async (input) => {
    server.use(
      http.get(`${apiBaseUrl}/movies/search`, () =>
        HttpResponse.json({
          page: 1,
          total_pages: 1,
          total_results: 2,
          results: movies,
          next_tmdb_page_start: null,
        }),
      ),
    );
    const user = userEvent.setup();
    render(<Probe />);
    const field = screen.getByRole("combobox", { name: "Film" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    await user.type(field, "a");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    await user.type(field, "l");
    const first = await screen.findByRole("option", { name: "Alpha 2024" });
    expect(
      screen.getByRole("option", { name: "Alpine Year unknown" }),
    ).toBeVisible();
    expect(
      screen.getByRole("img", { name: "Poster unavailable" }),
    ).toBeVisible();
    if (input === "keyboard") await user.keyboard("{ArrowDown}{Enter}");
    else await user.click(first);
    await waitFor(() =>
      expect(
        screen.getByRole("status", { name: "Chosen film" }),
      ).toHaveTextContent(
        JSON.stringify({
          tmdbId: 1,
          title: "Alpha",
          year: "2024",
          posterPath: "/test-poster.jpg",
        }),
      ),
    );
    await waitFor(() =>
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument(),
    );
    await user.click(field);
    const chosen = await screen.findByRole("option", { name: "Alpha 2024" });
    expect(chosen).toHaveAttribute("aria-selected", "true");
    expect(within(chosen).getByLabelText("Selected")).toBeVisible();
  },
);

it("shows searching until a response arrives", async () => {
  const held = gate();
  server.use(
    http.get(`${apiBaseUrl}/movies/search`, async () => {
      await held.wait;
      return HttpResponse.json({
        page: 1,
        total_pages: 1,
        total_results: 2,
        results: movies,
        next_tmdb_page_start: null,
      });
    }),
  );
  const user = userEvent.setup();
  const view = render(<Probe />);
  try {
    await user.type(screen.getByRole("combobox", { name: "Film" }), "al");
    expect(await screen.findByText("Searching…")).toBeVisible();
    held.release();
    expect(
      await screen.findByRole("option", { name: "Alpha 2024" }),
    ).toBeVisible();
    expect(screen.queryByText("Searching…")).not.toBeInTheDocument();
  } finally {
    held.release();
    view.unmount();
  }
});

it.each(["empty", "error"])(
  "shows the %s result and recovers on another search",
  async (kind) => {
    server.use(
      http.get(`${apiBaseUrl}/movies/search`, ({ request }) => {
        const query = new URL(request.url).searchParams.get("query");
        if (query === "al" && kind === "error")
          return HttpResponse.json({ detail: "Unavailable" }, { status: 429 });
        return HttpResponse.json({
          page: 1,
          total_pages: 1,
          total_results: query === "al" ? 0 : 2,
          results: query === "al" ? [] : movies,
          next_tmdb_page_start: null,
        });
      }),
    );
    const user = userEvent.setup();
    render(<Probe />);
    const field = screen.getByRole("combobox", { name: "Film" });
    await user.type(field, "al");
    expect(
      await screen.findByText(
        kind === "empty"
          ? 'No films match "al".'
          : "Search failed. Keep typing to try again.",
      ),
    ).toBeVisible();
    await user.type(field, "p");
    expect(
      await screen.findByRole("option", { name: "Alpha 2024" }),
    ).toBeVisible();
  },
);
