import { it, expect } from "vitest";
import { render, screen } from "@tests/helpers/test-renderer";
import { HomeBand } from "@/pages/home/HomeBand";
it("explains the three things a visitor can do under a hidden section heading", () => {
  render(<HomeBand />);
  expect(
    screen.getByRole("heading", {
      level: 2,
      name: "What you can do",
      hidden: true,
    }),
  ).toBeInTheDocument();
  for (const title of [
    "Browse every film",
    "Keep a watchlist",
    "Know before you watch",
  ])
    expect(
      screen.getByRole("heading", { level: 3, name: title }),
    ).toBeInTheDocument();
  expect(
    screen.getByText(
      "What's in theaters, what's coming, or the whole catalog by genre, year and rating.",
    ),
  ).toBeInTheDocument();
  expect(
    screen.getByText(
      "Save films from any poster and find them waiting on Home.",
    ),
  ).toBeInTheDocument();
  expect(
    screen.getByText(
      "The story, cast, crew, score and runtime of any film, on one page.",
    ),
  ).toBeInTheDocument();
});
