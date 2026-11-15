import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { waitFor } from "@tests/helpers/test-renderer";
import { featuredFilmQuery } from "@/lib/queries";
import { afterEach, beforeEach, it, expect, vi } from "vitest";
import { mockViewport } from "@tests/helpers/viewport";
import { render, screen, fireEvent, act } from "@tests/helpers/test-renderer";
import { renderWithRoutes } from "@tests/helpers/test-renderer-with-routes";
import { Link } from "react-router";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { server } from "@tests/mocks/server";
import { gate } from "@tests/helpers/web-locks";
import { apiBaseUrl } from "@/config/baseUrls";
import { FilmHero } from "@/components/movie/FilmHero";
import { HomeHero } from "@/pages/home/HomeHero";
import {
  Toaster,
  toaster,
  priorityToaster,
} from "@/components/core/chakra/toaster";
import { signInPathFor } from "@/utilities/returnPath";

beforeEach(() => mockViewport(1024, 1000));
afterEach(() => vi.restoreAllMocks());

const headline = "Track what you watch. Find what's next.";
const film = {
  tmdb_id: 947,
  title: "Lawrence of Arabia",
  release_date: "1962-12-11",
  backdrop_path: "/still.jpg",
  tagline: "An epic.",
  focus_point: null,
  mirrored: false,
  directors: ["David Lean"],
};
it("shows the pitch before the film read, then a title link and noninteractive tagline", async () => {
  const pending = gate();
  server.use(
    http.get(`${apiBaseUrl}/movies/featured`, async () => {
      await pending.wait;
      return HttpResponse.json(film);
    }),
  );
  renderWithRoutes([{ path: "/", element: <HomeHero /> }], {
    initialRoute: "/",
  });
  expect(
    screen.getByRole("heading", { level: 1, name: headline }),
  ).toBeInTheDocument();
  expect(
    screen.getByText(
      "See what's in theaters and coming soon, keep a watchlist, and log, rate and like what you've seen. Film data from TMDB.",
    ),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Create account" })).toHaveAttribute(
    "href",
    "/register",
  );
  expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
    "href",
    signInPathFor("/", ""),
  );
  pending.release();
  expect(
    await screen.findByRole("link", { name: /Lawrence of Arabia/ }),
  ).toHaveAttribute("href", "/movie/947?from=home");
  expect(screen.getByText("David Lean 1962")).toBeInTheDocument();
  expect(screen.getByText("An epic.")).toBeInTheDocument();
  expect(
    screen.queryByRole("link", { name: /An epic/ }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("link", {
      name: "Lawrence of Arabia",
    }),
  ).toHaveAttribute("href", "/movie/947?from=home");
  expect(screen.getByAltText("")).toHaveAttribute(
    "src",
    "https://image.tmdb.org/t/p/w1280/still.jpg",
  );
});

it.each(["read", "missing", "image"])(
  "keeps the pitch without a credit, image or toast on %s failure",
  async (kind) => {
    act(() => {
      toaster.remove();
      priorityToaster.remove();
    });
    server.use(
      http.get(`${apiBaseUrl}/movies/featured`, () =>
        kind === "read"
          ? HttpResponse.json({}, { status: 500 })
          : HttpResponse.json({
              ...film,
              backdrop_path: kind === "missing" ? null : film.backdrop_path,
            }),
      ),
    );
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    render(
      <QueryClientProvider client={client}>
        <HomeHero />
        <Toaster />
      </QueryClientProvider>,
    );
    if (kind === "image") fireEvent.error(await screen.findByAltText(""));
    else
      await waitFor(() =>
        expect(client.getQueryState(["featured", null])?.status).toBe(
          kind === "read" ? "error" : "success",
        ),
      );
    expect(screen.getByRole("heading", { name: headline })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Lawrence/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByAltText("")).not.toBeInTheDocument();
    expect(screen.queryByText("Server error")).not.toBeInTheDocument();
  },
);

