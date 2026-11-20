import userEvent from "@testing-library/user-event";
import { renderWithRoutes } from "@tests/helpers/test-renderer-with-routes";
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
    "Track your films",
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
      "Keep a watchlist, and mark films watched, rate and like them from any poster.",
    ),
  ).toBeInTheDocument();
  expect(
    screen.getByText(
      "The story, cast, crew, score and runtime of any film, on one page.",
    ),
  ).toBeInTheDocument();
});

it("explains what sign-in shares and opens the privacy policy", async () => {
  const user = userEvent.setup();
  renderWithRoutes([
    { path: "/", element: <HomeBand /> },
    { path: "/privacy", element: <h1>CineXplorer Privacy Policy</h1> },
  ]);

  expect(screen.getByText(/^An account keeps your lists\./)).toHaveTextContent(
    "An account keeps your lists. If you sign in with Google or GitHub, CineXplorer receives your name, email address and basic profile, and uses them only for your account, never for advertising. Privacy Policy",
  );
  const privacyLink = screen.getByRole("link", { name: "Privacy Policy" });
  expect(privacyLink).toHaveAttribute("href", "/privacy");
  await user.click(privacyLink);
  expect(
    screen.getByRole("heading", { name: "CineXplorer Privacy Policy" }),
  ).toBeVisible();
});
