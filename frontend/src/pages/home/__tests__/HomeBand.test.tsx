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
  for (const title of ["See what's on", "Keep a watchlist", "Search any film"])
    expect(
      screen.getByRole("heading", { level: 3, name: title }),
    ).toBeInTheDocument();
  expect(
    screen.getByText(
      "What's in theaters and coming soon, ordered and named for what it is.",
    ),
  ).toBeInTheDocument();
  expect(
    screen.getByText(
      "Save films to see next from any poster, and find them on Home.",
    ),
  ).toBeInTheDocument();
  expect(
    screen.getByText("Find any film by its title, from the search in the bar."),
  ).toBeInTheDocument();
});
