import { expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen } from "@tests/helpers/test-renderer";
import { expectResolvedColor } from "@tests/helpers/theme-styles";
import { RatingStars } from "../RatingStars";
import { RewatchIcon } from "../RewatchIcon";
import MovieUserScore from "../MovieUserScore";

const cases = [
  [1, 0.5, 0, 1],
  [2, 1, 1, 0],
  [3, 1.5, 1, 1],
  [4, 2, 2, 0],
  [5, 2.5, 2, 1],
  [6, 3, 3, 0],
  [7, 3.5, 3, 1],
  [8, 4, 4, 0],
  [9, 4.5, 4, 1],
  [10, 5, 5, 0],
] as const;
it.each(["sm", "lg"] as const)(
  "shows earned gold whole and half stars as one named image at %s size",
  async (size) => {
    const user = userEvent.setup();
    for (const [rating, stars, whole, half] of cases) {
      const view = render(
        <>
          <RatingStars rating={rating} size={size} />
          <button>Next</button>
        </>,
      );
      const image = screen.getByRole("img", {
        name: `Rated ${stars} out of 5 stars`,
      });
      expect(screen.getAllByRole("img")).toHaveLength(1);
      expect(getComputedStyle(image).fontSize).toBe(
        size === "sm" ? "14px" : "20px",
      );
      expectResolvedColor(image, "color", "var(--chakra-colors-imdb-gold)");
      // Inspect decorative SVG ink: full stars have a right-hand point, half stars stop at the centre.
      // eslint-disable-next-line testing-library/no-node-access
      const paths = [...image.querySelectorAll("svg path")];
      expect(paths).toHaveLength(whole + half);
      expect(
        paths.filter((path) => path.getAttribute("d")?.includes("V0z")),
      ).toHaveLength(half);
      // eslint-disable-next-line testing-library/no-node-access
      for (const icon of image.querySelectorAll("svg")) {
        expect(icon).toHaveAttribute("aria-hidden", "true");
        expect(icon).toHaveAttribute("focusable", "false");
      }
      await user.tab();
      expect(screen.getByRole("button", { name: "Next" })).toHaveFocus();
      view.unmount();
    }
  },
);

it.each([null, undefined])(
  "renders nothing without a rating (%s)",
  (rating) => {
    render(<RatingStars rating={rating} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  },
);
it("names the rewatch icon and takes no keyboard focus", async () => {
  render(
    <>
      <RewatchIcon />
      <button>Next</button>
    </>,
  );
  expect(screen.getByRole("img", { name: "Rewatch" })).toBeVisible();
  await userEvent.setup().tab();
  expect(screen.getByRole("button", { name: "Next" })).toHaveFocus();
});
it("keeps MovieUserScore for TMDB scores", () => {
  // @ts-expect-error A user's rating belongs to RatingStars.
  render(<MovieUserScore score={8} voteCount={10} userRating={7} />);
  expect(screen.queryByTitle("Your Rating")).not.toBeInTheDocument();
});
