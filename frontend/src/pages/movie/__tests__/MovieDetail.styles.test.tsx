import { beforeEach, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import {
  renderWithRoute,
  screen,
} from "@tests/helpers/test-renderer-with-routes";
import { styleSystem, expectResolvedColor } from "@tests/helpers/theme-styles";
import { server } from "@tests/mocks/server";
import { createMockMovieDetail } from "@tests/mocks/movieData";
import { apiBaseUrl } from "@/config/baseUrls";
import MovieDetail from "@/pages/movie/MovieDetail";

beforeEach(() => {
  server.use(
    http.get(`${apiBaseUrl}/movies/550`, () =>
      HttpResponse.json(
        createMockMovieDetail({
          tmdb_id: 550,
          title: "A themed movie",
          genres: [{ id: 28, name: "Action" }],
          production_companies: [
            {
              id: 1,
              name: "Example Studio",
              logo_path: null,
              origin_country: "US",
            },
          ],
        }),
      ),
    ),
  );
});

async function renderDetail() {
  renderWithRoute("/movie/:id", <MovieDetail />, {
    initialRoute: "/movie/550",
    system: styleSystem,
  });
  await screen.findByRole("heading", { name: "A themed movie" });
}

it("draws all four dividers in the theme's subtle border", async () => {
  await renderDetail();
  const dividers = screen.getAllByRole("separator");
  expect(dividers).toHaveLength(4);
  for (const divider of dividers) {
    expectResolvedColor(
      divider,
      "border-color",
      "var(--chakra-colors-border-subtle-01)",
    );
  }
});

it("draws genre and company tags without a palette inset ring", async () => {
  await renderDetail();
  for (const name of ["Action", "Example Studio"]) {
    // The tag label's enclosing root owns the recipe's box shadow.
    const tag = screen.getByText(name).parentElement;
    if (!tag) throw new Error("Tag label must have a root");
    expect(getComputedStyle(tag).boxShadow).toBe("none");
  }
});
