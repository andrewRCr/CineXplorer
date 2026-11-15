import { it, expect } from "vitest";
import { render, screen } from "@tests/helpers/test-renderer";
import { LargeFilmCard } from "@/components/movie/sections/LargeFilmCard";
import { createMockMovieListItem } from "@tests/mocks/movieData";

it.each(["/poster.jpg", null])(
  "shows one film with its details and no actions (poster: %s)",
  (poster) => {
    render(
      <LargeFilmCard
        film={createMockMovieListItem({
          tmdb_id: 947,
          title: "Lawrence of Arabia",
          release_date: "1962-12-11",
          poster_path: poster,
          runtime: 222,
          genre_ids: [18, 12],
          overview: "An officer crosses the desert.",
        })}
      />,
    );
    expect(
      screen.getByRole("img", { name: "Lawrence of Arabia" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Lawrence of Arabia/ }),
    ).toHaveAttribute("href", "/movie/947?from=home");
    expect(screen.getByText("1962")).toBeInTheDocument();
    expect(screen.getByText("222 min")).toBeInTheDocument();
    expect(screen.getByText("Drama · Adventure")).toBeInTheDocument();
    expect(
      screen.getByText("An officer crosses the desert."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  },
);
it("omits unavailable runtime", () => {
  render(<LargeFilmCard film={createMockMovieListItem({ runtime: null })} />);
  expect(screen.getByRole("link", { name: /Test Movie/ })).toBeInTheDocument();
  expect(screen.queryByText(/min/)).not.toBeInTheDocument();
});
