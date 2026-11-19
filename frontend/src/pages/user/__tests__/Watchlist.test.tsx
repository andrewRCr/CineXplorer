import useAuthContext from "@/hooks/auth/useAuthContext";
import { clearBrowserAuth } from "@tests/helpers/auth";
import { toaster, Toaster } from "@/components/core/chakra/toaster";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it } from "vitest";
import { act, screen, waitFor } from "@testing-library/react";
import { useLocation, useNavigate } from "react-router";
import { http, HttpResponse } from "msw/http";
import { apiBaseUrl } from "@/config/baseUrls";
import AuthContextProvider from "@/components/auth/AuthContextProvider";
import { renderWithRoutes } from "@tests/helpers/test-renderer-with-routes";
import { filmPage, prepareLibrary, storedFilm } from "@tests/helpers/library";
import { server } from "@tests/mocks/server";
import Watchlist from "../Watchlist";

const url = `${apiBaseUrl}/user-movie-data/movies`;
beforeEach(prepareLibrary);
afterEach(() => {
  clearBrowserAuth();
  act(() => toaster.remove());
});
function AuthStatus() {
  return (
    <output aria-label="Sign-in status">{useAuthContext()?.status}</output>
  );
}
function Location() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <output aria-label="Location">
        {location.pathname}
        {location.search}
      </output>
      <button onClick={() => void navigate(-1)}>Browser back</button>
    </>
  );
}
function page(entry = "/watchlist") {
  return renderWithRoutes(
    [
      {
        path: "/watchlist",
        element: (
          <AuthContextProvider>
            <AuthStatus />
            <Watchlist />
            <Toaster />
            <Location />
          </AuthContextProvider>
        ),
      },
      { path: "/browse", element: <h1>Catalog</h1> },
    ],
    { initialEntries: ["/browse", entry] },
  );
}
const sorts = [
  ["Date added: newest", "added", "desc", ""],
  ["Date added: oldest", "added", "asc", "?direction=asc"],
  ["Title: A–Z", "title", "asc", "?sort=title&direction=asc"],
  ["Title: Z–A", "title", "desc", "?sort=title"],
  ["Release date: newest", "release", "desc", "?sort=release"],
  ["Release date: oldest", "release", "asc", "?sort=release&direction=asc"],
] as const;
function answerSort() {
  server.use(
    http.get(url, ({ request }) => {
      const params = new URL(request.url).searchParams;
      expect(params.get("watchlist")).toBe("true");
      expect(params.get("page_size")).toBe("100");
      const movie = storedFilm(1);
      movie.title = `${params.get("sort")}/${params.get("direction")}`;
      return HttpResponse.json({ ...filmPage([1]), results: [movie] });
    }),
  );
}
it.each(sorts)(
  "reads %s and keeps its sort in the address",
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
      `/watchlist${query}`,
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Watchlist" }),
    ).toBeVisible();
  },
);
it.each(["?sort=popularity", "?direction=sideways", "?sort=rating"])(
  "corrects an unsupported sort %s by replacing history",
  async (query) => {
    answerSort();
    page(`/watchlist${query}`);
    await screen.findAllByRole("link", { name: "added/desc" });
    await waitFor(() =>
      expect(screen.getByLabelText("Location")).toHaveTextContent(
        /^\/watchlist$/,
      ),
    );
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Browser back" }));
    expect(screen.getByRole("heading", { name: "Catalog" })).toBeVisible();
  },
);
it("replaces history for every sort choice", async () => {
  answerSort();
  page();
  const user = userEvent.setup();
  await screen.findAllByRole("link", { name: "added/desc" });
  for (const name of ["Title: A–Z", "Release date: newest"]) {
    await user.click(screen.getByRole("combobox", { name: "Sort by" }));
    await user.click(await screen.findByRole("option", { name }));
  }
  await user.click(screen.getByRole("button", { name: "Browser back" }));
  expect(screen.getByRole("heading", { name: "Catalog" })).toBeVisible();
});
it("offers Explore films on an empty watchlist", async () => {
  server.use(http.get(url, () => HttpResponse.json(filmPage([], 1, 0))));
  page();
  expect(await screen.findByText("Your watchlist is empty")).toBeVisible();
  expect(screen.getByRole("link", { name: "Explore films" })).toHaveAttribute(
    "href",
    "/browse",
  );
});
it("offers Retry after its first page fails", async () => {
  let failed = true;
  server.use(
    http.get(url, () =>
      failed
        ? HttpResponse.json({ detail: "Unavailable" }, { status: 503 })
        : HttpResponse.json(filmPage([1])),
    ),
  );
  page();
  expect(
    await screen.findByText("Couldn't load your watchlist."),
  ).toBeVisible();
  // The toast mounts hidden and shows a frame later.
  await waitFor(() => expect(screen.getByText("Server error")).toBeVisible());
  failed = false;
  await userEvent.setup().click(screen.getByRole("button", { name: "Retry" }));
  expect(
    (await screen.findAllByRole("link", { name: "Film 1" }))[0],
  ).toBeVisible();
});
it("removes a card after its watchlist save refetches the list", async () => {
  let present = true;
  server.use(
    http.get(url, () =>
      HttpResponse.json(filmPage(present ? [1] : [], 1, present ? 1 : 0)),
    ),
    http.patch(`${apiBaseUrl}/user-movie-data/1`, () => {
      present = false;
      return HttpResponse.json({
        ...storedFilm(1).user_movie_data,
        user_on_watchlist: false,
      });
    }),
  );
  page();
  await screen.findAllByRole("link", { name: "Film 1" });
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Actions for Film 1" }));
  await user.click(screen.getByRole("menuitemcheckbox", { name: "Watchlist" }));
  expect(await screen.findByText("Your watchlist is empty")).toBeVisible();
  expect(screen.queryAllByRole("link", { name: "Film 1" })).toHaveLength(0);
});

it("opens films with the Watchlist source and sort", async () => {
  server.use(http.get(url, () => HttpResponse.json(filmPage([1]))));
  page("/watchlist?sort=title");
  for (const link of await screen.findAllByRole("link", { name: "Film 1" })) {
    const destination = new URL(
      link.getAttribute("href") ?? "",
      "http://localhost",
    );
    expect(destination.pathname).toBe("/movie/1");
    expect(Object.fromEntries(destination.searchParams)).toEqual({
      from: "watchlist",
      sort: "title",
    });
  }
});

it("makes no Library request for a signed-out visitor", async () => {
  clearBrowserAuth();
  let reads = 0;
  server.use(
    http.get(url, () => {
      reads++;
      return HttpResponse.json(filmPage([], 1, 0));
    }),
  );
  page();
  await waitFor(() =>
    expect(screen.getByLabelText("Sign-in status")).toHaveTextContent(
      "anonymous",
    ),
  );
  expect(screen.getByText("Your watchlist is empty")).toBeVisible();
  expect(reads).toBe(0);
});
