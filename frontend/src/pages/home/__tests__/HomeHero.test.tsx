import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { waitFor } from "@tests/helpers/test-renderer";
import { featuredFilmQuery } from "@/lib/queries";
import { it, expect } from "vitest";
import { render, screen, fireEvent, act } from "@tests/helpers/test-renderer";
import { renderWithRoutes } from "@tests/helpers/test-renderer-with-routes";
import { Link } from "react-router";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { server } from "@tests/mocks/server";
import { gate } from "@tests/helpers/web-locks";
import { apiBaseUrl } from "@/config/baseUrls";
import { HomeHero } from "@/pages/home/HomeHero";
import {
  Toaster,
  toaster,
  priorityToaster,
} from "@/components/core/chakra/toaster";
import { signInPathFor } from "@/utilities/returnPath";

const headline = "Track the films you watch. Find the next one.";
const film = {
  tmdb_id: 947,
  title: "Lawrence of Arabia",
  release_date: "1962-12-11",
  backdrop_path: "/still.jpg",
  tagline: "An epic.",
};
it("shows the pitch and actions before the film read settles, then its credit and decorative still", async () => {
  const pending = gate();
  server.use(
    http.get(`${apiBaseUrl}/movies/featured`, async () => {
      await pending.wait;
      return HttpResponse.json(film);
    }),
  );
  render(<HomeHero />);
  expect(
    screen.getByRole("heading", { level: 1, name: headline }),
  ).toBeInTheDocument();
  expect(
    screen.getByText(
      "Browse what's in theaters and coming soon, keep a watchlist, and search any film. Film data from TMDB.",
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
    await screen.findByRole("link", { name: /Lawrence of Arabia \(1962\)/ }),
  ).toHaveAttribute("href", "/movie/947?from=home");
  expect(screen.getByText("An epic.")).toBeInTheDocument();
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
  await screen.findByText("Lawrence of Arabia (1962)");
  const user = userEvent.setup();
  await user.click(screen.getByRole("link", { name: "Leave Home" }));
  await user.click(screen.getByRole("link", { name: "Return Home" }));
  expect(
    await screen.findByText("Lawrence of Arabia (1962)"),
  ).toBeInTheDocument();
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
