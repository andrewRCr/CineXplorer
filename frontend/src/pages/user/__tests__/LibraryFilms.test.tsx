import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import { useLocation } from "react-router";
import { http, HttpResponse } from "msw/http";
import { apiBaseUrl } from "@/config/baseUrls";
import {
  filmPage,
  prepareLibrary,
  renderLibrary,
  storedFilm,
} from "@tests/helpers/library";
import { server } from "@tests/mocks/server";
import { createMockUserMovieData } from "@tests/mocks/movieData";
import LibraryFilms from "@/pages/user/LibraryFilms";

const url = `${apiBaseUrl}/user-movie-data/movies`;
beforeEach(prepareLibrary);
function Location() {
  const location = useLocation();
  return (
    <output aria-label="Location">
      {location.pathname}
      {location.search}
    </output>
  );
}
function page(query = "") {
  return renderLibrary(
    <>
      <LibraryFilms />
      <Location />
    </>,
    `/library${query}`,
  );
}
function answerSort() {
  server.use(
    http.get(url, ({ request }) => {
      const params = new URL(request.url).searchParams;
      expect(params.get("watched")).toBe("true");
      expect(params.get("page_size")).toBe("100");
      return HttpResponse.json({
        ...filmPage([1]),
        results: [
          {
            ...storedFilm(1),
            title: `${params.get("sort")}/${params.get("direction")}`,
          },
        ],
      });
    }),
  );
}
const sorts = [
  ["Date added: newest", "added", "desc", ""],
  ["Date added: oldest", "added", "asc", "?direction=asc"],
  ["Last watched: newest", "watched", "desc", "?sort=watched"],
  ["Last watched: oldest", "watched", "asc", "?sort=watched&direction=asc"],
  ["Your rating: highest", "rating", "desc", "?sort=rating"],
  ["Your rating: lowest", "rating", "asc", "?sort=rating&direction=asc"],
  ["Title: A–Z", "title", "asc", "?sort=title&direction=asc"],
  ["Title: Z–A", "title", "desc", "?sort=title"],
  ["Release date: newest", "release", "desc", "?sort=release"],
  ["Release date: oldest", "release", "asc", "?sort=release&direction=asc"],
] as const;
it.each(sorts)(
  "reads %s and reflects its address",
  async (label, sort, direction, query) => {
    answerSort();
    page();
    await screen.findAllByRole("link", { name: "added/desc" });
    const user = userEvent.setup();
    await user.click(screen.getByRole("combobox", { name: "Sort by" }));
    await user.click(await screen.findByRole("option", { name: label }));
    expect(
      (await screen.findAllByRole("link", { name: `${sort}/${direction}` }))[0],
    ).toBeVisible();
    expect(screen.getByLabelText("Location")).toHaveTextContent(
      `/library${query}`,
    );
  },
);
it("combines Liked and Rated and preserves them across sorting", async () => {
  server.use(
    http.get(url, ({ request }) => {
      const params = new URL(request.url).searchParams;
      return HttpResponse.json({
        ...filmPage([1]),
        results: [
          {
            ...storedFilm(1),
            title: `${params.get("liked")}/${params.get("rated")}/${params.get("sort")}`,
          },
        ],
      });
    }),
  );
  page("?liked=no&rated=false&sort=title");
  const user = userEvent.setup();
  for (const name of ["Liked", "Rated"]) {
    const button = screen.getByRole("button", { name });
    expect(button).toHaveAttribute("aria-pressed", "false");
    await user.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true");
  }
  expect(
    (await screen.findAllByRole("link", { name: "true/true/title" }))[0],
  ).toBeVisible();
  await user.click(screen.getByRole("combobox", { name: "Sort by" }));
  await user.click(
    await screen.findByRole("option", { name: "Your rating: highest" }),
  );
  expect(
    (await screen.findAllByRole("link", { name: "true/true/rating" }))[0],
  ).toBeVisible();
  const address = screen.getByLabelText("Location").textContent;
  expect(
    new URL(address ?? "", "http://localhost").searchParams.get("liked"),
  ).toBe("true");
  expect(
    new URL(address ?? "", "http://localhost").searchParams.get("rated"),
  ).toBe("true");
  await user.click(screen.getByRole("button", { name: "Liked" }));
  expect(
    (await screen.findAllByRole("link", { name: "null/true/rating" }))[0],
  ).toBeVisible();
});
it("formats Last watched as a calendar date and reserves its slot on other cards", async () => {
  const film = storedFilm(1);
  server.use(
    http.get(url, () =>
      HttpResponse.json({
        ...filmPage([1, 2]),
        results: [
          {
            ...film,
            user_movie_data: createMockUserMovieData({
              tmdb_id: 1,
              last_logged_on: "2026-11-14",
              has_entries: true,
              user_watched: true,
            }),
          },
          storedFilm(2),
        ],
      }),
    ),
  );
  page();
  expect(await screen.findByText("Last watched Nov 14, 2026")).toBeVisible();
  const cells = screen.getAllByRole("gridcell");
  expect(cells).toHaveLength(2);
  const second = cells[1];
  if (!second) throw new Error("Missing second film");
  expect(within(second).queryByText(/Last watched/)).not.toBeInTheDocument();
  for (const cell of cells)
    expect(
      getComputedStyle(within(cell).getByTestId("film-date-slot")).height,
    ).toBe("24px");
});
it.each(["", "?liked=true&sort=rating", "?rated=true&sort=rating"])(
  "shows the right empty state at %s",
  async (query) => {
    let reads = 0;
    server.use(
      http.get(url, () => {
        reads++;
        return HttpResponse.json(filmPage([], 1, 0));
      }),
    );
    page(query);
    if (query) {
      expect(await screen.findByText("No films match")).toBeVisible();
      await userEvent
        .setup()
        .click(screen.getByRole("button", { name: "Clear filters" }));
      await screen.findByText("Your Library is empty");
      expect(screen.getByLabelText("Location")).toHaveTextContent(
        "/library?sort=rating",
      );
      expect(reads).toBe(2);
    } else {
      expect(await screen.findByText("Your Library is empty")).toBeVisible();
      expect(reads).toBe(1);
    }
    expect(screen.getByRole("link", { name: "Explore films" })).toHaveAttribute(
      "href",
      "/browse",
    );
  },
);
it("corrects invalid sorting", async () => {
  answerSort();
  page("?sort=popularity&direction=sideways");
  await screen.findAllByRole("link", { name: "added/desc" });
  await waitFor(() =>
    expect(screen.getByLabelText("Location")).toHaveTextContent(/^\/library$/),
  );
});
it("retries a failed first read", async () => {
  let fail = true;
  server.use(
    http.get(url, () =>
      fail
        ? HttpResponse.json({ detail: "Unavailable" }, { status: 503 })
        : HttpResponse.json(filmPage([1])),
    ),
  );
  page();
  await screen.findByText("Couldn't load your films.");
  fail = false;
  await userEvent.setup().click(screen.getByRole("button", { name: "Retry" }));
  expect(
    (await screen.findAllByRole("link", { name: "Film 1" }))[0],
  ).toBeVisible();
});

it("opens films with the Library source, filters and sort", async () => {
  server.use(http.get(url, () => HttpResponse.json(filmPage([1]))));
  page("?liked=true&sort=rating&direction=asc");
  for (const link of await screen.findAllByRole("link", { name: "Film 1" })) {
    const destination = new URL(
      link.getAttribute("href") ?? "",
      "http://localhost",
    );
    expect(destination.pathname).toBe("/movie/1");
    expect(Object.fromEntries(destination.searchParams)).toEqual({
      from: "library",
      liked: "true",
      sort: "rating",
      direction: "asc",
    });
  }
});