it("keeps the same film and makes one read across navigation", async () => {
  let reads = 0;
  server.use(
    http.get(`${apiBaseUrl}/movies/featured`, () => {
      reads++;
      return HttpResponse.json(film);
    }),
  );
  renderWithRoutes([
    {
      path: "/",
      element: (
        <>
          <HomeHero />
          <Link to="/other">Leave Home</Link>
        </>
      ),
    },
    { path: "/other", element: <Link to="/">Return Home</Link> },
  ]);
  await screen.findByText("Lawrence of Arabia");
  const user = userEvent.setup();
  await user.click(screen.getByRole("link", { name: "Leave Home" }));
  await user.click(screen.getByRole("link", { name: "Return Home" }));
  expect(await screen.findByText("Lawrence of Arabia")).toBeInTheDocument();
  expect(reads).toBe(1);
});

it("passes a candidate film from the development address", async () => {
  server.use(
    http.get(`${apiBaseUrl}/movies/featured`, ({ request }) =>
      new URL(request.url).searchParams.get("film") === "550"
        ? HttpResponse.json({ ...film, tmdb_id: 550 })
        : HttpResponse.json({}, { status: 400 }),
    ),
  );
  renderWithRoutes([{ path: "/", element: <HomeHero /> }], {
    initialRoute: "/?film=550",
  });
  expect(await screen.findByRole("link", { name: /Lawrence/ })).toHaveAttribute(
    "href",
    "/movie/550?from=home",
  );
});

it("retains its selected film for the loaded page's lifetime", () => {
  const options = featuredFilmQuery();
  expect(options.staleTime).toBe(Infinity);
  expect(options.gcTime).toBe(Infinity);
  expect(options.refetchOnMount).toBe(false);
  expect(options.refetchOnWindowFocus).toBe(false);
  expect(options.refetchOnReconnect).toBe(false);
});

it.each([
  { point: undefined, position: "50% 28%" },
  { point: null, position: "50% 28%" },
  { point: { x: 0, y: 100 }, position: "0% 100%" },
  { point: { x: 100, y: 0 }, position: "100% 0%" },
  { point: { x: 91, y: 12 }, position: "91% 12%" },
])("anchors supplied artwork at $position", ({ point, position }) => {
  render(
    <FilmHero
      film={film}
      focusPoint={point}
      creditHref="/movie/947?from=home"
      heading={<h1>Pitch</h1>}
      actions={<a href="/register">Create account</a>}
    />,
  );
  expect(getComputedStyle(screen.getByAltText("")).objectPosition).toBe(
    position,
  );
});

it("uses the featured film's configured focus without another read", async () => {
  let reads = 0;
  server.use(
    http.get(`${apiBaseUrl}/movies/featured`, () => {
      reads++;
      return HttpResponse.json({ ...film, focus_point: { x: 33, y: 61 } });
    }),
  );
  render(<HomeHero />);
  const image = await screen.findByAltText("");
  expect(getComputedStyle(image).objectPosition).toBe("33% 61%");
  expect(reads).toBe(1);
});

it("flips the featured film's mirrored artwork around its configured point", async () => {
  server.use(
    http.get(`${apiBaseUrl}/movies/featured`, () =>
      HttpResponse.json({
        ...film,
        focus_point: { x: 33, y: 61 },
        mirrored: true,
      }),
    ),
  );
  render(<HomeHero />);
  const image = await screen.findByAltText("");
  expect(getComputedStyle(image).transform).toBe("scaleX(-1)");
  expect(getComputedStyle(image).objectPosition).toBe("67% 61%");
});

it("uses director names from the featured response without a second read", async () => {
  let reads = 0;
  server.use(
    http.get(`${apiBaseUrl}/movies/featured`, () => {
      reads++;
      return HttpResponse.json({
        ...film,
        tmdb_id: 917347,
        directors: ["First Director", "Second Director"],
      });
    }),
  );
  render(<HomeHero />);
  expect(
    await screen.findByText("First Director, Second Director 1962"),
  ).toBeInTheDocument();
  expect(reads).toBe(1);
});
