import { expect, it } from "vitest";
import { http, HttpResponse } from "msw/http";
import {
  renderWithRoute,
  screen,
} from "@tests/helpers/test-renderer-with-routes";
import { createMockMovieDetail } from "@tests/mocks/movieData";
import { server } from "@tests/mocks/server";
import { gate } from "@tests/helpers/web-locks";
import { apiBaseUrl } from "@/config/baseUrls";
import MovieDetail from "../MovieDetail";

const url = `${apiBaseUrl}/movies/550`;
const movie = createMockMovieDetail({ tmdb_id: 550, title: "Fight Club" });
function renderDetail() {
  renderWithRoute("/movie/:id", <MovieDetail />, {
    initialRoute: "/movie/550",
  });
}

it.each([
  [200, "Fight Club"],
  [404, "Movie Not Found"],
  [503, "Error Loading Movie"],
] as const)("shows one page heading after HTTP %s", async (status, title) => {
  server.use(
    http.get(url, () =>
      HttpResponse.json(status === 200 ? movie : { detail: "Unavailable" }, {
        status,
      }),
    ),
  );
  renderDetail();
  expect(
    await screen.findByRole("heading", { name: title, level: 1 }),
  ).toBeVisible();
  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
});

it("shows no heading while the film loads", async () => {
  const held = gate();
  server.use(
    http.get(url, async () => {
      await held.wait;
      return HttpResponse.json(movie);
    }),
  );
  renderDetail();
  expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
  held.release();
  expect(
    await screen.findByRole("heading", { name: "Fight Club" }),
  ).toBeVisible();
});
